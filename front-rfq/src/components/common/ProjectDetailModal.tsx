import React, { useState } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { Project, REQUIRED_EVAL_TYPES } from '../../stores/useProjectStore';
import './ProjectDetailModal.css';

interface ProjectDetailModalProps {
    project: Project;
    onClose: () => void;
}

const STEPS = [
    { key: 'bid', labelKey: 'stepper.bid', fallback: 'BID', icon: 'folder' },
    { key: 'rfp', labelKey: 'stepper.rfp', fallback: 'RFP', icon: 'file' },
    { key: 'qa', labelKey: 'stepper.qa', fallback: 'Q&A', icon: 'help' },
    { key: 'proposals', labelKey: 'stepper.proposals', fallback: 'Proposals', icon: 'upload' },
    { key: 'audit', labelKey: 'stepper.audit', fallback: 'Audit', icon: 'search' },
    { key: 'scoring', labelKey: 'stepper.scoring', fallback: 'Scoring', icon: 'chart' },
    { key: 'results', labelKey: 'stepper.results', fallback: 'Results', icon: 'trophy' },
];

function getActiveStepIndex(status: string): number {
    switch (status) {
        case 'extracting': return 1;
        case 'waiting_proposals': return 3;
        case 'evaluation': return 5;
        case 'completed': return 7;
        default: return 0;
    }
}

