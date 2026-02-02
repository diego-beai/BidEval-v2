/**
 * Dynamic Scoring System Types
 *
 * This file defines the types for the customizable scoring system
 * where each project can define its own categories, criteria, and weights.
 */

// ============================================
// SCORING CATEGORIES
// ============================================

/**
 * A scoring category (e.g., Technical, Economic)
 */
export interface ScoringCategory {
  id: string;
  project_id: string;
  name: string;              // Internal identifier: 'technical', 'economic'
  display_name: string;      // Display name: 'Technical Completeness'
  display_name_es?: string;  // Spanish name: 'Completitud Técnica'
  weight: number;            // Weight as percentage (0-100)
  color: string;             // Hex color for UI: '#12b5b0'
  sort_order: number;        // Display order
  created_at?: string;
  criteria?: ScoringCriterion[]; // Child criteria (populated on fetch)
}

/**
 * Individual scoring criterion within a category
 */
export interface ScoringCriterion {
  id: string;
  category_id: string;
  project_id: string;
  name: string;              // Internal identifier: 'scope_facilities'
  display_name: string;      // Display name: 'Scope of Facilities'
  display_name_es?: string;  // Spanish name: 'Alcance de Instalaciones'
  description?: string;      // Detailed description
  weight: number;            // Weight within category (0-100%)
  keywords?: string[];       // AI mapping keywords: ['facilities', 'plant']
  sort_order: number;        // Display order within category
  created_at?: string;
}

/**
 * Score for a specific criterion and provider
 */
export interface ProviderCriterionScore {
  id: string;
  provider_ranking_id: string;
  criterion_id: string;
  project_id: string;
  provider_name: string;
  score: number;             // 0-10
  created_at?: string;
  updated_at?: string;
}

// ============================================
// CONFIGURATION DRAFTS (for editing)
// ============================================

/**
 * Draft category for editing (before saving to DB)
 */
export interface CategoryDraft {
  id?: string;               // UUID if existing, undefined if new
  name: string;
  display_name: string;
  display_name_es?: string;
  weight: number;
  color: string;
  sort_order: number;
  criteria: CriterionDraft[];
}

/**
 * Draft criterion for editing (before saving to DB)
 */
export interface CriterionDraft {
  id?: string;               // UUID if existing, undefined if new
  category_id?: string;
  name: string;
  display_name: string;
  display_name_es?: string;
  description?: string;
  weight: number;
  keywords?: string[];
  sort_order: number;
}

// ============================================
// SCORING CONFIGURATION
// ============================================

/**
 * Complete scoring configuration for a project
 */
export interface ScoringConfiguration {
  project_id: string;
  categories: ScoringCategory[];
  is_default: boolean;       // Whether using default template
  total_weight: number;      // Sum of category weights (should be 100)
  created_at?: string;
  updated_at?: string;
}

/**
 * Saved weight configuration (for backward compatibility)
 */
export interface ScoringWeightConfig {
  id: string;
  project_id: string;
  name: string;
  weights: Record<string, number>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validation result for scoring configuration
 */
export interface ScoringValidationResult {
  valid: boolean;
  errors: ScoringValidationError[];
  warnings: string[];
}

/**
 * Validation error detail
 */
export interface ScoringValidationError {
  type: 'category' | 'criterion' | 'weight' | 'general';
  field?: string;
  message: string;
  category_id?: string;
  criterion_id?: string;
}

// ============================================
// API RESPONSES
// ============================================

/**
 * Response from fetching scoring configuration
 */
export interface FetchScoringConfigResponse {
  success: boolean;
  data: ScoringConfiguration | null;
  error?: string;
}

/**
 * Response from saving scoring configuration
 */
export interface SaveScoringConfigResponse {
  success: boolean;
  data?: ScoringConfiguration;
  error?: string;
}

// ============================================
// STORE STATE TYPES
// ============================================

/**
 * State for the scoring configuration store
 */
export interface ScoringConfigState {
  // Data
  categories: ScoringCategory[];
  criteria: ScoringCriterion[];
  hasConfiguration: boolean;
  isLoading: boolean;
  error: string | null;

