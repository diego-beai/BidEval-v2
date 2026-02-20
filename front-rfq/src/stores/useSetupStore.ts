/**
 * Setup Wizard Store
 *
 * Manages transient state for the expanded 7-step project setup wizard.
 * Covers milestones, document types, economic fields, Excel templates,
 * reusable templates, and validation.
 *
 * No persist middleware -- wizard data is discarded when the user
 * navigates away or completes setup.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type {
  MilestoneEntry,
  DocumentTypeEntry,
  EconomicFieldEntry,
  ExcelTemplateData,
  SetupTemplate,
  SetupTemplateData,
  SetupValidation,
  ValidationItem,
} from '../types/setup.types';
import { DEFAULT_MILESTONES, DOCUMENT_TYPE_PRESETS } from '../types/setup.types';
import type { ProjectSetupData } from '../components/setup/ProjectSetupWizard';

// ============================================
// STORE INTERFACE
// ============================================

interface SetupState {
  // Data
  milestones: MilestoneEntry[];
  documentTypes: DocumentTypeEntry[];
  economicFields: EconomicFieldEntry[];
  excelTemplate: ExcelTemplateData | null;
  templates: SetupTemplate[];

  // Loading
  isLoading: boolean;
  error: string | null;

  // Milestones
  setMilestones: (milestones: MilestoneEntry[]) => void;
  addMilestone: (milestone: MilestoneEntry) => void;
  updateMilestone: (id: string, updates: Partial<MilestoneEntry>) => void;
  deleteMilestone: (id: string) => void;
  reorderMilestones: (ids: string[]) => void;

  // Document Types
  setDocumentTypes: (types: DocumentTypeEntry[]) => void;
  addDocumentType: (docType: DocumentTypeEntry) => void;
  updateDocumentType: (id: string, updates: Partial<DocumentTypeEntry>) => void;
  deleteDocumentType: (id: string) => void;
  loadDocumentPresets: () => void;

  // Economic Fields
  setEconomicFields: (fields: EconomicFieldEntry[]) => void;
  addEconomicField: (field: EconomicFieldEntry) => void;
  updateEconomicField: (id: string, updates: Partial<EconomicFieldEntry>) => void;
  deleteEconomicField: (id: string) => void;

  // Excel Template
  setExcelTemplate: (data: ExcelTemplateData) => void;
  clearExcelTemplate: () => void;

  // Validation
  validateSetup: (formData: ProjectSetupData, scoringCategories: unknown[]) => SetupValidation;

  // Reset
  resetSetup: () => void;

  // Templates
  loadTemplate: (template: SetupTemplate) => void;
  saveAsTemplate: (
    name: string,
    description: string,
    projectType: 'RFP' | 'RFQ' | 'RFI',
    formData: ProjectSetupData,
  ) => Promise<void>;
  loadTemplates: () => Promise<void>;

  // Persist to Supabase
  saveToProject: (projectId: string) => Promise<void>;
}

// ============================================
// HELPERS
// ============================================

/**
 * Create the default milestones array with generated IDs.
 */
