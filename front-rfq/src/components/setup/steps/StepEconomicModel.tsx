import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useSetupStore } from '../../../stores/useSetupStore';
import type { EconomicFieldType } from '../../../types/database.types';
import type { EconomicFieldEntry } from '../../../types/setup.types';

// ============================================
// CONSTANTS
// ============================================

const FIELD_TYPE_COLORS: Record<EconomicFieldType, string> = {
  currency: '#22c55e',
  percentage: '#f59e0b',
  number: '#3b82f6',
  text: '#8b5cf6',
  formula: '#12b5b0',
};

const FIELD_TYPES: EconomicFieldType[] = [
  'currency',
  'percentage',
  'number',
  'text',
  'formula',
];

const DEFAULT_EPC_FIELDS: Omit<EconomicFieldEntry, 'id' | 'sortOrder'>[] = [
  { name: 'CAPEX Total', fieldType: 'currency', unit: '', isRequired: true, parentId: null },
  { name: 'Equipment & Materials', fieldType: 'currency', unit: '', isRequired: true, parentId: '__CAPEX__' },
  { name: 'Civil Works', fieldType: 'currency', unit: '', isRequired: true, parentId: '__CAPEX__' },
  { name: 'Installation & Commissioning', fieldType: 'currency', unit: '', isRequired: true, parentId: '__CAPEX__' },
  { name: 'Engineering & Design', fieldType: 'currency', unit: '', isRequired: true, parentId: '__CAPEX__' },
  { name: 'OPEX (Annual)', fieldType: 'currency', unit: '', isRequired: true, parentId: null },
  { name: 'Maintenance', fieldType: 'currency', unit: '', isRequired: false, parentId: '__OPEX__' },
  { name: 'Operations', fieldType: 'currency', unit: '', isRequired: false, parentId: '__OPEX__' },
  { name: 'Contingency', fieldType: 'percentage', unit: '%', isRequired: false, parentId: null },
  { name: 'Total Price', fieldType: 'currency', unit: '', isRequired: true, parentId: null },
];

// ============================================
// PROPS
// ============================================

interface StepEconomicModelProps {
  currency: string;
}

// ============================================
// COMPONENT
// ============================================