  // Editing state
  isEditing: boolean;
  draftCategories: CategoryDraft[];
  hasUnsavedChanges: boolean;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/**
 * Default category configuration template
 */
export const DEFAULT_CATEGORIES: Omit<CategoryDraft, 'criteria'>[] = [
  {
    name: 'technical',
    display_name: 'Technical Completeness',
    display_name_es: 'Completitud Técnica',
    weight: 30,
    color: '#12b5b0',
    sort_order: 1,
  },
  {
    name: 'economic',
    display_name: 'Economic Competitiveness',
    display_name_es: 'Competitividad Económica',
    weight: 35,
    color: '#f59e0b',
    sort_order: 2,
  },
  {
    name: 'execution',
    display_name: 'Execution Capability',
    display_name_es: 'Capacidad de Ejecución',
    weight: 20,
    color: '#3b82f6',
    sort_order: 3,
  },
  {
    name: 'hse_compliance',
    display_name: 'HSE & Compliance',
    display_name_es: 'HSE y Cumplimiento',
    weight: 15,
    color: '#8b5cf6',
    sort_order: 4,
  },
];

/**
 * Default criteria configuration template
 */
export const DEFAULT_CRITERIA: Record<string, CriterionDraft[]> = {
  technical: [
    {
      name: 'scope_facilities',
      display_name: 'Scope of Facilities',
      display_name_es: 'Alcance de Instalaciones',
      description: 'Evaluation of the facilities and equipment included in the proposal',
      weight: 33.33,
      keywords: ['facilities', 'plant', 'equipment', 'infrastructure'],
      sort_order: 1,
    },
    {
      name: 'scope_work',
      display_name: 'Scope of Work',
      display_name_es: 'Alcance de Trabajo',
      description: 'Evaluation of the work scope coverage and completeness',
      weight: 33.33,
      keywords: ['scope', 'work', 'activities', 'tasks'],
      sort_order: 2,
    },
    {
      name: 'deliverables_quality',
      display_name: 'Deliverables Quality',
      display_name_es: 'Calidad de Entregables',
      description: 'Quality and completeness of proposed deliverables',
      weight: 33.34,
      keywords: ['deliverables', 'documents', 'quality', 'standards'],
      sort_order: 3,
    },
  ],
  economic: [
    {
      name: 'total_price',
      display_name: 'Total Price',
      display_name_es: 'Precio Total',
      description: 'Competitiveness of the total proposed price',
      weight: 42.86,
      keywords: ['price', 'cost', 'total', 'budget'],
      sort_order: 1,
    },
    {
      name: 'price_breakdown',
      display_name: 'Price Breakdown',
      display_name_es: 'Desglose de Precio',
      description: 'Transparency and detail of price breakdown',
      weight: 22.86,
      keywords: ['breakdown', 'detail', 'itemized', 'line items'],
      sort_order: 2,
    },
    {
      name: 'optionals_included',
      display_name: 'Optionals Included',
      display_name_es: 'Opcionales Incluidos',
      description: 'Optional items included in base price',
      weight: 20.00,
      keywords: ['optionals', 'extras', 'additions', 'included'],
      sort_order: 3,
    },
    {
      name: 'capex_opex_methodology',
      display_name: 'CAPEX/OPEX Methodology',
      display_name_es: 'Metodología CAPEX/OPEX',
      description: 'Clarity of CAPEX/OPEX classification methodology',
      weight: 14.28,
      keywords: ['capex', 'opex', 'methodology', 'classification'],
      sort_order: 4,
    },
  ],
  execution: [
    {
      name: 'schedule',
      display_name: 'Schedule',
      display_name_es: 'Cronograma',
      description: 'Realism and achievability of proposed schedule',
      weight: 40.00,
      keywords: ['schedule', 'timeline', 'milestones', 'planning'],
      sort_order: 1,
    },
    {
      name: 'resources_allocation',
      display_name: 'Resources Allocation',
      display_name_es: 'Asignación de Recursos',
      description: 'Adequacy of resources allocated per discipline',
      weight: 30.00,
      keywords: ['resources', 'team', 'staff', 'personnel'],
      sort_order: 2,
    },
    {
      name: 'exceptions',
      display_name: 'Exceptions & Deviations',
      display_name_es: 'Excepciones y Desviaciones',
      description: 'Number and severity of exceptions and deviations',
      weight: 30.00,
      keywords: ['exceptions', 'deviations', 'exclusions', 'clarifications'],
      sort_order: 3,
    },
  ],
  hse_compliance: [
    {
      name: 'safety_studies',
      display_name: 'Safety Studies',
      display_name_es: 'Estudios de Seguridad',
      description: 'Inclusion and quality of safety studies',
      weight: 53.33,
      keywords: ['safety', 'hazop', 'risk', 'studies'],
      sort_order: 1,
    },
    {
      name: 'regulatory_compliance',
      display_name: 'Regulatory Compliance',
      display_name_es: 'Cumplimiento Normativo',
      description: 'Compliance with regulatory requirements',
      weight: 46.67,
      keywords: ['regulatory', 'compliance', 'permits', 'legal'],
      sort_order: 2,
    },
  ],
};

/**
 * Build full default configuration with categories and criteria
 */
export function buildDefaultConfiguration(): CategoryDraft[] {
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    criteria: DEFAULT_CRITERIA[category.name] || [],
  }));
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate total weight of categories
 */
