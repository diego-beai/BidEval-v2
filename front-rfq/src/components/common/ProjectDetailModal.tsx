import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { ALL_EVAL_TYPES, Project, useProjectStore } from '../../stores/useProjectStore';
import { useQAStore } from '../../stores/useQAStore';
import { useScoringStore } from '../../stores/useScoringStore';
import { useScoringConfigStore } from '../../stores/useScoringConfigStore';
import { useRfqStore } from '../../stores/useRfqStore';
import './ProjectDetailModal.css';

interface ProjectDetailModalProps {
    project: Project;
    onClose: () => void;
}

const DEADLINE_FIELDS = [
    { key: 'date_opening' as const, labelKey: 'detail.timeline.opening', color: '#3b82f6' },
    { key: 'date_submission_deadline' as const, labelKey: 'detail.timeline.submission', color: '#f59e0b' },
    { key: 'date_questions_deadline' as const, labelKey: 'detail.timeline.questions', color: '#f59e0b' },
    { key: 'date_questions_response' as const, labelKey: 'detail.timeline.responses', color: '#f59e0b' },
    { key: 'date_evaluation' as const, labelKey: 'detail.timeline.evaluation', color: '#12b5b0' },
    { key: 'date_award' as const, labelKey: 'detail.timeline.award', color: '#22c55e' },
];

