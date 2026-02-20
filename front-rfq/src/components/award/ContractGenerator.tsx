import React, { useState, useEffect } from 'react';
import { useAwardStore } from '../../stores/useAwardStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { getProviderDisplayName } from '../../types/provider.types';

interface ContractGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onContracted?: () => void;
}

type ContractStep = 'details' | 'generate' | 'confirm';

export const ContractGenerator: React.FC<ContractGeneratorProps> = ({ isOpen, onClose, onContracted }) => {
  const { t } = useLanguageStore();
  const { award, updateAwardStatus, isLoading, error } = useAwardStore();
  const { activeProjectId, projects, loadProjects } = useProjectStore();

  const [step, setStep] = useState<ContractStep>('details');
  const [contractRef, setContractRef] = useState('');
  const [contractText, setContractText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('details');
      setContractRef('');
      setContractText('');
      setIsGenerating(false);
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Auto-generate reference
  useEffect(() => {
    if (isOpen && !contractRef && activeProject && award) {
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const prefix = (activeProject.name || 'PRJ').substring(0, 6).toUpperCase().replace(/\s/g, '');
      setContractRef(`CTR-${prefix}-${date}`);
    }
  }, [isOpen, activeProject, award, contractRef]);

  const handleGenerate = () => {
    if (!award || !activeProject) return;
    setIsGenerating(true);

    // Generate contract locally (n8n integration is in the workflow but we do a local fallback)
    setTimeout(() => {
      const text = generateLocalContract();
      setContractText(text);
      setIsGenerating(false);
      setStep('generate');
    }, 800);
  };

  const generateLocalContract = (): string => {
    if (!award || !activeProject) return '';
    const lang = (localStorage.getItem('language-storage') || '').includes('"es"') ? 'es' : 'en';
    const winner = getProviderDisplayName(award.winner_provider_name);
    const projName = activeProject.display_name || activeProject.name;
    const today = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    if (lang === 'es') {
      return `CONTRATO DE PRESTACION DE SERVICIOS

Referencia: ${contractRef}
Fecha: ${today}

---

1. PARTES CONTRATANTES

De una parte, la entidad contratante (en adelante, "el Cliente"), representada a los efectos del presente contrato.

De otra parte, ${winner} (en adelante, "el Contratista"), empresa adjudicataria del proceso de licitacion del proyecto "${projName}".

2. OBJETO DEL CONTRATO

El presente contrato tiene por objeto la ejecucion de los trabajos y servicios descritos en el pliego de condiciones del proyecto "${projName}", conforme a la oferta presentada por el Contratista y aceptada mediante la adjudicacion formal de fecha ${award.award_date ? new Date(award.award_date).toLocaleDateString('es-ES') : today}.

3. ALCANCE DE LOS TRABAJOS

El Contratista se compromete a ejecutar la totalidad de los trabajos, suministros y servicios detallados en:
  - El pliego de condiciones tecnicas del proyecto
  - La oferta tecnica y economica presentada por el Contratista
  - Las aclaraciones y modificaciones acordadas durante el proceso de evaluacion

4. PLAZO DE EJECUCION

El plazo de ejecucion del contrato sera el establecido en la oferta del Contratista, contado a partir de la fecha de firma del presente documento o de la orden de inicio, lo que ocurra primero.

5. PRECIO Y CONDICIONES DE PAGO

El precio del contrato sera el ofertado por el Contratista en su propuesta economica, sujeto a las condiciones de pago establecidas en el pliego de condiciones.

Los pagos se realizaran conforme al calendario de hitos y certificaciones acordado entre las partes.

6. GARANTIAS

El Contratista debera constituir las garantias exigidas en el pliego de condiciones:
  - Garantia de fiel cumplimiento
  - Garantia de buena ejecucion de obra
  - Seguro de responsabilidad civil

7. OBLIGACIONES DEL CONTRATISTA

El Contratista se obliga a:
  - Ejecutar los trabajos con la diligencia y calidad comprometidas
  - Cumplir con la normativa aplicable en materia de seguridad, salud y medio ambiente
  - Mantener informado al Cliente del avance de los trabajos
  - Subsanar cualquier defecto detectado durante el periodo de garantia

8. OBLIGACIONES DEL CLIENTE

El Cliente se obliga a:
  - Facilitar el acceso a las instalaciones y la informacion necesaria
  - Realizar los pagos en los plazos acordados
  - Designar un interlocutor para la coordinacion de los trabajos

9. MODIFICACIONES DEL CONTRATO

Cualquier modificacion del presente contrato debera ser acordada por escrito entre ambas partes mediante adenda al contrato.

10. RESOLUCION Y PENALIZACIONES

El incumplimiento de las obligaciones contractuales dara lugar a las penalizaciones establecidas en el pliego de condiciones, pudiendo llegar a la resolucion del contrato en los supuestos previstos.

11. JURISDICCION

Para la resolucion de cualquier controversia derivada del presente contrato, las partes se someten a la jurisdiccion de los tribunales competentes.

---

Firmado en [Ciudad], a ${today}

Por el Cliente:                          Por el Contratista (${winner}):

____________________                     ____________________
Nombre y cargo                           Nombre y cargo`;
    }

    return `SERVICE CONTRACT

Reference: ${contractRef}
Date: ${today}

---

1. CONTRACTING PARTIES

On one hand, the contracting entity (hereinafter, "the Client"), represented for the purposes of this contract.

On the other hand, ${winner} (hereinafter, "the Contractor"), the company awarded the tender process for the project "${projName}".

2. PURPOSE OF THE CONTRACT

This contract governs the execution of works and services described in the specifications of the project "${projName}", in accordance with the offer submitted by the Contractor and accepted through the formal award dated ${award.award_date ? new Date(award.award_date).toLocaleDateString('en-US') : today}.

3. SCOPE OF WORKS

The Contractor commits to executing all works, supplies, and services detailed in:
  - The technical specifications of the project
  - The technical and economic offer submitted by the Contractor
  - Clarifications and modifications agreed upon during the evaluation process

4. EXECUTION TIMELINE

The contract execution period shall be as established in the Contractor's offer, starting from the date of signing this document or the commencement order, whichever occurs first.

5. PRICE AND PAYMENT CONDITIONS

The contract price shall be as offered by the Contractor in their economic proposal, subject to the payment conditions established in the specifications.

Payments shall be made according to the milestone and certification schedule agreed between the parties.

6. GUARANTEES

The Contractor shall provide the guarantees required in the specifications:
  - Performance bond
  - Workmanship guarantee
  - Civil liability insurance

7. CONTRACTOR OBLIGATIONS

The Contractor is obligated to:
  - Execute works with the committed diligence and quality
  - Comply with applicable health, safety, and environmental regulations
  - Keep the Client informed of work progress
  - Remedy any defects detected during the warranty period

8. CLIENT OBLIGATIONS

The Client is obligated to:
  - Provide access to facilities and necessary information
  - Make payments within agreed timelines
  - Designate a liaison for work coordination

9. CONTRACT MODIFICATIONS

Any modification to this contract must be agreed in writing between both parties through a contract addendum.

10. TERMINATION AND PENALTIES

Breach of contractual obligations shall result in the penalties established in the specifications, potentially leading to contract termination in the foreseen cases.

11. JURISDICTION

For the resolution of any dispute arising from this contract, the parties submit to the jurisdiction of the competent courts.

---

Signed in [City], on ${today}

For the Client:                          For the Contractor (${winner}):

____________________                     ____________________
Name and position                        Name and position`;
  };

  const handleConfirm = async () => {
    if (!award) return;

    // Update contract data via supabase
    const { supabase } = await import('../../lib/supabase');
    if (!supabase) return;

    try {
      await (supabase.from('project_awards' as any) as any)
        .update({
          contract_reference: contractRef,
          contract_data: { text: contractText, generated_at: new Date().toISOString() },
          award_status: 'contracted',
        })
        .eq('id', award.id);

      // Update local state
      await updateAwardStatus(award.id, 'contracted');

      setShowSuccess(true);
      loadProjects();
      setTimeout(() => {
        onContracted?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Contract save error:', err);
    }
  };

  if (!isOpen || !award) return null;

  const winnerName = getProviderDisplayName(award.winner_provider_name);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)',
        width: '720px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
        animation: 'fadeInUp 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-info), #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('contract.title')}
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {t('contract.subtitle')}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
            color: 'var(--text-secondary)', borderRadius: '8px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Steps indicator */}
        <div style={{
          display: 'flex', gap: '4px', padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {(['details', 'generate', 'confirm'] as ContractStep[]).map((s, i) => {
            const labels = [t('contract.step_details'), t('contract.step_generate'), t('contract.step_confirm')];
            const isActive = step === s;
            const isDone = (step === 'generate' && i === 0) || (step === 'confirm' && i <= 1);
            return (
              <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700,
                  background: isDone ? 'var(--color-success)' : isActive ? 'var(--color-info)' : 'var(--bg-surface-alt)',
                  color: isDone || isActive ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.3s',
                }}>
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : i + 1}
                </div>
                <span style={{
                  fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                  {labels[i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Success overlay */}
          {showSuccess && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              animation: 'fadeInUp 0.4s ease-out',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(16, 185, 129, 0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('contract.success_title')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t('contract.success_msg')}
              </p>
            </div>
          )}

          {/* Step 1: Contract details */}
          {step === 'details' && !showSuccess && (
            <div>
              {/* Award info banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '20px', padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {t('contract.awarded_to')}: <span style={{ color: 'var(--color-info)' }}>{winnerName}</span>
                </span>
              </div>

              {/* Contract reference */}
              <label style={{
                display: 'block', fontSize: '0.8rem', fontWeight: 600,
                color: 'var(--text-secondary)', marginBottom: '6px',
              }}>
                {t('contract.reference_label')}
              </label>
              <input
                type="text"
                value={contractRef}
                onChange={e => setContractRef(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  fontSize: '0.9rem', fontWeight: 600, fontFamily: 'monospace',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-info)'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
              />

              {/* Summary grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                marginTop: '20px', padding: '16px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)',
              }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {t('contract.project')}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {activeProject?.display_name || activeProject?.name || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {t('contract.contractor')}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--color-info)', fontSize: '0.85rem' }}>
                    {winnerName}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {t('contract.award_date')}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {award.award_date ? new Date(award.award_date).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {t('contract.status')}
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
                    background: 'var(--color-success)', color: 'white', textTransform: 'uppercase',
                  }}>
                    {t(`award.status_${award.award_status}`)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button onClick={onClose} style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  {t('report.cancel')}
                </button>
                <button onClick={handleGenerate} disabled={!contractRef.trim() || isGenerating} style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: contractRef.trim() ? 'linear-gradient(135deg, var(--color-info), #2563eb)' : 'var(--bg-surface-alt)',
                  color: contractRef.trim() ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.85rem', fontWeight: 700,
                  cursor: contractRef.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}>
                  {isGenerating ? (
                    <>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      {t('contract.generating')}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {t('contract.generate_btn')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Edit generated contract */}
          {step === 'generate' && !showSuccess && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <label style={{
                  fontSize: '0.8rem', fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}>
                  {t('contract.document_label')}
                </label>
                <span style={{
                  fontSize: '0.72rem', color: 'var(--text-secondary)',
                  fontFamily: 'monospace', fontWeight: 600,
                }}>
                  {contractRef}
                </span>
              </div>
              <textarea
                value={contractText}
                onChange={e => setContractText(e.target.value)}
                style={{
                  width: '100%', minHeight: '400px', padding: '16px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  fontSize: '0.82rem', lineHeight: 1.7, fontFamily: 'inherit',
                  resize: 'vertical', outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-info)'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
              />
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('contract.edit_hint')}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button onClick={() => setStep('details')} style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  {t('award.back')}
                </button>
                <button onClick={() => setStep('confirm')} disabled={!contractText.trim()} style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: contractText.trim() ? 'linear-gradient(135deg, var(--color-info), #2563eb)' : 'var(--bg-surface-alt)',
                  color: contractText.trim() ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.85rem', fontWeight: 700,
                  cursor: contractText.trim() ? 'pointer' : 'not-allowed',
                }}>
                  {t('award.next')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && !showSuccess && (
            <div>
              <div style={{
                padding: '20px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)',
                marginBottom: '20px',
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('contract.confirm_title')}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {t('contract.reference_label')}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {contractRef}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {t('contract.contractor')}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-info)' }}>
                      {winnerName}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {t('contract.document_length')}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {contractText.split('\n').length} {t('contract.lines')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {t('contract.new_status')}
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
                      background: 'var(--color-success)', color: 'white', textTransform: 'uppercase',
                    }}>
                      {t('award.status_contracted')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info banner */}
              <div style={{
                padding: '14px 16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>{t('contract.info_title')}</strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {t('contract.info_msg')}
                  </p>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-error)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep('generate')} style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  {t('award.back')}
                </button>
                <button onClick={handleConfirm} disabled={isLoading} style={{
                  padding: '12px 28px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: 'linear-gradient(135deg, var(--color-success), #059669)',
                  color: 'white', fontSize: '0.9rem', fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  opacity: isLoading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s',
                }}>
                  {isLoading ? (
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {t('contract.confirm_btn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