export function calculateTotalCategoryWeight(categories: { weight: number }[]): number {
  return categories.reduce((sum, cat) => sum + cat.weight, 0);
}

/**
 * Calculate total weight of criteria within a category
 */
export function calculateTotalCriteriaWeight(criteria: { weight: number }[]): number {
  return criteria.reduce((sum, crit) => sum + crit.weight, 0);
}

/**
 * Validate scoring configuration
 */
export function validateScoringConfiguration(categories: CategoryDraft[]): ScoringValidationResult {
  const errors: ScoringValidationError[] = [];
  const warnings: string[] = [];

  // Check minimum categories
  if (categories.length === 0) {
    errors.push({
      type: 'general',
      message: 'At least one category is required',
    });
    return { valid: false, errors, warnings };
  }

  // Check category weights sum to 100
  const totalCategoryWeight = calculateTotalCategoryWeight(categories);
  if (Math.abs(totalCategoryWeight - 100) > 0.01) {
    errors.push({
      type: 'weight',
      message: `Category weights must sum to 100% (currently ${totalCategoryWeight.toFixed(2)}%)`,
    });
  }

  // Check each category
  categories.forEach((category, catIndex) => {
    // Check category has name
    if (!category.name?.trim()) {
      errors.push({
        type: 'category',
        field: 'name',
        message: `Category ${catIndex + 1} must have a name`,
        category_id: category.id,
      });
    }

    // Check category has display name
    if (!category.display_name?.trim()) {
      errors.push({
        type: 'category',
        field: 'display_name',
        message: `Category "${category.name || catIndex + 1}" must have a display name`,
        category_id: category.id,
      });
    }

    // Check category has at least one criterion
    if (!category.criteria || category.criteria.length === 0) {
      errors.push({
        type: 'category',
        message: `Category "${category.display_name || category.name}" must have at least one criterion`,
        category_id: category.id,
      });
    } else {
      // Check criteria weights sum correctly within category
      // Supports both conventions: absolute (sum = category weight) or relative (sum = 100%)
      const totalCriteriaWeight = calculateTotalCriteriaWeight(category.criteria);
      const expectedAbsolute = category.weight || 0;
      const sumsToAbsolute = Math.abs(totalCriteriaWeight - expectedAbsolute) <= 0.1;
      const sumsToRelative = Math.abs(totalCriteriaWeight - 100) <= 0.1;
      if (!sumsToAbsolute && !sumsToRelative) {
        errors.push({
          type: 'weight',
          message: `Criteria weights in "${category.display_name}" must sum to ${expectedAbsolute}% (currently ${totalCriteriaWeight.toFixed(1)}%)`,
          category_id: category.id,
        });
      }

      // Check each criterion
      category.criteria.forEach((criterion, critIndex) => {
        if (!criterion.name?.trim()) {
          errors.push({
            type: 'criterion',
            field: 'name',
            message: `Criterion ${critIndex + 1} in "${category.display_name}" must have a name`,
            category_id: category.id,
            criterion_id: criterion.id,
          });
        }

        if (!criterion.display_name?.trim()) {
          errors.push({
            type: 'criterion',
            field: 'display_name',
            message: `Criterion "${criterion.name || critIndex + 1}" must have a display name`,
            category_id: category.id,
            criterion_id: criterion.id,
          });
        }

        if (criterion.weight <= 0) {
          warnings.push(`Criterion "${criterion.display_name}" has zero weight`);
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate a slug from display name
 */
export function generateSlugFromName(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

/**
 * Get contrasting text color for a background color
 */
export function getContrastTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Default color palette for categories
 */
export const CATEGORY_COLORS = [
  '#12b5b0', // Teal (Technical)
  '#f59e0b', // Amber (Economic)
  '#3b82f6', // Blue (Execution)
  '#8b5cf6', // Purple (HSE)
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f97316', // Orange
  '#6366f1', // Indigo
];
