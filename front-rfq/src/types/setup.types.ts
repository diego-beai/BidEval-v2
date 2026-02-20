/**
 * Setup Wizard Types
 *
 * Types for the expanded 7-step project setup wizard.
 * Covers milestones, document types, economic fields,
 * Excel templates, setup templates, and validation.
 */

import type {
  MilestoneType,
  DocCategory,
  EvaluationLink,
  EconomicFieldType,
} from './database.types';

// ============================================
// STEP 2: MILESTONES / DEADLINES
// ============================================

/**
 * A milestone entry for dynamic deadlines.
 * Replaces the 4 fixed date fields with a flexible list.
 */
export interface MilestoneEntry {
  id: string;
  name: string;
  description?: string;
  dueDate: string;
  sortOrder: number;
  isMandatory: boolean;
  milestoneType: MilestoneType;
}

// ============================================
// STEP 4: DOCUMENT TYPES
// ============================================

/**
 * A document type that suppliers must submit.
 * Links to an evaluation category (technical, economic, info-only).
 */
export interface DocumentTypeEntry {
  id: string;
  name: string;
  description?: string;
  docCategory: DocCategory;
  evaluationLink: EvaluationLink;
  isMandatory: boolean;
  sortOrder: number;
}

// ============================================
// STEP 5: ECONOMIC FIELDS
// ============================================

/**
 * An economic field with optional parent-child hierarchy.
 * Supports formulas for calculated fields.
 */
export interface EconomicFieldEntry {
  id: string;
  parentId?: string | null;
  name: string;
  description?: string;
  fieldType: EconomicFieldType;
  unit?: string;
  isRequired: boolean;
  sortOrder: number;
  formula?: string;
  children?: EconomicFieldEntry[];
}

/**
 * Parsed data from an uploaded Excel template.
 * Used to auto-generate economic fields from a spreadsheet.
 */
export interface ExcelTemplateData {
  fileName: string;
  sheetNames: string[];
  columns: string[];
  rowCount: number;
  rawData: Record<string, unknown>[];
  uploadedAt: string;
}

// ============================================
// STEP 7: TEMPLATES & VALIDATION
// ============================================

/**
 * A reusable setup template that captures the full configuration
 * of milestones, document types, economic fields, and scoring categories.
 */
export interface SetupTemplate {
  id: string;
  name: string;
  description?: string;
  projectType: 'RFP' | 'RFQ' | 'RFI';
  templateData: SetupTemplateData;
  isDefault: boolean;
  createdAt: string;
}

/**
 * The serializable payload stored inside a SetupTemplate.
 * scoringCategories uses `unknown[]` to avoid a hard dependency
 * on CategoryDraft from scoring.types.
 */
export interface SetupTemplateData {
  milestones: MilestoneEntry[];
  documentTypes: DocumentTypeEntry[];
  economicFields: EconomicFieldEntry[];
  scoringCategories: unknown[]; // CategoryDraft from scoring.types
}

/**
 * Result of validating the entire setup wizard before final submission.
 */
export interface SetupValidation {
  isValid: boolean;
  errors: ValidationItem[];
  warnings: ValidationItem[];
}

/**
 * Individual validation error or warning.
 */
export interface ValidationItem {
  step: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================
// PRESETS & DEFAULTS
// ============================================

/**
 * Default document type presets for quick setup.
 * Covers the most common document categories in procurement processes.
 */
export const DOCUMENT_TYPE_PRESETS: Omit<DocumentTypeEntry, 'id' | 'sortOrder'>[] = [
  {
    name: 'Propuesta Tecnica',
    docCategory: 'technical',
    evaluationLink: 'technical',
    isMandatory: true,
    description: 'Documento con la propuesta tecnica del proveedor',
  },
  {
    name: 'Oferta Economica',
    docCategory: 'economic',
    evaluationLink: 'economic',
    isMandatory: true,
    description: 'Desglose de precios y condiciones economicas',
  },
  {
    name: 'Documentacion Administrativa',
    docCategory: 'administrative',
    evaluationLink: 'info',
    isMandatory: true,
    description: 'Certificados, poderes, registros mercantiles',
  },
  {
    name: 'Plan HSE',
    docCategory: 'hse',
    evaluationLink: 'technical',
    isMandatory: false,
    description: 'Plan de seguridad, salud y medio ambiente',
  },
  {
    name: 'Documentacion Legal',
    docCategory: 'legal',
    evaluationLink: 'info',
    isMandatory: false,
    description: 'Contratos marco, seguros, garantias',
  },
  {
    name: 'Plan de Ejecucion',
    docCategory: 'technical',
    evaluationLink: 'technical',
    isMandatory: false,
    description: 'Cronograma, recursos, metodologia',
  },
];

/**
 * Default milestones based on the 4 existing fixed date fields.
 * These are pre-populated when the wizard opens so users can
 * just fill in dates rather than creating milestones from scratch.
 */
export const DEFAULT_MILESTONES: Omit<MilestoneEntry, 'id'>[] = [
  {
    name: 'Apertura',
    dueDate: '',
    sortOrder: 0,
    isMandatory: true,
    milestoneType: 'opening',
  },
  {
    name: 'Limite ofertas',
    dueDate: '',
    sortOrder: 1,
    isMandatory: true,
    milestoneType: 'submission',
  },
  {
    name: 'Evaluacion',
    dueDate: '',
    sortOrder: 2,
    isMandatory: true,
    milestoneType: 'evaluation',
  },
  {
    name: 'Adjudicacion',
    dueDate: '',
    sortOrder: 3,
    isMandatory: true,
    milestoneType: 'award',
  },
];