function createDefaultMilestones(): MilestoneEntry[] {
  return DEFAULT_MILESTONES.map((m) => ({
    ...m,
    id: crypto.randomUUID(),
  }));
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useSetupStore = create<SetupState>()(
  devtools(
    (set, get) => ({
      // Initial state
      milestones: createDefaultMilestones(),
      documentTypes: [],
      economicFields: [],
      excelTemplate: null,
      templates: [],
      isLoading: false,
      error: null,

      // ============================================
      // MILESTONES
      // ============================================

      setMilestones: (milestones: MilestoneEntry[]) => {
        set({ milestones });
      },

      addMilestone: (milestone: MilestoneEntry) => {
        const { milestones } = get();
        set({ milestones: [...milestones, milestone] });
      },

      updateMilestone: (id: string, updates: Partial<MilestoneEntry>) => {
        const { milestones } = get();
        set({
          milestones: milestones.map((m) =>
            m.id === id ? { ...m, ...updates } : m,
          ),
        });
      },

      deleteMilestone: (id: string) => {
        const { milestones } = get();
        const filtered = milestones.filter((m) => m.id !== id);
        // Re-index sortOrder
        filtered.forEach((m, i) => {
          m.sortOrder = i;
        });
        set({ milestones: filtered });
      },

      reorderMilestones: (ids: string[]) => {
        const { milestones } = get();
        const lookup = new Map(milestones.map((m) => [m.id, m]));
        const reordered: MilestoneEntry[] = [];

        ids.forEach((id, index) => {
          const entry = lookup.get(id);
          if (entry) {
            reordered.push({ ...entry, sortOrder: index });
          }
        });

        set({ milestones: reordered });
      },

      // ============================================
      // DOCUMENT TYPES
      // ============================================

      setDocumentTypes: (types: DocumentTypeEntry[]) => {
        set({ documentTypes: types });
      },

      addDocumentType: (docType: DocumentTypeEntry) => {
        const { documentTypes } = get();
        set({ documentTypes: [...documentTypes, docType] });
      },

      updateDocumentType: (id: string, updates: Partial<DocumentTypeEntry>) => {
        const { documentTypes } = get();
        set({
          documentTypes: documentTypes.map((d) =>
            d.id === id ? { ...d, ...updates } : d,
          ),
        });
      },

      deleteDocumentType: (id: string) => {
        const { documentTypes } = get();
        const filtered = documentTypes.filter((d) => d.id !== id);
        filtered.forEach((d, i) => {
          d.sortOrder = i;
        });
        set({ documentTypes: filtered });
      },

      loadDocumentPresets: () => {
        const presets: DocumentTypeEntry[] = DOCUMENT_TYPE_PRESETS.map(
          (preset, index) => ({
            ...preset,
            id: crypto.randomUUID(),
            sortOrder: index,
          }),
        );
        set({ documentTypes: presets });
      },

      // ============================================
      // ECONOMIC FIELDS
      // ============================================

      setEconomicFields: (fields: EconomicFieldEntry[]) => {
        set({ economicFields: fields });
      },

      addEconomicField: (field: EconomicFieldEntry) => {
        const { economicFields } = get();
        set({ economicFields: [...economicFields, field] });
      },

      updateEconomicField: (id: string, updates: Partial<EconomicFieldEntry>) => {
        const { economicFields } = get();
        set({
          economicFields: economicFields.map((f) =>
            f.id === id ? { ...f, ...updates } : f,
          ),
        });
      },

      deleteEconomicField: (id: string) => {
        const { economicFields } = get();
        // Remove the field and any children that reference it
        const filtered = economicFields.filter(
          (f) => f.id !== id && f.parentId !== id,
        );
        filtered.forEach((f, i) => {
          f.sortOrder = i;
        });
        set({ economicFields: filtered });
      },

      // ============================================
      // EXCEL TEMPLATE
      // ============================================

      setExcelTemplate: (data: ExcelTemplateData) => {
        set({ excelTemplate: data });
      },

      clearExcelTemplate: () => {
        set({ excelTemplate: null });
      },

      // ============================================
      // VALIDATION
      // ============================================

      validateSetup: (
        formData: ProjectSetupData,
        scoringCategories: unknown[],
      ): SetupValidation => {
        const { milestones, documentTypes } = get();
        const errors: ValidationItem[] = [];
        const warnings: ValidationItem[] = [];

        // Step 1: Project name must be at least 3 characters
        if (formData.name.trim().length < 3) {
          errors.push({
            step: 1,
            field: 'name',
            message: 'El nombre del proyecto debe tener al menos 3 caracteres',
            severity: 'error',
          });
        }

        // Step 2: At least one milestone
        if (milestones.length === 0) {
          warnings.push({
            step: 2,
            field: 'milestones',
            message: 'No se han definido hitos. Se recomienda al menos uno',
            severity: 'warning',
          });
        }

        // Step 4: At least one document type
        if (documentTypes.length === 0) {
          warnings.push({
            step: 4,
            field: 'documentTypes',
            message: 'No se han definido tipos de documento. Se recomienda al menos uno',
            severity: 'warning',
          });
        }

        // Step 6: Scoring weights sum to 100%
        if (Array.isArray(scoringCategories) && scoringCategories.length > 0) {
          const totalWeight = scoringCategories.reduce((sum: number, cat: any) => {
            return sum + (typeof cat.weight === 'number' ? cat.weight : 0);
          }, 0);

          if (Math.abs(totalWeight - 100) > 0.01) {
            errors.push({
              step: 6,
              field: 'scoringWeights',
              message: `Los pesos de las categorias suman ${totalWeight.toFixed(1)}%, deben sumar 100%`,
              severity: 'error',
            });
          }

          // Check sub-criteria weights within each category
          scoringCategories.forEach((cat: any) => {
            if (Array.isArray(cat.criteria) && cat.criteria.length > 0) {
              const criteriaTotal = cat.criteria.reduce(
                (s: number, c: any) =>
                  s + (typeof c.weight === 'number' ? c.weight : 0),
                0,
              );

              if (Math.abs(criteriaTotal - 100) > 0.01) {
                warnings.push({
                  step: 6,
                  field: `scoringCriteria.${cat.name || cat.display_name}`,
                  message: `Los sub-criterios de "${cat.display_name || cat.name}" suman ${criteriaTotal.toFixed(1)}%, deberian sumar 100%`,
                  severity: 'warning',
                });
              }
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },

      // ============================================
      // RESET
      // ============================================

      resetSetup: () => {
        set({
          milestones: createDefaultMilestones(),
          documentTypes: [],
          economicFields: [],
          excelTemplate: null,
          isLoading: false,
          error: null,
        });
      },

      // ============================================
      // TEMPLATES
      // ============================================

      loadTemplate: (template: SetupTemplate) => {
        const { templateData } = template;

        // Re-generate IDs so each use is unique
        const milestones: MilestoneEntry[] = templateData.milestones.map(
          (m, i) => ({
            ...m,
            id: crypto.randomUUID(),
            sortOrder: i,
          }),
        );

        const documentTypes: DocumentTypeEntry[] =
          templateData.documentTypes.map((d, i) => ({
            ...d,
            id: crypto.randomUUID(),
            sortOrder: i,
          }));

        const economicFields: EconomicFieldEntry[] =
          templateData.economicFields.map((f, i) => ({
            ...f,
            id: crypto.randomUUID(),
            parentId: null, // parent references are lost on template load
            sortOrder: i,
          }));

        set({ milestones, documentTypes, economicFields });
      },

      saveAsTemplate: async (
        name: string,
        description: string,
        projectType: 'RFP' | 'RFQ' | 'RFI',
        _formData: ProjectSetupData,
      ) => {
        if (!supabase) {
          set({ error: 'Supabase not configured' });
          return;
        }

        const { milestones, documentTypes, economicFields } = get();

        const templateData: SetupTemplateData = {
          milestones,
          documentTypes,
          economicFields,
          scoringCategories: [], // Scoring config is managed by useScoringConfigStore
        };

        set({ isLoading: true, error: null });

        try {
          // Note: Using 'as any' because Supabase generated types
          // may not fully match the Insert overload for this table
          const { error } = await (supabase as any)
            .from('project_setup_templates')
            .insert({
              name,
              description: description || null,
              project_type: projectType,
              template_data: templateData,
            });

          if (error) throw error;

          // Reload templates list
          await get().loadTemplates();
          set({ isLoading: false });
        } catch (err: any) {
          set({
            error: err.message || 'Error saving template',
            isLoading: false,
          });
        }
      },

      loadTemplates: async () => {
        if (!supabase) {
          set({ templates: [], error: null });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const { data, error } = await (supabase as any)
            .from('project_setup_templates')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const templates: SetupTemplate[] = (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description ?? undefined,
            projectType: row.project_type,
            templateData: row.template_data as SetupTemplateData,
            isDefault: row.is_default,
            createdAt: row.created_at,
          }));

          set({ templates, isLoading: false });
        } catch (err: any) {
          set({
            error: err.message || 'Error loading templates',
            isLoading: false,
          });
        }
      },

      // ============================================
      // SAVE TO PROJECT (Supabase upserts)
      // ============================================

      saveToProject: async (projectId: string) => {
        if (!supabase) {
          set({ error: 'Supabase not configured' });
          return;
        }

        const { milestones, documentTypes, economicFields } = get();

        set({ isLoading: true, error: null });

        try {
          // Note: Using 'as any' for Supabase calls because the
          // generated types may not fully match Insert overloads
          const sb = supabase as any;

          // --- Milestones ---
          if (milestones.length > 0) {
            // Delete existing milestones for this project
            await sb
              .from('project_milestones')
              .delete()
              .eq('project_id', projectId);

            const milestoneRows = milestones.map((m) => ({
              project_id: projectId,
              name: m.name,
              description: m.description || null,
              due_date: m.dueDate || null,
              sort_order: m.sortOrder,
              is_mandatory: m.isMandatory,
              milestone_type: m.milestoneType,
            }));

            const { error: mErr } = await sb
              .from('project_milestones')
              .insert(milestoneRows);

            if (mErr) throw mErr;
          }

          // --- Document Types ---
          if (documentTypes.length > 0) {
            await sb
              .from('project_document_types')
              .delete()
              .eq('project_id', projectId);

            const docRows = documentTypes.map((d) => ({
              project_id: projectId,
              name: d.name,
              description: d.description || null,
              doc_category: d.docCategory,
              evaluation_link: d.evaluationLink,
              is_mandatory: d.isMandatory,
              sort_order: d.sortOrder,
            }));

            const { error: dErr } = await sb
              .from('project_document_types')
              .insert(docRows);

            if (dErr) throw dErr;
          }

          // --- Economic Fields ---
          if (economicFields.length > 0) {
            await sb
              .from('project_economic_fields')
              .delete()
              .eq('project_id', projectId);

            // Insert parent fields first (parentId is null), then children
            const parents = economicFields.filter((f) => !f.parentId);
            const children = economicFields.filter((f) => !!f.parentId);

            // Map of old ID -> new DB ID for parent references
            const idMap = new Map<string, string>();

            if (parents.length > 0) {
              const parentRows = parents.map((f) => ({
                project_id: projectId,
                name: f.name,
                description: f.description || null,
                field_type: f.fieldType,
                unit: f.unit || null,
                is_required: f.isRequired,
                sort_order: f.sortOrder,
                formula: f.formula || null,
              }));

              const { data: insertedParents, error: pErr } = await sb
                .from('project_economic_fields')
                .insert(parentRows)
                .select('id');

              if (pErr) throw pErr;

              // Build ID mapping
              if (insertedParents) {
                parents.forEach((p: EconomicFieldEntry, i: number) => {
                  if (insertedParents[i]) {
                    idMap.set(p.id, insertedParents[i].id);
                  }
                });
              }
            }

            if (children.length > 0) {
              const childRows = children.map((f) => ({
                project_id: projectId,
                parent_id: f.parentId ? (idMap.get(f.parentId) ?? null) : null,
                name: f.name,
                description: f.description || null,
                field_type: f.fieldType,
                unit: f.unit || null,
                is_required: f.isRequired,
                sort_order: f.sortOrder,
                formula: f.formula || null,
              }));

              const { error: cErr } = await sb
                .from('project_economic_fields')
                .insert(childRows);

              if (cErr) throw cErr;
            }
          }

          set({ isLoading: false });
        } catch (err: any) {
          set({
            error: err.message || 'Error saving setup to project',
            isLoading: false,
          });
          throw err; // Re-throw so the caller can handle it
        }
      },
    }),
    { name: 'SetupStore' },
  ),
);
