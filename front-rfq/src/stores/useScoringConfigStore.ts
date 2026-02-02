/**
 * Scoring Configuration Store
 *
 * Manages dynamic scoring categories and criteria per project.
 * This store handles the configuration of custom scoring systems
 * where each project can define its own categories, criteria, and weights.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useToastStore } from './useToastStore';
import type {
  ScoringCategory,
  ScoringCriterion,
  CategoryDraft,
  CriterionDraft,
  ScoringValidationResult,
} from '../types/scoring.types';
// Re-export utility functions
export {
  buildDefaultConfiguration,
  validateScoringConfiguration,
  generateSlugFromName,
  calculateTotalCategoryWeight,
  calculateTotalCriteriaWeight,
  CATEGORY_COLORS,
  DEFAULT_CATEGORIES,
  DEFAULT_CRITERIA,
} from '../types/scoring.types';

// Import for internal use (after re-exports to avoid circular dependency issues)
import {
  buildDefaultConfiguration as buildDefaults,
  validateScoringConfiguration as validateConfig,
} from '../types/scoring.types';

// ============================================
// STORE INTERFACE
// ============================================

interface ScoringConfigState {
  // Data from database
  categories: ScoringCategory[];
  criteria: ScoringCriterion[];
  hasConfiguration: boolean;
  isLoading: boolean;
  error: string | null;

  // Editing state
  isEditing: boolean;
  draftCategories: CategoryDraft[];
  hasUnsavedChanges: boolean;

  // UI state
  showWizard: boolean;
  wizardStep: number;

  // Actions - Data Loading
  loadConfiguration: (projectId: string) => Promise<void>;
  clearConfiguration: () => void;

  // Actions - Configuration Management
  initializeDefaultConfig: (projectId: string) => Promise<void>;
  saveConfiguration: (projectId: string) => Promise<boolean>;
  deleteConfiguration: (projectId: string) => Promise<void>;

  // Actions - Editing
  startEditing: () => void;
  cancelEditing: () => void;
  setDraftCategories: (categories: CategoryDraft[]) => void;

  // Actions - Category CRUD
  addCategory: (category: Omit<CategoryDraft, 'criteria'>) => void;
  updateCategory: (index: number, updates: Partial<CategoryDraft>) => void;
  deleteCategory: (index: number) => void;
  reorderCategories: (fromIndex: number, toIndex: number) => void;

  // Actions - Criterion CRUD
  addCriterion: (categoryIndex: number, criterion: CriterionDraft) => void;
  updateCriterion: (categoryIndex: number, criterionIndex: number, updates: Partial<CriterionDraft>) => void;
  deleteCriterion: (categoryIndex: number, criterionIndex: number) => void;
  reorderCriteria: (categoryIndex: number, fromIndex: number, toIndex: number) => void;

  // Actions - Validation
  validateWeights: () => ScoringValidationResult;

  // Actions - UI
  setShowWizard: (show: boolean) => void;
  setWizardStep: (step: number) => void;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useScoringConfigStore = create<ScoringConfigState>()(
  devtools((set, get) => ({
      // Initial state
      categories: [],
      criteria: [],
      hasConfiguration: false,
      isLoading: false,
      error: null,
      isEditing: false,
      draftCategories: [],
      hasUnsavedChanges: false,
      showWizard: false,
      wizardStep: 1,

      // ============================================
      // DATA LOADING
      // ============================================

      loadConfiguration: async (projectId: string) => {
        if (!supabase) {
          console.error('[ScoringConfig] Supabase not configured');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Fetch categories for this project
          // Note: Using 'as any' because these tables may not be in the generated types yet
          const { data: categoriesData, error: catError } = await (supabase as any)
            .from('scoring_categories')
            .select('*')
            .eq('project_id', projectId)
            .order('sort_order', { ascending: true });

          // Handle error gracefully - if table doesn't exist (404) or other errors,
          // treat as no configuration rather than crashing
          if (catError) {
            // Check if it's a "table doesn't exist" error (code 42P01 or HTTP 404)
            const isTableNotFound = catError.code === '42P01' ||
                                   catError.code === 'PGRST116' ||
                                   catError.message?.includes('does not exist') ||
                                   catError.message?.includes('404');

            if (isTableNotFound) {
              console.log('[ScoringConfig] Scoring tables not yet created, using fallback mode');
              set({
                categories: [],
                criteria: [],
                hasConfiguration: false,
                isLoading: false,
                error: null,
              });
              return;
            }
            throw catError;
          }

          // If no categories, project has no configuration
          if (!categoriesData || categoriesData.length === 0) {
            set({
              categories: [],
              criteria: [],
              hasConfiguration: false,
              isLoading: false,
            });
            console.log('[ScoringConfig] No configuration found for project:', projectId);
            return;
          }

          // Fetch criteria for this project
          const { data: criteriaData, error: critError } = await (supabase as any)
            .from('scoring_criteria')
            .select('*')
            .eq('project_id', projectId)
            .order('sort_order', { ascending: true });

          // Handle criteria table not existing gracefully
          if (critError) {
            const isTableNotFound = critError.code === '42P01' ||
                                   critError.code === 'PGRST116' ||
                                   critError.message?.includes('does not exist') ||
                                   critError.message?.includes('404');

            if (isTableNotFound) {
              console.log('[ScoringConfig] Criteria table not yet created, using fallback mode');
              set({
                categories: [],
                criteria: [],
                hasConfiguration: false,
                isLoading: false,
                error: null,
              });
              return;
            }
            throw critError;
          }

          // Map criteria to categories
          const categoriesWithCriteria: ScoringCategory[] = categoriesData.map((cat: any) => ({
            ...cat,
            criteria: (criteriaData || []).filter((crit: any) => crit.category_id === cat.id),
          }));

          set({
            categories: categoriesWithCriteria,
            criteria: criteriaData || [],
            hasConfiguration: true,
            isLoading: false,
          });

          console.log('[ScoringConfig] Loaded configuration:', {
            categories: categoriesWithCriteria.length,
            criteria: (criteriaData || []).length,
          });

        } catch (err: any) {
          console.error('[ScoringConfig] Error loading configuration:', err);
          // Reset to safe state - no configuration, no crash
          set({
            categories: [],
            criteria: [],
            hasConfiguration: false,
            error: err.message || 'Error loading scoring configuration',
            isLoading: false,
          });
        }
      },

      clearConfiguration: () => {
        set({
          categories: [],
          criteria: [],
          hasConfiguration: false,
          isEditing: false,
          draftCategories: [],
          hasUnsavedChanges: false,
        });
      },

      // ============================================
      // CONFIGURATION MANAGEMENT
      // ============================================

      initializeDefaultConfig: async (projectId: string) => {
        if (!supabase) {
          useToastStore.getState().addToast('Supabase not configured', 'error');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Call the database function to clone default criteria
          // Note: Using 'as any' because this RPC function may not be in the generated types yet
          const { error } = await (supabase as any).rpc('clone_default_criteria_to_project', {
            p_project_id: projectId,
          });

          if (error) throw error;

          useToastStore.getState().addToast('Default scoring configuration initialized', 'success');

          // Reload the configuration
          await get().loadConfiguration(projectId);

        } catch (err: any) {
          console.error('[ScoringConfig] Error initializing default config:', err);
          set({
            error: err.message || 'Error initializing default configuration',
            isLoading: false,
          });
          useToastStore.getState().addToast(`Error: ${err.message}`, 'error');
        }
      },

      saveConfiguration: async (projectId: string) => {
        if (!supabase) {
          useToastStore.getState().addToast('Supabase not configured', 'error');
          return false;
        }

        const { draftCategories } = get();

        // Validate before saving
        const validation = get().validateWeights();
        if (!validation.valid) {
          useToastStore.getState().addToast(
            validation.errors[0]?.message || 'Validation failed',
            'error'
          );
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          // Delete existing configuration for this project
          // Note: Using 'as any' because these tables may not be in the generated types yet
          await (supabase as any)
            .from('scoring_criteria')
            .delete()
            .eq('project_id', projectId);

          await (supabase as any)
            .from('scoring_categories')
            .delete()
            .eq('project_id', projectId);

          // Insert new categories
          for (let catIndex = 0; catIndex < draftCategories.length; catIndex++) {
            const category = draftCategories[catIndex];

            const { data: insertedCategory, error: catInsertError } = await (supabase as any)
              .from('scoring_categories')
              .insert({
                project_id: projectId,
                name: category.name,
                display_name: category.display_name,
                display_name_es: category.display_name_es,
                weight: category.weight,
                color: category.color,
                sort_order: catIndex + 1,
              })
              .select('id')
              .single();

            if (catInsertError) throw catInsertError;

            // Insert criteria for this category
            if (category.criteria && category.criteria.length > 0) {
              const criteriaToInsert = category.criteria.map((crit, critIndex) => ({
                category_id: insertedCategory.id,
                project_id: projectId,
                name: crit.name,
                display_name: crit.display_name,
                display_name_es: crit.display_name_es,
                description: crit.description,
                weight: crit.weight,
                keywords: crit.keywords,
                sort_order: critIndex + 1,
              }));

              const { error: critInsertError } = await (supabase as any)
                .from('scoring_criteria')
                .insert(criteriaToInsert);

              if (critInsertError) throw critInsertError;
            }
          }

          useToastStore.getState().addToast('Scoring configuration saved', 'success');

          // Reload the configuration
          await get().loadConfiguration(projectId);

          set({
            isEditing: false,
            hasUnsavedChanges: false,
            showWizard: false,
          });

          return true;

        } catch (err: any) {
          console.error('[ScoringConfig] Error saving configuration:', err);
          set({
            error: err.message || 'Error saving configuration',
            isLoading: false,
          });
          useToastStore.getState().addToast(`Error: ${err.message}`, 'error');
          return false;
        }
      },

      deleteConfiguration: async (projectId: string) => {
        if (!supabase) {
          useToastStore.getState().addToast('Supabase not configured', 'error');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Delete criteria first (due to foreign key)
          await (supabase as any)
            .from('scoring_criteria')
            .delete()
            .eq('project_id', projectId);

          // Delete categories
          await (supabase as any)
            .from('scoring_categories')
            .delete()
            .eq('project_id', projectId);

          useToastStore.getState().addToast('Scoring configuration deleted', 'success');

          get().clearConfiguration();
          set({ isLoading: false });

        } catch (err: any) {
          console.error('[ScoringConfig] Error deleting configuration:', err);
          set({
            error: err.message || 'Error deleting configuration',
            isLoading: false,
          });
          useToastStore.getState().addToast(`Error: ${err.message}`, 'error');
        }
      },

      // ============================================
      // EDITING
      // ============================================

      startEditing: () => {
        const { categories } = get();

        // Convert current configuration to draft format
        const drafts: CategoryDraft[] = categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          display_name: cat.display_name,
          display_name_es: cat.display_name_es,
          weight: cat.weight,
          color: cat.color,
          sort_order: cat.sort_order,
          criteria: (cat.criteria || []).map((crit) => ({
            id: crit.id,
            category_id: crit.category_id,
            name: crit.name,
            display_name: crit.display_name,
            display_name_es: crit.display_name_es,
            description: crit.description,
            weight: crit.weight,
            keywords: crit.keywords,
            sort_order: crit.sort_order,
          })),
        }));

        set({
          isEditing: true,
          draftCategories: drafts,
          hasUnsavedChanges: false,
        });
      },

      cancelEditing: () => {
        set({
          isEditing: false,
          draftCategories: [],
          hasUnsavedChanges: false,
        });
      },

      setDraftCategories: (categories: CategoryDraft[]) => {
        set({
          draftCategories: categories,
          hasUnsavedChanges: true,
        });
      },

      // ============================================
      // CATEGORY CRUD
      // ============================================

      addCategory: (category: Omit<CategoryDraft, 'criteria'>) => {
        const { draftCategories } = get();

        const newCategory: CategoryDraft = {
          ...category,
          sort_order: draftCategories.length + 1,
          criteria: [],
        };

        set({
          draftCategories: [...draftCategories, newCategory],
          hasUnsavedChanges: true,
        });
      },

      updateCategory: (index: number, updates: Partial<CategoryDraft>) => {
        const { draftCategories } = get();

        const updated = [...draftCategories];
        updated[index] = { ...updated[index], ...updates };

        set({
          draftCategories: updated,
          hasUnsavedChanges: true,
        });
      },

      deleteCategory: (index: number) => {
        const { draftCategories } = get();

        const updated = draftCategories.filter((_, i) => i !== index);

        // Update sort_order for remaining categories
        updated.forEach((cat, i) => {
          cat.sort_order = i + 1;
        });

        set({
          draftCategories: updated,
          hasUnsavedChanges: true,
        });
      },

      reorderCategories: (fromIndex: number, toIndex: number) => {
        const { draftCategories } = get();

        const updated = [...draftCategories];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);

        // Update sort_order
        updated.forEach((cat, i) => {
          cat.sort_order = i + 1;
        });

        set({
          draftCategories: updated,
          hasUnsavedChanges: true,
        });
      },

      // ============================================
      // CRITERION CRUD
      // ============================================

      addCriterion: (categoryIndex: number, criterion: CriterionDraft) => {
        const { draftCategories } = get();

        const updated = [...draftCategories];
        const category = updated[categoryIndex];

        criterion.sort_order = (category.criteria?.length || 0) + 1;
        category.criteria = [...(category.criteria || []), criterion];

        set({
          draftCategories: updated,
          hasUnsavedChanges: true,
        });
      },

      updateCriterion: (categoryIndex: number, criterionIndex: number, updates: Partial<CriterionDraft>) => {
        const { draftCategories } = get();

        const updated = [...draftCategories];
        const criteria = updated[categoryIndex].criteria || [];
        criteria[criterionIndex] = { ...criteria[criterionIndex], ...updates };
        updated[categoryIndex].criteria = criteria;

        set({
          draftCategories: updated,
          hasUnsavedChanges: true,
        });
      },

      deleteCriterion: (categoryIndex: number, criterionIndex: number) => {
        const { draftCategories } = get();

        const updated = [...draftCategories];
        const criteria = (updated[categoryIndex].criteria || []).filter((_, i) => i !== criterionIndex);

        // Update sort_order
        criteria.forEach((crit, i) => {
          crit.sort_order = i + 1;
        });

        updated[categoryIndex].criteria = criteria;

        set({
          draftCategories: updated,
          hasUnsavedChanges: true,
        });
      },

      reorderCriteria: (categoryIndex: number, fromIndex: number, toIndex: number) => {
        const { draftCategories } = get();

        const updated = [...draftCategories];
        const criteria = [...(updated[categoryIndex].criteria || [])];
        const [moved] = criteria.splice(fromIndex, 1);
        criteria.splice(toIndex, 0, moved);

        // Update sort_order
        criteria.forEach((crit, i) => {
          crit.sort_order = i + 1;
        });

        updated[categoryIndex].criteria = criteria;

        set({
          draftCategories: updated,
          hasUnsavedChanges: true,
        });
      },

      // ============================================
      // VALIDATION
      // ============================================

      validateWeights: () => {
        const { draftCategories } = get();
        return validateConfig(draftCategories);
      },

      // ============================================
      // UI
      // ============================================

      setShowWizard: (show: boolean) => {
        set({ showWizard: show });

        // If opening wizard with no drafts, initialize with defaults
        if (show && get().draftCategories.length === 0) {
          set({ draftCategories: buildDefaults() });
        }
      },

      setWizardStep: (step: number) => {
        set({ wizardStep: step });
      },
    }),
    { name: 'ScoringConfigStore' }
  )
);

// ============================================
// SELECTORS
// ============================================

/**
 * Get categories with their criteria for display
 */
export const selectCategoriesWithCriteria = (state: ScoringConfigState) => state.categories;

/**
 * Get all criteria flat list
 */
export const selectAllCriteria = (state: ScoringConfigState) => state.criteria;

/**
 * Get total weight of all categories
 */
export const selectTotalCategoryWeight = (state: ScoringConfigState) =>
  state.categories.reduce((sum, cat) => sum + cat.weight, 0);

/**
 * Get draft total weight
 */
export const selectDraftTotalWeight = (state: ScoringConfigState) =>
  state.draftCategories.reduce((sum, cat) => sum + cat.weight, 0);

/**
 * Check if weights are valid
 */
export const selectAreWeightsValid = (state: ScoringConfigState) => {
  const totalWeight = state.isEditing
    ? state.draftCategories.reduce((sum, cat) => sum + cat.weight, 0)
    : state.categories.reduce((sum, cat) => sum + cat.weight, 0);

  return Math.abs(totalWeight - 100) < 0.01;
};