export const StepEconomicModel: React.FC<StepEconomicModelProps> = ({ currency }) => {
  const { t } = useLanguageStore();
  const {
    economicFields,
    excelTemplate,
    setEconomicFields,
    addEconomicField,
    updateEconomicField,
    deleteEconomicField,
    setExcelTemplate,
    clearExcelTemplate,
  } = useSetupStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [addingSubfieldFor, setAddingSubfieldFor] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<EconomicFieldType>('currency');
  const [newFieldUnit, setNewFieldUnit] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(true);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // ============================================
  // HELPERS
  // ============================================

  const getFieldTypeLabel = (type: EconomicFieldType): string => {
    const fallbacks: Record<EconomicFieldType, string> = {
      currency: 'Moneda',
      percentage: 'Porcentaje',
      number: 'Numero',
      text: 'Texto',
      formula: 'Formula',
    };
    return t(`setup.economic.type.${type}`) || fallbacks[type];
  };

  const getUnitHint = (type: EconomicFieldType): string => {
    switch (type) {
      case 'currency': return currency || 'EUR';
      case 'percentage': return '%';
      case 'number': return 'ud.';
      default: return '';
    }
  };

  // Organize flat list into tree: parents at root, children grouped
  const parentFields = economicFields.filter((f) => !f.parentId);
  const getChildren = (parentId: string) =>
    economicFields.filter((f) => f.parentId === parentId);

  // ============================================
  // EXCEL UPLOAD
  // ============================================

  const handleExcelUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        const firstSheet = workbook.Sheets[sheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        const columns = (jsonData[0] as string[]) || [];

        setExcelTemplate({
          fileName: file.name,
          sheetNames,
          columns,
          rowCount: jsonData.length - 1,
          rawData: XLSX.utils.sheet_to_json(firstSheet),
          uploadedAt: new Date().toISOString(),
        });
      } catch {
        // Silently fail on parse error
      }
    };
    reader.readAsArrayBuffer(file);
  }, [setExcelTemplate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleExcelUpload(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleExcelUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // ============================================
  // FIELD MANAGEMENT
  // ============================================

  const resetNewFieldForm = () => {
    setNewFieldName('');
    setNewFieldType('currency');
    setNewFieldUnit('');
    setNewFieldRequired(true);
    setIsAddingField(false);
    setAddingSubfieldFor(null);
  };

  const handleAddField = (parentId?: string) => {
    const trimmed = newFieldName.trim();
    if (!trimmed) return;

    addEconomicField({
      id: crypto.randomUUID(),
      parentId: parentId || null,
      name: trimmed,
      fieldType: newFieldType,
      unit: newFieldUnit || getUnitHint(newFieldType),
      isRequired: newFieldRequired,
      sortOrder: economicFields.length,
    });

    resetNewFieldForm();
  };

  const handleLoadDefaults = () => {
    const capexId = crypto.randomUUID();
    const opexId = crypto.randomUUID();

    const fields: EconomicFieldEntry[] = DEFAULT_EPC_FIELDS.map((preset, index) => {
      let parentId: string | null = null;

      if (preset.parentId === '__CAPEX__') parentId = capexId;
      else if (preset.parentId === '__OPEX__') parentId = opexId;

      const id =
        preset.name === 'CAPEX Total' ? capexId :
        preset.name === 'OPEX (Annual)' ? opexId :
        crypto.randomUUID();

      return {
        ...preset,
        id,
        parentId,
        unit: preset.unit || (preset.fieldType === 'currency' ? (currency || 'EUR') : preset.unit || ''),
        sortOrder: index,
      };
    });

    setEconomicFields(fields);
  };

  const startEditName = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEditName = () => {
    if (editingId && editName.trim()) {
      updateEconomicField(editingId, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  };

  const startAddSubfield = (parentId: string) => {
    setAddingSubfieldFor(parentId);
    setIsAddingField(false);
    setNewFieldName('');
    setNewFieldType('currency');
    setNewFieldUnit('');
    setNewFieldRequired(true);
  };

  // ============================================
  // RENDER: FIELD CARD
  // ============================================

  const renderFieldCard = (field: EconomicFieldEntry, isChild: boolean = false) => {
    const color = FIELD_TYPE_COLORS[field.fieldType];

    return (
      <div
        key={field.id}
        className="setup-category-card"
        style={isChild ? { marginLeft: '24px', borderLeft: `2px solid ${color}30` } : undefined}
      >
        <div className="setup-category-header" style={{ cursor: 'default' }}>
          {/* Color indicator */}
          <div
            className="setup-category-color"
            style={{ background: color }}
          />

          {/* Name (editable inline) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {editingId === field.id ? (
              <input
                className="setup-input"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditName();
                  if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                }}
                onBlur={saveEditName}
                autoFocus
                style={{ padding: '4px 8px', fontSize: '0.85rem', fontWeight: 600 }}
              />
            ) : (
              <span
                className="setup-category-name"
                onClick={() => startEditName(field.id, field.name)}
                style={{ cursor: 'text' }}
                title={t('setup.economic.field_name') || 'Nombre del campo'}
              >
                {field.name}
              </span>
            )}

            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Type badge */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 600,
                background: `${color}18`,
                color: color,
                border: `1px solid ${color}30`,
              }}>
                {getFieldTypeLabel(field.fieldType)}
              </span>

              {/* Unit badge */}
              {field.unit && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}>
                  {field.unit}
                </span>
              )}

              {/* Required indicator */}
              {field.isRequired && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {t('setup.economic.field_required') || 'Obligatorio'}
                </span>
              )}
            </div>
          </div>

          {/* Inline controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Field type selector */}
            <select
              value={field.fieldType}
              onChange={(e) => {
                const newType = e.target.value as EconomicFieldType;
                updateEconomicField(field.id, {
                  fieldType: newType,
                  unit: getUnitHint(newType),
                });
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '4px 6px',
                fontSize: '0.72rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
              title={t('setup.economic.field_type') || 'Tipo'}
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft} value={ft}>{getFieldTypeLabel(ft)}</option>
              ))}
            </select>

            {/* Unit input */}
            <input
              type="text"
              value={field.unit || ''}
              onChange={(e) => updateEconomicField(field.id, { unit: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder={getUnitHint(field.fieldType)}
              style={{
                width: '56px',
                padding: '4px 6px',
                fontSize: '0.72rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                textAlign: 'center',
                fontFamily: 'inherit',
              }}
              title={t('setup.economic.field_unit') || 'Unidad'}
            />

            {/* Required toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                color: field.isRequired ? '#ef4444' : 'var(--text-tertiary)',
                fontWeight: field.isRequired ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
              title={t('setup.economic.field_required') || 'Obligatorio'}
            >
              <input
                type="checkbox"
                checked={field.isRequired}
                onChange={(e) => updateEconomicField(field.id, { isRequired: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '14px',
                  height: '14px',
                  accentColor: '#ef4444',
                  cursor: 'pointer',
                }}
              />
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </label>

            {/* Add sub-field button (only for parent fields) */}
            {!isChild && (
              <button
                className="setup-category-action-btn"
                onClick={() => startAddSubfield(field.id)}
                title={t('setup.economic.add_subfield') || 'Anadir sub-campo'}
                style={{ color: 'var(--accent, #12b5b0)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>

          {/* Delete button */}
          <div className="setup-category-actions">
            <button
              className="setup-category-action-btn delete"
              onClick={() => deleteEconomicField(field.id)}
              title="Eliminar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: ADD FIELD FORM
  // ============================================

  const renderAddFieldForm = (parentId?: string) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '14px',
      border: '2px dashed var(--accent, #12b5b0)',
      borderRadius: '10px',
      background: 'rgba(18, 181, 176, 0.05)',
      marginLeft: parentId ? '24px' : undefined,
    }}>
      {/* Row 1: Name input */}
      <input
        className="setup-input"
        type="text"
        placeholder={t('setup.economic.field_name') || 'Nombre del campo'}
        value={newFieldName}
        onChange={(e) => setNewFieldName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAddField(parentId);
          if (e.key === 'Escape') resetNewFieldForm();
        }}
        autoFocus
        style={{ fontSize: '0.85rem' }}
      />

      {/* Row 2: Type, Unit, Required, Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Type select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {t('setup.economic.field_type') || 'Tipo'}:
          </span>
          <select
            value={newFieldType}
            onChange={(e) => {
              const ft = e.target.value as EconomicFieldType;
              setNewFieldType(ft);
              setNewFieldUnit(getUnitHint(ft));
            }}
            style={{
              padding: '5px 8px',
              fontSize: '0.8rem',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {FIELD_TYPES.map((ft) => (
              <option key={ft} value={ft}>{getFieldTypeLabel(ft)}</option>
            ))}
          </select>
        </div>

        {/* Unit input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {t('setup.economic.field_unit') || 'Unidad'}:
          </span>
          <input
            type="text"
            value={newFieldUnit}
            onChange={(e) => setNewFieldUnit(e.target.value)}
            placeholder={getUnitHint(newFieldType)}
            style={{
              width: '64px',
              padding: '5px 8px',
              fontSize: '0.8rem',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Required checkbox */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}>
          <input
            type="checkbox"
            checked={newFieldRequired}
            onChange={(e) => setNewFieldRequired(e.target.checked)}
            style={{ width: '14px', height: '14px', accentColor: '#ef4444', cursor: 'pointer' }}
          />
          {t('setup.economic.field_required') || 'Obligatorio'}
        </label>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Confirm / Cancel */}
        <button
          className="setup-btn setup-btn-primary"
          onClick={() => handleAddField(parentId)}
          disabled={!newFieldName.trim()}
          style={{ padding: '6px 12px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
        <button
          className="setup-btn setup-btn-secondary"
          onClick={resetNewFieldForm}
          style={{ padding: '6px 12px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div>
      {/* Hint */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('setup.economic.hint') || 'Define los campos economicos que esperas de los proveedores. Opcionalmente sube tu Excel template.'}
        </p>
      </div>

      {/* ============================================
         SECTION A: EXCEL TEMPLATE UPLOAD
         ============================================ */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #12b5b0)" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 12 15 15" />
          </svg>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('setup.economic.excel_upload') || 'Subir Excel Template'}
          </span>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'var(--bg-surface-alt)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-color)',
          }}>
            opcional
          </span>
        </div>

        {!excelTemplate ? (
          /* Dropzone */
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '28px 20px',
              border: `2px dashed ${isDragOver ? 'var(--accent, #12b5b0)' : 'var(--border-color)'}`,
              borderRadius: '12px',
              background: isDragOver ? 'rgba(18, 181, 176, 0.06)' : 'var(--bg-surface-alt)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={isDragOver ? 'var(--accent, #12b5b0)' : 'var(--text-tertiary)'} strokeWidth="1.5" style={{ opacity: 0.6 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <p style={{
              fontSize: '0.85rem',
              color: isDragOver ? 'var(--accent, #12b5b0)' : 'var(--text-tertiary)',
              margin: 0,
              textAlign: 'center',
            }}>
              {t('setup.economic.excel_hint') || 'Arrastra tu Excel template aqui o haz clic para seleccionar'}
            </p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              .xlsx, .xls
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          /* Uploaded file info */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 16px',
            background: 'var(--bg-surface-alt)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}>
            {/* File icon */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <polyline points="16 13 12 17 8 13" />
                <line x1="12" y1="12" x2="12" y2="17" />
              </svg>
            </div>

            {/* File info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {excelTemplate.fileName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}>
                  {excelTemplate.sheetNames.length} {t('setup.economic.excel_sheets') || 'hojas'}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}>
                  {excelTemplate.columns.length} {t('setup.economic.excel_columns') || 'columnas'}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}>
                  {excelTemplate.rowCount} {t('setup.economic.excel_rows') || 'filas'}
                </span>
              </div>
            </div>

            {/* Remove button */}
            <button
              className="setup-btn setup-btn-secondary"
              onClick={clearExcelTemplate}
              style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#ef4444' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {t('setup.economic.excel_remove') || 'Eliminar template'}
            </button>
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{
        height: '1px',
        background: 'var(--border-color)',
        margin: '20px 0',
      }} />

      {/* ============================================
         SECTION B: ECONOMIC FIELDS DEFINITION
         ============================================ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #12b5b0)" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('setup.economic.fields_title') || 'Campos Economicos'}
        </span>
      </div>

      {/* Empty State */}
      {economicFields.length === 0 && !isAddingField && (
        <div className="setup-criteria-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '8px' }}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: '0 0 12px 0' }}>
            {t('setup.economic.empty') || 'No hay campos economicos definidos.'}
          </p>
          <button
            className="setup-btn setup-btn-primary"
            onClick={handleLoadDefaults}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            {t('setup.economic.load_defaults') || 'Cargar estructura EPC'}
          </button>
        </div>
      )}

      {/* Summary bar (when items exist) */}
      {economicFields.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '16px',
          padding: '10px 14px',
          background: 'var(--bg-surface-alt)',
          borderRadius: 'var(--radius-md, 10px)',
          border: '1px solid var(--border-color)',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #12b5b0)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            {parentFields.length} {parentFields.length === 1 ? 'campo' : 'campos'}
            {economicFields.length > parentFields.length && (
              <span style={{ color: 'var(--text-tertiary)' }}>
                ({economicFields.length - parentFields.length} sub-campos)
              </span>
            )}
          </span>
          <button
            className="setup-btn setup-btn-secondary"
            onClick={handleLoadDefaults}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {t('setup.economic.load_defaults') || 'Cargar estructura EPC'}
          </button>
        </div>
      )}

      {/* Field Tree */}
      {parentFields.map((parent) => {
        const children = getChildren(parent.id);
        return (
          <div key={parent.id}>
            {/* Parent card */}
            {renderFieldCard(parent, false)}

            {/* Children cards */}
            {children.length > 0 && (
              <div style={{
                borderLeft: '2px solid var(--border-color)',
                marginLeft: '16px',
                marginBottom: '12px',
                paddingLeft: '0',
              }}>
                {children.map((child) => renderFieldCard(child, true))}
              </div>
            )}

            {/* Add sub-field form for this parent */}
            {addingSubfieldFor === parent.id && renderAddFieldForm(parent.id)}
          </div>
        );
      })}

      {/* Add Root Field */}
      {isAddingField ? (
        renderAddFieldForm()
      ) : (
        <button
          className="setup-add-category-btn"
          onClick={() => {
            setIsAddingField(true);
            setAddingSubfieldFor(null);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('setup.economic.add_field') || 'Anadir campo'}
        </button>
      )}
    </div>
  );
};