const StepIcon: React.FC<{ icon: string; size?: number }> = ({ icon, size = 18 }) => {
    const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (icon) {
        case 'folder': return <svg {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
        case 'file': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
        case 'help': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
        case 'upload': return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
        case 'search': return <svg {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
        case 'chart': return <svg {...props}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>;
        case 'trophy': return <svg {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
        default: return null;
    }
};

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
    const { t } = useLanguageStore();
    const activeIdx = getActiveStepIndex(project.status || 'setup');
    const [selectedStep, setSelectedStep] = useState(Math.min(activeIdx, STEPS.length - 1));

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'setup': return '#94a3b8';
            case 'extracting': return '#fbbf24';
            case 'waiting_proposals': return '#f59e0b';
            case 'evaluation': return '#06b6d4';
            case 'completed': return '#10b981';
            default: return '#94a3b8';
        }
    };

    const renderPhaseContent = (stepIdx: number) => {
        const step = STEPS[stepIdx];
        const isCompleted = stepIdx < activeIdx;
        const isCurrent = stepIdx === activeIdx;
        const isPending = stepIdx > activeIdx;

        if (isPending) {
            return (
                <div className="pdm-phase-pending">
                    <div className="pdm-pending-icon">
                        <StepIcon icon={step.icon} size={32} />
                    </div>
                    <p>{t('detail.pending_phase') || 'This phase has not started yet.'}</p>
                    <span className="pdm-pending-hint">{t('detail.complete_previous') || 'Complete the previous phases to unlock this one.'}</span>
                </div>
            );
        }

        switch (step.key) {
            case 'bid':
                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.project_name') || 'Project Name'}</span>
                                <span className="pdm-info-value">{project.display_name}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.status') || 'Status'}</span>
                                <span className="pdm-info-value" style={{ color: getStatusColor(project.status) }}>
                                    {t(`status.${project.status || 'setup'}`)}
                                </span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.created') || 'Created'}</span>
                                <span className="pdm-info-value">
                                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                                </span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.last_updated') || 'Last Updated'}</span>
                                <span className="pdm-info-value">
                                    {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '-'}
                                </span>
                            </div>
                        </div>
                        {isCurrent && (
                            <div className="pdm-next-action">
                                <span className="pdm-next-label">{t('detail.next_step') || 'Next step'}:</span>
                                <span>{t('detail.bid_next') || 'Upload RFP/RFQ/RFI documentation to proceed.'}</span>
                            </div>
                        )}
                    </div>
                );

            case 'rfp':
                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card highlight">
                                <span className="pdm-info-label">{t('detail.rfq_docs') || 'RFQ Documents'}</span>
                                <span className="pdm-info-value big">{project.rfq_count}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.requirements') || 'Requirements Extracted'}</span>
                                <span className="pdm-info-value big">{project.requirement_count}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.types_covered') || 'Types Covered'}</span>
                                <span className="pdm-info-value">{project.rfq_types_covered.length} / {REQUIRED_EVAL_TYPES.length}</span>
                            </div>
                        </div>
                        {project.rfq_types_covered.length > 0 && (
                            <div className="pdm-tags">
                                {project.rfq_types_covered.map(type => (
                                    <span key={type} className="pdm-tag completed">{type}</span>
                                ))}
                                {project.rfq_types_missing.map(type => (
                                    <span key={type} className="pdm-tag missing">{type}</span>
                                ))}
                            </div>
                        )}
                        {isCurrent && (
                            <div className="pdm-next-action">
                                <span className="pdm-next-label">{t('detail.next_step') || 'Next step'}:</span>
                                <span>{project.rfq_types_missing.length > 0
                                    ? `${t('detail.rfp_missing') || 'Missing types:'} ${project.rfq_types_missing.join(', ')}`
                                    : t('detail.rfp_complete') || 'All RFQ types covered. Proceed to Q&A.'
                                }</span>
                            </div>
                        )}
                    </div>
                );

            case 'qa':
                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card highlight">
                                <span className="pdm-info-label">{t('detail.qa_total') || 'Total Q&A Items'}</span>
                                <span className="pdm-info-value big">{project.qa_count}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.qa_open') || 'Open Questions'}</span>
                                <span className="pdm-info-value big" style={{ color: project.qa_open_count > 0 ? '#f59e0b' : '#10b981' }}>
                                    {project.qa_open_count}
                                </span>
                            </div>
                        </div>
                        {isCurrent && (
                            <div className="pdm-next-action">
                                <span className="pdm-next-label">{t('detail.next_step') || 'Next step'}:</span>
                                <span>{project.qa_open_count > 0
                                    ? t('detail.qa_pending') || 'Resolve open questions before proceeding.'
                                    : t('detail.qa_done') || 'Q&A complete. Waiting for supplier proposals.'
                                }</span>
                            </div>
                        )}
                    </div>
                );

            case 'proposals':
                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card highlight">
                                <span className="pdm-info-label">{t('detail.proposals_received') || 'Proposals Received'}</span>
                                <span className="pdm-info-value big">{project.proposal_count}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.providers_qualified') || 'Qualified Providers'}</span>
                                <span className="pdm-info-value big">{project.qualifying_providers}</span>
                            </div>
                        </div>
                        {project.provider_coverage.length > 0 && (
                            <div className="pdm-provider-list">
                                {project.provider_coverage.map(pc => (
                                    <div key={pc.name} className="pdm-provider-row">
                                        <span className="pdm-provider-name">{pc.name}</span>
                                        <div className="pdm-provider-tags">
                                            {pc.types_covered.map(t => (
                                                <span key={t} className="pdm-tag small completed">{t.replace(' Evaluation', '').replace(' Deliverables', '')}</span>
                                            ))}
                                            {pc.types_missing.map(t => (
                                                <span key={t} className="pdm-tag small missing">{t.replace(' Evaluation', '').replace(' Deliverables', '')}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isCurrent && (
                            <div className="pdm-next-action">
                                <span className="pdm-next-label">{t('detail.next_step') || 'Next step'}:</span>
                                <span>{project.qualifying_providers < 2
                                    ? t('detail.proposals_need_more') || 'Need at least 2 fully qualified providers to proceed.'
                                    : t('detail.proposals_ready') || 'Providers ready. Proceed to audit & scoring.'
                                }</span>
                            </div>
                        )}
                    </div>
                );

            case 'audit':
                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.providers_reviewed') || 'Providers Under Review'}</span>
                                <span className="pdm-info-value big">{project.provider_coverage.length}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.qa_validations') || 'Q&A Validations'}</span>
                                <span className="pdm-info-value big">{project.qa_count}</span>
                            </div>
                        </div>
                        {isCurrent && (
                            <div className="pdm-next-action">
                                <span className="pdm-next-label">{t('detail.next_step') || 'Next step'}:</span>
                                <span>{t('detail.audit_next') || 'Review supplier responses and proceed to scoring.'}</span>
                            </div>
                        )}
                    </div>
                );

            case 'scoring':
                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card highlight">
                                <span className="pdm-info-label">{t('detail.scored') || 'Scored Providers'}</span>
                                <span className="pdm-info-value big" style={{ color: '#10b981' }}>{project.providers_with_scoring.length}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.pending_scoring') || 'Pending Scoring'}</span>
                                <span className="pdm-info-value big" style={{ color: project.providers_without_scoring.length > 0 ? '#f59e0b' : '#10b981' }}>
                                    {project.providers_without_scoring.length}
                                </span>
                            </div>
                        </div>
                        {project.providers_with_scoring.length > 0 && (
                            <div className="pdm-provider-list">
                                {project.providers_with_scoring.map((prov, idx) => (
                                    <div key={prov.name} className="pdm-provider-row">
                                        <span className={`pdm-provider-rank ${idx === 0 ? 'top' : ''}`}>#{idx + 1}</span>
                                        <span className="pdm-provider-name">{prov.name}</span>
                                        <span className={`pdm-score-badge ${prov.score >= 7 ? 'high' : prov.score >= 5 ? 'mid' : 'low'}`}>
                                            {prov.score.toFixed(1)}<span className="pdm-score-max">/10</span>
                                        </span>
                                    </div>
                                ))}
                                {project.providers_without_scoring.map(name => (
                                    <div key={name} className="pdm-provider-row">
                                        <span className="pdm-provider-rank" style={{ opacity: 0.3 }}>—</span>
                                        <span className="pdm-provider-name">{name}</span>
                                        <span className="pdm-tag small missing">{t('detail.pending') || 'Pending'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isCurrent && (
                            <div className="pdm-next-action">
                                <span className="pdm-next-label">{t('detail.next_step') || 'Next step'}:</span>
                                <span>{project.providers_without_scoring.length > 0
                                    ? `${t('detail.scoring_pending') || 'Score remaining providers:'} ${project.providers_without_scoring.join(', ')}`
                                    : t('detail.scoring_done') || 'All providers scored. Review final results.'
                                }</span>
                            </div>
                        )}
                    </div>
                );

            case 'results':
                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card highlight">
                                <span className="pdm-info-label">{t('detail.total_providers') || 'Total Providers Evaluated'}</span>
                                <span className="pdm-info-value big" style={{ color: '#10b981' }}>{project.providers_with_scoring.length}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.total_docs') || 'Total Documents'}</span>
                                <span className="pdm-info-value big">{project.document_count}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.total_reqs') || 'Requirements Analyzed'}</span>
                                <span className="pdm-info-value big">{project.requirement_count}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.total_qa') || 'Q&A Items'}</span>
                                <span className="pdm-info-value big">{project.qa_count}</span>
                            </div>
                        </div>
                        {isCompleted && (
                            <div className="pdm-next-action" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                <span className="pdm-next-label" style={{ color: '#10b981' }}>{t('detail.completed') || 'Completed'}</span>
                                <span>{t('detail.results_done') || 'Evaluation complete. All providers scored and results ready.'}</span>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="pdm-overlay" onClick={onClose}>
            <div className="pdm-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className="pdm-close" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* Header: project name */}
                <div className="pdm-header">
                    <div className="pdm-header-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="pdm-title">{project.display_name}</h2>
                        <span className="pdm-subtitle" style={{ color: getStatusColor(project.status) }}>
                            {t(`status.${project.status || 'setup'}`)}
                        </span>
                    </div>
                </div>

                {/* Stepper timeline */}
                <div className="pdm-stepper">
                    {STEPS.map((step, idx) => {
                        const isCompleted = idx < activeIdx;
                        const isCurrent = idx === activeIdx;
                        const isPending = idx > activeIdx;
                        const isSelected = idx === selectedStep;

                        return (
                            <React.Fragment key={step.key}>
                                {idx > 0 && (
                                    <div className={`pdm-line ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`} />
                                )}
                                <button
                                    className={`pdm-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedStep(idx)}
                                >
                                    <div className="pdm-circle">
                                        {isCompleted ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        ) : (
                                            <StepIcon icon={step.icon} size={16} />
                                        )}
                                    </div>
                                    <span className="pdm-step-label">{t(step.labelKey) || step.fallback}</span>
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Phase detail content */}
                <div className="pdm-content">
                    <div className="pdm-phase-header">
                        <StepIcon icon={STEPS[selectedStep].icon} size={20} />
                        <span>{t(STEPS[selectedStep].labelKey) || STEPS[selectedStep].fallback}</span>
                        {selectedStep < activeIdx && <span className="pdm-badge completed">{t('detail.done') || 'Completed'}</span>}
                        {selectedStep === activeIdx && <span className="pdm-badge current">{t('detail.in_progress') || 'In Progress'}</span>}
                        {selectedStep > activeIdx && <span className="pdm-badge pending">{t('detail.not_started') || 'Not Started'}</span>}
                    </div>
                    {renderPhaseContent(selectedStep)}
                </div>
            </div>
        </div>
    );
};