function formatDateShort(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getDeadlineUrgency(dateStr: string | null | undefined): { level: 'overdue' | 'critical' | 'warning' | 'normal' | 'past'; daysLeft: number } | null {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { level: 'overdue', daysLeft: diff };
    if (diff <= 3) return { level: 'critical', daysLeft: diff };
    if (diff <= 7) return { level: 'warning', daysLeft: diff };
    return { level: 'normal', daysLeft: diff };
}

const STEPS = [
    { key: 'bid', labelKey: 'stepper.bid', fallback: 'BID', icon: 'folder' },
    { key: 'rfp', labelKey: 'stepper.rfp', fallback: 'RFP', icon: 'file' },
    { key: 'proposals', labelKey: 'stepper.proposals', fallback: 'Proposals', icon: 'upload' },
    { key: 'qa', labelKey: 'stepper.qa', fallback: 'Q&A', icon: 'help' },
    { key: 'scoring', labelKey: 'stepper.scoring', fallback: 'Scoring', icon: 'chart' },
    { key: 'results', labelKey: 'stepper.results', fallback: 'Results', icon: 'trophy' },
];

function getActiveStepIndex(status: string): number {
    switch (status) {
        case 'extracting': return 1;
        case 'waiting_proposals': return 2;
        case 'evaluation': return 4;
        case 'completed': return 6;
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

// Terminal Q&A states (same as ProjectProgressStepper)
const QA_TERMINAL_STATES = new Set(['Resolved', 'Discarded']);

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project: projectProp, onClose }) => {
    const { t } = useLanguageStore();
    const safeT = (key: string, fallback: string) => {
        const value = t(key);
        return !value || value === key ? fallback : value;
    };
    const activeProjectId = useProjectStore(s => s.activeProjectId);
    const questions = useQAStore(s => s.questions);
    const loadQuestions = useQAStore(s => s.loadQuestions);
    const loadProjects = useProjectStore(s => s.loadProjects);
    const storeProjects = useProjectStore(s => s.projects);

    // Scoring data - same source as dashboard
    const { scoringResults, refreshScoring, customWeights } = useScoringStore();
    const {
        categories: dynamicCategories,
        hasConfiguration,
        loadConfiguration: loadScoringConfiguration
    } = useScoringConfigStore();
    const { proposalEvaluations, fetchProposalEvaluations, fetchProviderRanking } = useRfqStore();

    // Use refreshed data from store if available, fallback to prop
    const project = storeProjects.find(p => p.id === projectProp.id) || projectProp;

    const scoringCriteria = useMemo(() => {
        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            const criteria: Array<{ id: string; weight: number }> = [];
            categories.forEach((cat) => {
                if (!cat || !cat.name) return;
                const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
                const criteriaSum = catCriteria.reduce((s, c) => s + (c.weight || 0), 0);
                const isRelative = catCriteria.length > 0 && Math.abs(criteriaSum - 100) < 1;
                catCriteria.forEach((crit) => {
                    if (!crit || !crit.name) return;
                    const actualWeight = isRelative
                        ? ((crit.weight || 0) * (cat.weight || 0)) / 100
                        : (crit.weight || 0);
                    criteria.push({ id: String(crit.name), weight: parseFloat(actualWeight.toFixed(2)) });
                });
            });
            return criteria;
        }
        return [
            { id: 'scope_facilities', weight: 10 },
            { id: 'scope_work', weight: 10 },
            { id: 'deliverables_quality', weight: 10 },
            { id: 'total_price', weight: 15 },
            { id: 'price_breakdown', weight: 8 },
            { id: 'optionals_included', weight: 7 },
            { id: 'capex_opex_methodology', weight: 5 },
            { id: 'schedule', weight: 8 },
            { id: 'resources_allocation', weight: 6 },
            { id: 'exceptions', weight: 6 },
            { id: 'safety_studies', weight: 8 },
            { id: 'regulatory_compliance', weight: 7 },
        ];
    }, [hasConfiguration, dynamicCategories]);

    // Derive scoring data from the same recalculation logic used in ScoringMatrix
    const scoringProviders = useMemo(() => {
        if (!scoringResults?.ranking || scoringResults.ranking.length === 0) return null;
        return scoringResults.ranking
            .map((provider) => {
                const individualScores = provider.individual_scores || {};
                const recalculatedOverall = scoringCriteria.reduce((total, criterion) => {
                    const score = individualScores[criterion.id] || 0;
                    const weight = customWeights[criterion.id] ?? criterion.weight ?? 0;
                    return total + (score * weight / 100);
                }, 0);
                const dbOverall = Number(provider.overall_score || 0);
                const normalizedDbOverall = dbOverall > 10 ? dbOverall / 10 : dbOverall;
                const finalScore = recalculatedOverall > 0 ? recalculatedOverall : normalizedDbOverall;
                return {
                    name: provider.provider_name,
                    score: finalScore,
                    compliance: provider.compliance_percentage
                };
            })
            .sort((a, b) => b.score - a.score)
            .map(r => ({ ...r, score: Number(r.score.toFixed(2)) }));
    }, [scoringResults, customWeights, scoringCriteria]);

    const proposalEvaluationsForProject = useMemo(() => {
        if (!proposalEvaluations || proposalEvaluations.length === 0) return [];
        return proposalEvaluations.filter((item: any) => item.project_id === project.id);
    }, [proposalEvaluations, project.id]);

    // Count proposals as unique documents (not expanded evaluation rows)
    const liveProposalCount = useMemo(() => {
        if (proposalEvaluationsForProject.length === 0) return null;
        const uniqueDocIds = new Set<string>();
        proposalEvaluationsForProject.forEach((item: any) => {
            const key = item.file_id || item.id;
            if (key) uniqueDocIds.add(String(key));
        });
        return uniqueDocIds.size;
    }, [proposalEvaluationsForProject]);

    // Count unique providers from proposalEvaluations (project-scoped)
    const liveProviderNames = useMemo(() => {
        if (proposalEvaluationsForProject.length === 0) return null;
        const names = new Set<string>();
        proposalEvaluationsForProject.forEach((item: any) => {
            if (item.provider_name) names.add(item.provider_name);
        });
        return Array.from(names);
    }, [proposalEvaluationsForProject]);

    const activeIdx = getActiveStepIndex(project.status || 'setup');
    const [selectedStep, setSelectedStep] = useState(Math.min(activeIdx, STEPS.length - 1));

    // Update selected step when project status changes after refresh
    useEffect(() => {
        const newActiveIdx = getActiveStepIndex(project.status || 'setup');
        setSelectedStep(Math.min(newActiveIdx, STEPS.length - 1));
    }, [project.status]);

    // Refresh all data sources when modal opens (same as dashboard)
    useEffect(() => {
        if (projectProp.id) {
            loadProjects();
            loadQuestions(projectProp.id);
            loadScoringConfiguration(projectProp.id);
            refreshScoring(projectProp.id);
            fetchProposalEvaluations(projectProp.id);
            fetchProviderRanking(projectProp.id);
        }
    }, [
        projectProp.id,
        loadProjects,
        loadQuestions,
        loadScoringConfiguration,
        refreshScoring,
        fetchProposalEvaluations,
        fetchProviderRanking
    ]);

    // Q&A completion logic (mirrors ProjectProgressStepper)
    const QA_STEP_INDEX = STEPS.findIndex(s => s.key === 'qa');
    const projectQuestions = questions.filter(q =>
        (q.project_id || q.project_name) === project.id
    );
    const qaCompleted = projectQuestions.length > 0
        ? projectQuestions.every(q => QA_TERMINAL_STATES.has(q.status || q.estado || ''))
        : activeIdx > QA_STEP_INDEX;

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
        // Q&A-aware completion logic (same as stepper)
        const isCompleted = step.key === 'qa'
            ? qaCompleted
            : stepIdx < activeIdx;
        const isCurrent = step.key === 'qa'
            ? (stepIdx <= activeIdx && !qaCompleted)
            : stepIdx === activeIdx;
        const isPending = !isCompleted && !isCurrent;

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
                                <span className="pdm-info-label">{t('detail.rfq_docs', { type: project.project_type || 'RFP' }) || 'Documents'}</span>
                                <span className="pdm-info-value big">{project.rfq_count}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.requirements') || 'Requirements Extracted'}</span>
                                <span className="pdm-info-value big">{project.requirement_count}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.types_covered') || 'Types Covered'}</span>
                                <span className="pdm-info-value">{project.rfq_types_covered.length} / {ALL_EVAL_TYPES.length}</span>
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

            case 'proposals': {
                // Use live data from rfqStore if available, fallback to project store
                const proposalCount = liveProposalCount ?? project.proposal_count;
                const qualifyingCount = liveProviderNames ? liveProviderNames.length : project.qualifying_providers;

                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card highlight">
                                <span className="pdm-info-label">{t('detail.proposals_received') || 'Proposals Received'}</span>
                                <span className="pdm-info-value big">{proposalCount}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.providers_qualified') || 'Qualified Providers'}</span>
                                <span className="pdm-info-value big">{qualifyingCount}</span>
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
                                <span>{qualifyingCount < 2
                                    ? t('detail.proposals_need_more') || 'Need at least 2 fully qualified providers to proceed.'
                                    : t('detail.proposals_ready') || 'Providers ready. Proceed to audit & scoring.'
                                }</span>
                            </div>
                        )}
                    </div>
                );
            }

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

            case 'scoring': {
                // Only trust live scoring when modal is showing the active project
                const useLiveScoring = project.id === activeProjectId;
                const liveScoring = useLiveScoring ? scoringProviders : null;
                const scored = liveScoring ?? project.providers_with_scoring.map(p => ({ ...p, compliance: 0 }));
                const pendingScoring = liveScoring
                    ? project.providers_without_scoring.filter(name =>
                        !liveScoring.some(sp => sp.name.toUpperCase() === name.toUpperCase()))
                    : project.providers_without_scoring;
                const avgCompliance = scored.length > 0
                    ? scored.reduce((sum, p) => sum + (p.compliance || 0), 0) / scored.length
                    : 0;

                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card highlight">
                                <span className="pdm-info-label">{t('detail.scored') || 'Scored Providers'}</span>
                                <span className="pdm-info-value big" style={{ color: '#10b981' }}>{scored.length}</span>
                            </div>
                            <div className="pdm-info-card">
                                <span className="pdm-info-label">{t('detail.pending_scoring') || 'Pending Scoring'}</span>
                                <span className="pdm-info-value big" style={{ color: pendingScoring.length > 0 ? '#f59e0b' : '#10b981' }}>
                                    {pendingScoring.length}
                                </span>
                            </div>
                            {avgCompliance > 0 && (
                                <div className="pdm-info-card">
                                    <span className="pdm-info-label">{safeT('detail.compliance', 'Avg. Compliance')}</span>
                                    <span className="pdm-info-value big" style={{ color: avgCompliance >= 70 ? '#10b981' : '#f59e0b' }}>
                                        {avgCompliance.toFixed(0)}%
                                    </span>
                                </div>
                            )}
                        </div>
                        {scored.length > 0 && (
                            <div className="pdm-provider-list">
                                {scored.map((prov, idx) => (
                                    <div key={prov.name} className="pdm-provider-row">
                                        <span className={`pdm-provider-rank ${idx === 0 ? 'top' : ''}`}>#{idx + 1}</span>
                                        <span className="pdm-provider-name">{prov.name}</span>
                                        <span className={`pdm-score-badge ${prov.score >= 7 ? 'high' : prov.score >= 5 ? 'mid' : 'low'}`}>
                                            {prov.score.toFixed(1)}<span className="pdm-score-max">/10</span>
                                        </span>
                                    </div>
                                ))}
                                {pendingScoring.map(name => (
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
                                <span>{pendingScoring.length > 0
                                    ? `${t('detail.scoring_pending') || 'Score remaining providers:'} ${pendingScoring.join(', ')}`
                                    : t('detail.scoring_done') || 'All providers scored. Review final results.'
                                }</span>
                            </div>
                        )}
                    </div>
                );
            }

            case 'results': {
                const resultsScoredCount = scoringProviders ? scoringProviders.length : project.providers_with_scoring.length;
                return (
                    <div className="pdm-phase-content">
                        <div className="pdm-info-grid">
                            <div className="pdm-info-card highlight">
                                <span className="pdm-info-label">{t('detail.total_providers') || 'Total Providers Evaluated'}</span>
                                <span className="pdm-info-value big" style={{ color: '#10b981' }}>{resultsScoredCount}</span>
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
            }

            default:
                return null;
        }
    };

    return createPortal(
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

                        {/* Metadata chips */}
                        {(project.project_type || project.reference_code || project.owner_name || (project.currency && project.currency !== 'EUR')) && (
                            <div className="pdm-meta-chips">
                                {project.project_type && (
                                    <span className="pdm-meta-chip type">{project.project_type}</span>
                                )}
                                {project.reference_code && (
                                    <span className="pdm-meta-chip ref">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        {project.reference_code}
                                    </span>
                                )}
                                {project.owner_name && (
                                    <span className="pdm-meta-chip owner">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        {project.owner_name}
                                    </span>
                                )}
                                {project.currency && project.currency !== 'EUR' && (
                                    <span className="pdm-meta-chip">{project.currency}</span>
                                )}
                            </div>
                        )}

                        {/* Description */}
                        {project.description && (
                            <p className="pdm-description">{project.description}</p>
                        )}
                    </div>
                </div>

                {/* Deadline timeline strip */}
                {(() => {
                    const filledDeadlines = DEADLINE_FIELDS.filter(f => !!(project as any)[f.key]);
                    if (filledDeadlines.length === 0) return null;

                    // Find the next upcoming deadline for urgency indicator
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    let nearestIdx = -1;
                    let nearestDiff = Infinity;
                    DEADLINE_FIELDS.forEach((f, idx) => {
                        const val = (project as any)[f.key];
                        if (!val) return;
                        const d = new Date(val);
                        d.setHours(0, 0, 0, 0);
                        const diff = d.getTime() - now.getTime();
                        // Find the closest future or most recent past deadline
                        if (diff >= 0 && diff < nearestDiff) {
                            nearestDiff = diff;
                            nearestIdx = idx;
                        }
                    });
                    // If all are in the past, find the most recent one
                    if (nearestIdx === -1) {
                        let maxPast = -Infinity;
                        DEADLINE_FIELDS.forEach((f, idx) => {
                            const val = (project as any)[f.key];
                            if (!val) return;
                            const d = new Date(val);
                            d.setHours(0, 0, 0, 0);
                            const diff = d.getTime() - now.getTime();
                            if (diff < 0 && diff > maxPast) {
                                maxPast = diff;
                                nearestIdx = idx;
                            }
                        });
                    }

                    return (
                        <div className="pdm-timeline-strip">
                            {DEADLINE_FIELDS.map((field, idx) => {
                                const dateVal = (project as any)[field.key] as string | null;
                                const formatted = formatDateShort(dateVal);
                                const urgency = getDeadlineUrgency(dateVal);
                                const isPast = urgency && (urgency.level === 'overdue');
                                const isDimmed = !dateVal;
                                const isNearest = idx === nearestIdx;
                                const showUrgency = isNearest && urgency && urgency.level !== 'normal';

                                return (
                                    <React.Fragment key={field.key}>
                                        {idx > 0 && (
                                            <div className={`pdm-timeline-connector ${isDimmed ? 'dimmed' : ''} ${isPast ? 'past' : ''}`}
                                                 style={!isDimmed && !isPast ? { background: field.color } : undefined} />
                                        )}
                                        <div className={`pdm-timeline-node ${isDimmed ? 'dimmed' : ''} ${isPast ? 'past' : ''}`}>
                                            <div className={`pdm-timeline-dot ${isDimmed ? 'dimmed' : ''} ${isPast ? 'past' : ''}`}
                                                 style={!isDimmed ? { borderColor: field.color, background: isPast ? 'transparent' : field.color } : undefined}>
                                                {isPast && !isDimmed && (
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={field.color} strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                                                )}
                                            </div>
                                            <span className="pdm-timeline-label">{t(field.labelKey)}</span>
                                            <span className={`pdm-timeline-date ${isPast ? 'past' : ''}`}
                                                  style={!isDimmed && !isPast ? { color: field.color } : undefined}>
                                                {formatted || '—'}
                                            </span>
                                            {showUrgency && (
                                                <span className={`pdm-timeline-urgency ${urgency!.level}`}>
                                                    {urgency!.level === 'overdue'
                                                        ? t('detail.timeline.overdue')
                                                        : `${urgency!.daysLeft}${t('detail.timeline.days_short')}`}
                                                </span>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* Stepper timeline */}
                <div className="pdm-stepper">
                    {STEPS.map((step, idx) => {
                        // Q&A step: completed only when all questions are resolved/discarded (mirrors header)
                        const isCompleted = step.key === 'qa'
                            ? qaCompleted
                            : idx < activeIdx;
                        const isCurrent = step.key === 'qa'
                            ? (idx <= activeIdx && !qaCompleted)
                            : idx === activeIdx;
                        const isPending = !isCompleted && !isCurrent;
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
        </div>,
        document.body
    );
};
