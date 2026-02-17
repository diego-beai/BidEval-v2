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
    weight: 30,
    color: '#f59e0b',
    sort_order: 2,
  },
  {
    name: 'execution',
    display_name: 'Execution Capability',
    display_name_es: 'Capacidad de Ejecución',
    weight: 15,
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
  {
    name: 'esg_sustainability',
    display_name: 'ESG & Sustainability',
    display_name_es: 'ESG y Sostenibilidad',
    weight: 10,
    color: '#10b981',
    sort_order: 5,
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
  esg_sustainability: [
    {
      name: 'environmental_management',
      display_name: 'Environmental Management',
      display_name_es: 'Gestión Ambiental',
      description: 'Environmental certifications (ISO 14001), carbon footprint reduction, energy efficiency',
      weight: 40.00,
      keywords: ['environmental', 'iso 14001', 'carbon', 'emissions', 'energy', 'footprint'],
      sort_order: 1,
    },
    {
      name: 'social_responsibility',
      display_name: 'Social Responsibility',
      display_name_es: 'Responsabilidad Social',
      description: 'Labor practices, diversity & inclusion, community impact, supply chain labor standards',
      weight: 30.00,
      keywords: ['social', 'labor', 'diversity', 'inclusion', 'community', 'human rights'],
      sort_order: 2,
    },
    {
      name: 'governance_ethics',
      display_name: 'Governance & Ethics',
      display_name_es: 'Gobernanza y Ética',
      description: 'Anti-corruption policies, transparency, ethical supply chain, CSRD compliance',
      weight: 30.00,
      keywords: ['governance', 'ethics', 'anti-corruption', 'transparency', 'csrd', 'esg report'],
      sort_order: 3,
    },
  ],
};

/**
 * Build full default configuration with categories and criteria.
 * Accepts an optional projectType to return type-specific weight distributions:
 * - RFP: balanced defaults (current weights)
 * - RFQ: economic-heavy (economic=45%, technical=25%, execution=10%, hse=10%, esg=10%)
 * - RFI: informational only (technical=60%, execution=40%, no economic/hse/esg)
 */
export function buildDefaultConfiguration(projectType?: 'RFP' | 'RFQ' | 'RFI'): CategoryDraft[] {
  if (projectType === 'RFQ') {
    const rfqWeights: Record<string, number> = {
      economic: 45,
      technical: 25,
      execution: 10,
      hse_compliance: 10,
      esg_sustainability: 10,
    };
    return DEFAULT_CATEGORIES.map((category) => {
      const weight = rfqWeights[category.name] ?? category.weight;
      return {
        ...category,
        weight,
        criteria: (DEFAULT_CRITERIA[category.name] || []).map(c => ({
          ...c,
          weight: parseFloat((c.weight * weight / 100).toFixed(2)),
        })),
      };
    });
  }

  if (projectType === 'RFI') {
    return DEFAULT_CATEGORIES
      .filter(cat => cat.name === 'technical' || cat.name === 'execution')
      .map((category) => {
        const weight = category.name === 'technical' ? 60 : 40;
        return {
          ...category,
          weight,
          criteria: (DEFAULT_CRITERIA[category.name] || []).map(c => ({
            ...c,
            weight: parseFloat((c.weight * weight / 100).toFixed(2)),
          })),
        };
      });
  }

  // RFP (default): balanced weights
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    criteria: (DEFAULT_CRITERIA[category.name] || []).map(c => ({
      ...c,
      weight: parseFloat((c.weight * category.weight / 100).toFixed(2)),
    })),
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

// ============================================
// INDUSTRY TEMPLATES
// ============================================

export interface IndustryTemplate {
  id: string;
  name: string;
  name_es: string;
  description: string;
  description_es: string;
  categories: CategoryDraft[];
}

function buildIndustryCategories(
  specs: Array<{
    name: string;
    display_name: string;
    display_name_es: string;
    weight: number;
    color: string;
    criteria: Array<{
      name: string;
      display_name: string;
      display_name_es: string;
      weight: number;
      keywords?: string[];
    }>;
  }>
): CategoryDraft[] {
  return specs.map((cat, idx) => ({
    name: cat.name,
    display_name: cat.display_name,
    display_name_es: cat.display_name_es,
    weight: cat.weight,
    color: cat.color,
    sort_order: idx + 1,
    criteria: cat.criteria.map((crit, cidx) => ({
      name: crit.name,
      display_name: crit.display_name,
      display_name_es: crit.display_name_es,
      weight: parseFloat((crit.weight * cat.weight / 100).toFixed(2)),
      keywords: crit.keywords || [],
      sort_order: cidx + 1,
    })),
  }));
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'oil_gas',
    name: 'Oil & Gas / Energy',
    name_es: 'Oil & Gas / Energia',
    description: 'HSE-heavy evaluation for energy sector projects',
    description_es: 'Evaluacion con peso fuerte en HSE para proyectos del sector energia',
    categories: buildIndustryCategories([
      {
        name: 'technical', display_name: 'Technical Completeness', display_name_es: 'Completitud Tecnica',
        weight: 30, color: '#12b5b0',
        criteria: [
          { name: 'scope_facilities', display_name: 'Scope of Facilities', display_name_es: 'Alcance de Instalaciones', weight: 35, keywords: ['facilities', 'plant', 'equipment'] },
          { name: 'scope_work', display_name: 'Scope of Work', display_name_es: 'Alcance de Trabajo', weight: 35, keywords: ['scope', 'work', 'activities'] },
          { name: 'deliverables_quality', display_name: 'Deliverables Quality', display_name_es: 'Calidad de Entregables', weight: 30, keywords: ['deliverables', 'quality'] },
        ],
      },
      {
        name: 'economic', display_name: 'Economic Competitiveness', display_name_es: 'Competitividad Economica',
        weight: 25, color: '#f59e0b',
        criteria: [
          { name: 'total_price', display_name: 'Total Price', display_name_es: 'Precio Total', weight: 40, keywords: ['price', 'cost'] },
          { name: 'price_breakdown', display_name: 'Price Breakdown', display_name_es: 'Desglose de Precio', weight: 30, keywords: ['breakdown', 'detail'] },
          { name: 'capex_opex', display_name: 'CAPEX/OPEX Methodology', display_name_es: 'Metodologia CAPEX/OPEX', weight: 30, keywords: ['capex', 'opex'] },
        ],
      },
      {
        name: 'hse_compliance', display_name: 'HSE & Compliance', display_name_es: 'HSE y Cumplimiento',
        weight: 25, color: '#ef4444',
        criteria: [
          { name: 'safety_studies', display_name: 'Safety Studies (HAZOP, SIL)', display_name_es: 'Estudios de Seguridad (HAZOP, SIL)', weight: 40, keywords: ['hazop', 'safety', 'sil'] },
          { name: 'regulatory_compliance', display_name: 'Regulatory Compliance', display_name_es: 'Cumplimiento Normativo', weight: 30, keywords: ['regulatory', 'permits'] },
          { name: 'environmental_plan', display_name: 'Environmental Plan', display_name_es: 'Plan Ambiental', weight: 30, keywords: ['environmental', 'emissions', 'waste'] },
        ],
      },
      {
        name: 'execution', display_name: 'Execution & Experience', display_name_es: 'Ejecucion y Experiencia',
        weight: 20, color: '#3b82f6',
        criteria: [
          { name: 'schedule', display_name: 'Schedule & Milestones', display_name_es: 'Cronograma e Hitos', weight: 35, keywords: ['schedule', 'milestones'] },
          { name: 'resources', display_name: 'Resources & Team', display_name_es: 'Recursos y Equipo', weight: 35, keywords: ['resources', 'team', 'personnel'] },
          { name: 'track_record', display_name: 'Track Record in O&G', display_name_es: 'Experiencia en O&G', weight: 30, keywords: ['experience', 'references', 'oil', 'gas'] },
        ],
      },
    ]),
  },
  {
    id: 'telecom',
    name: 'Telecommunications',
    name_es: 'Telecomunicaciones',
    description: 'SLA and technology-focused evaluation',
    description_es: 'Evaluacion centrada en SLAs y tecnologia',
    categories: buildIndustryCategories([
      {
        name: 'technical', display_name: 'Technical Solution', display_name_es: 'Solucion Tecnica',
        weight: 35, color: '#12b5b0',
        criteria: [
          { name: 'architecture', display_name: 'Architecture & Design', display_name_es: 'Arquitectura y Diseno', weight: 30, keywords: ['architecture', 'design', 'network'] },
          { name: 'scalability', display_name: 'Scalability & Performance', display_name_es: 'Escalabilidad y Rendimiento', weight: 25, keywords: ['scalability', 'performance', 'capacity'] },
          { name: 'technology_stack', display_name: 'Technology Stack', display_name_es: 'Stack Tecnologico', weight: 25, keywords: ['technology', 'stack', '5G', 'fiber'] },
          { name: 'integration', display_name: 'Integration Capability', display_name_es: 'Capacidad de Integracion', weight: 20, keywords: ['integration', 'API', 'interoperability'] },
        ],
      },
      {
        name: 'economic', display_name: 'Economic Competitiveness', display_name_es: 'Competitividad Economica',
        weight: 25, color: '#f59e0b',
        criteria: [
          { name: 'total_price', display_name: 'Total Cost of Ownership', display_name_es: 'Coste Total de Propiedad', weight: 50, keywords: ['tco', 'price', 'cost'] },
          { name: 'licensing_model', display_name: 'Licensing Model', display_name_es: 'Modelo de Licenciamiento', weight: 25, keywords: ['license', 'subscription', 'model'] },
          { name: 'payment_terms', display_name: 'Payment Terms', display_name_es: 'Condiciones de Pago', weight: 25, keywords: ['payment', 'terms', 'financing'] },
        ],
      },
      {
        name: 'sla_support', display_name: 'SLA & Support', display_name_es: 'SLA y Soporte',
        weight: 25, color: '#8b5cf6',
        criteria: [
          { name: 'sla_availability', display_name: 'Availability SLA', display_name_es: 'SLA de Disponibilidad', weight: 40, keywords: ['availability', 'uptime', 'sla'] },
          { name: 'response_time', display_name: 'Response & Resolution Time', display_name_es: 'Tiempo de Respuesta y Resolucion', weight: 30, keywords: ['response', 'resolution', 'time'] },
          { name: 'support_model', display_name: 'Support Model (24/7)', display_name_es: 'Modelo de Soporte (24/7)', weight: 30, keywords: ['support', '24/7', 'noc'] },
        ],
      },
      {
        name: 'execution', display_name: 'Deployment & Execution', display_name_es: 'Despliegue y Ejecucion',
        weight: 15, color: '#3b82f6',
        criteria: [
          { name: 'deployment_plan', display_name: 'Deployment Plan', display_name_es: 'Plan de Despliegue', weight: 50, keywords: ['deployment', 'rollout', 'migration'] },
          { name: 'team_experience', display_name: 'Team & References', display_name_es: 'Equipo y Referencias', weight: 50, keywords: ['team', 'references', 'experience'] },
        ],
      },
    ]),
  },
  {
    id: 'aerospace_defense',
    name: 'Aerospace & Defense',
    name_es: 'Aeroespacial y Defensa',
    description: 'Quality and certification-heavy evaluation',
    description_es: 'Evaluacion con fuerte peso en calidad y certificaciones',
    categories: buildIndustryCategories([
      {
        name: 'technical', display_name: 'Technical Compliance', display_name_es: 'Cumplimiento Tecnico',
        weight: 35, color: '#12b5b0',
        criteria: [
          { name: 'technical_solution', display_name: 'Technical Solution', display_name_es: 'Solucion Tecnica', weight: 30, keywords: ['solution', 'design', 'engineering'] },
          { name: 'certifications', display_name: 'Certifications (AS9100, NADCAP)', display_name_es: 'Certificaciones (AS9100, NADCAP)', weight: 25, keywords: ['AS9100', 'NADCAP', 'certification'] },
          { name: 'quality_system', display_name: 'Quality Management System', display_name_es: 'Sistema de Gestion de Calidad', weight: 25, keywords: ['quality', 'QMS', 'inspection'] },
          { name: 'configuration_mgmt', display_name: 'Configuration Management', display_name_es: 'Gestion de Configuracion', weight: 20, keywords: ['configuration', 'traceability', 'change'] },
        ],
      },
      {
        name: 'economic', display_name: 'Economic Offer', display_name_es: 'Oferta Economica',
        weight: 20, color: '#f59e0b',
        criteria: [
          { name: 'unit_price', display_name: 'Unit Price', display_name_es: 'Precio Unitario', weight: 50, keywords: ['price', 'unit', 'cost'] },
          { name: 'nrc_rc', display_name: 'NRC/RC Breakdown', display_name_es: 'Desglose NRC/RC', weight: 30, keywords: ['nrc', 'recurring', 'non-recurring'] },
          { name: 'payment_milestones', display_name: 'Payment Milestones', display_name_es: 'Hitos de Pago', weight: 20, keywords: ['milestones', 'payment', 'schedule'] },
        ],
      },
      {
        name: 'supply_chain', display_name: 'Supply Chain & Logistics', display_name_es: 'Cadena de Suministro y Logistica',
        weight: 20, color: '#ec4899',
        criteria: [
          { name: 'lead_time', display_name: 'Lead Time', display_name_es: 'Plazo de Entrega', weight: 40, keywords: ['lead time', 'delivery', 'schedule'] },
          { name: 'supply_chain_risk', display_name: 'Supply Chain Risk', display_name_es: 'Riesgo de Cadena de Suministro', weight: 35, keywords: ['supply', 'risk', 'single source'] },
          { name: 'logistics', display_name: 'Logistics & Packaging', display_name_es: 'Logistica y Embalaje', weight: 25, keywords: ['logistics', 'packaging', 'shipping'] },
        ],
      },
      {
        name: 'compliance', display_name: 'Regulatory & Export Control', display_name_es: 'Regulatorio y Control de Exportacion',
        weight: 25, color: '#8b5cf6',
        criteria: [
          { name: 'export_control', display_name: 'Export Control (ITAR/EAR)', display_name_es: 'Control de Exportacion (ITAR/EAR)', weight: 35, keywords: ['ITAR', 'EAR', 'export'] },
          { name: 'regulatory', display_name: 'Regulatory Compliance', display_name_es: 'Cumplimiento Normativo', weight: 35, keywords: ['regulatory', 'EASA', 'FAA'] },
          { name: 'security_clearance', display_name: 'Security Clearance', display_name_es: 'Habilitacion de Seguridad', weight: 30, keywords: ['security', 'clearance', 'classified'] },
        ],
      },
    ]),
  },
  {
    id: 'construction',
    name: 'Construction & Infrastructure',
    name_es: 'Construccion e Infraestructura',
    description: 'Schedule and safety-focused evaluation',
    description_es: 'Evaluacion centrada en plazos y seguridad',
    categories: buildIndustryCategories([
      {
        name: 'technical', display_name: 'Technical Proposal', display_name_es: 'Propuesta Tecnica',
        weight: 30, color: '#12b5b0',
        criteria: [
          { name: 'methodology', display_name: 'Construction Methodology', display_name_es: 'Metodologia Constructiva', weight: 35, keywords: ['methodology', 'construction', 'method'] },
          { name: 'design_quality', display_name: 'Design Quality', display_name_es: 'Calidad del Diseno', weight: 35, keywords: ['design', 'quality', 'engineering'] },
          { name: 'materials', display_name: 'Materials & Equipment', display_name_es: 'Materiales y Equipos', weight: 30, keywords: ['materials', 'equipment', 'specifications'] },
        ],
      },
      {
        name: 'economic', display_name: 'Economic Offer', display_name_es: 'Oferta Economica',
        weight: 30, color: '#f59e0b',
        criteria: [
          { name: 'total_price', display_name: 'Total Price', display_name_es: 'Precio Total', weight: 40, keywords: ['price', 'budget', 'cost'] },
          { name: 'unit_rates', display_name: 'Unit Rates', display_name_es: 'Precios Unitarios', weight: 30, keywords: ['unit', 'rates', 'breakdown'] },
          { name: 'contingency', display_name: 'Contingency & Variations', display_name_es: 'Contingencia y Variaciones', weight: 30, keywords: ['contingency', 'variations', 'claims'] },
        ],
      },
      {
        name: 'schedule', display_name: 'Schedule & Planning', display_name_es: 'Planificacion y Cronograma',
        weight: 20, color: '#3b82f6',
        criteria: [
          { name: 'master_schedule', display_name: 'Master Schedule', display_name_es: 'Cronograma General', weight: 50, keywords: ['schedule', 'gantt', 'timeline'] },
          { name: 'critical_path', display_name: 'Critical Path Analysis', display_name_es: 'Analisis de Ruta Critica', weight: 50, keywords: ['critical path', 'milestones', 'float'] },
        ],
      },
      {
        name: 'hse', display_name: 'HSE & Quality', display_name_es: 'HSE y Calidad',
        weight: 20, color: '#ef4444',
        criteria: [
          { name: 'safety_plan', display_name: 'Safety Plan', display_name_es: 'Plan de Seguridad', weight: 40, keywords: ['safety', 'plan', 'risk'] },
          { name: 'environmental', display_name: 'Environmental Management', display_name_es: 'Gestion Ambiental', weight: 30, keywords: ['environmental', 'waste', 'emissions'] },
          { name: 'quality_plan', display_name: 'Quality Plan (ITP/ITR)', display_name_es: 'Plan de Calidad (ITP/ITR)', weight: 30, keywords: ['quality', 'ITP', 'inspection'] },
        ],
      },
    ]),
  },
  {
    id: 'pharma_healthcare',
    name: 'Pharmaceutical & Healthcare',
    name_es: 'Farmaceutica y Healthcare',
    description: 'GxP compliance and validation-focused evaluation',
    description_es: 'Evaluacion centrada en cumplimiento GxP y validacion',
    categories: buildIndustryCategories([
      {
        name: 'technical', display_name: 'Technical & Scientific', display_name_es: 'Tecnico y Cientifico',
        weight: 30, color: '#12b5b0',
        criteria: [
          { name: 'technical_approach', display_name: 'Technical Approach', display_name_es: 'Enfoque Tecnico', weight: 35, keywords: ['technical', 'approach', 'solution'] },
          { name: 'validation', display_name: 'Validation Strategy (IQ/OQ/PQ)', display_name_es: 'Estrategia de Validacion (IQ/OQ/PQ)', weight: 35, keywords: ['validation', 'IQ', 'OQ', 'PQ', 'qualification'] },
          { name: 'documentation', display_name: 'Documentation & Traceability', display_name_es: 'Documentacion y Trazabilidad', weight: 30, keywords: ['documentation', 'traceability', 'audit trail'] },
        ],
      },
      {
        name: 'regulatory', display_name: 'Regulatory & GxP', display_name_es: 'Regulatorio y GxP',
        weight: 25, color: '#8b5cf6',
        criteria: [
          { name: 'gmp_compliance', display_name: 'GMP Compliance', display_name_es: 'Cumplimiento GMP', weight: 40, keywords: ['GMP', 'compliance', 'FDA', 'EMA'] },
          { name: 'regulatory_experience', display_name: 'Regulatory Experience', display_name_es: 'Experiencia Regulatoria', weight: 30, keywords: ['regulatory', 'approval', 'submission'] },
          { name: 'data_integrity', display_name: 'Data Integrity (ALCOA+)', display_name_es: 'Integridad de Datos (ALCOA+)', weight: 30, keywords: ['data integrity', 'ALCOA', 'electronic records'] },
        ],
      },
      {
        name: 'economic', display_name: 'Economic Offer', display_name_es: 'Oferta Economica',
        weight: 25, color: '#f59e0b',
        criteria: [
          { name: 'total_price', display_name: 'Total Price', display_name_es: 'Precio Total', weight: 45, keywords: ['price', 'cost', 'total'] },
          { name: 'cost_breakdown', display_name: 'Cost Breakdown', display_name_es: 'Desglose de Costes', weight: 30, keywords: ['breakdown', 'detail', 'itemized'] },
          { name: 'lifecycle_cost', display_name: 'Lifecycle Cost', display_name_es: 'Coste de Ciclo de Vida', weight: 25, keywords: ['lifecycle', 'maintenance', 'ongoing'] },
        ],
      },
      {
        name: 'execution', display_name: 'Project Execution', display_name_es: 'Ejecucion del Proyecto',
        weight: 20, color: '#3b82f6',
        criteria: [
          { name: 'project_plan', display_name: 'Project Plan', display_name_es: 'Plan de Proyecto', weight: 35, keywords: ['plan', 'schedule', 'milestones'] },
          { name: 'team_qualifications', display_name: 'Team Qualifications', display_name_es: 'Cualificacion del Equipo', weight: 35, keywords: ['team', 'qualifications', 'experience'] },
          { name: 'change_control', display_name: 'Change Control Process', display_name_es: 'Proceso de Control de Cambios', weight: 30, keywords: ['change control', 'deviation', 'CAPA'] },
        ],
      },
    ]),
  },
];

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
