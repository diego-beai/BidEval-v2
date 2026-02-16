import React, { useEffect } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { Project } from '../../stores/useProjectStore';
import { useQAStore } from '../../stores/useQAStore';
import './ProjectProgressStepper.css';

interface ProjectProgressStepperProps {
    project: Project;
    onClick?: () => void;
    /** 'full' = horizontal stepper with circles & labels (header). 'compact' = small badge with dot + label. */
    variant?: 'full' | 'compact';
}

// SVG icon paths for each step (Lucide-style, viewBox 0 0 24 24)
const STEP_ICONS: Record<string, React.ReactNode> = {
    bid: ( // clipboard-list
        <>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
        </>
    ),
    rfp: ( // file-text
        <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </>
    ),
    proposals: ( // inbox
        <>
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </>
    ),
    qa: ( // message-circle — Q&A audit towards supplier proposals
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
    scoring: ( // bar-chart-2
        <>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </>
    ),
    results: ( // award/trophy
        <>
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </>
    ),
};

// 6 visual phases
const STEPS = [
    { key: 'bid', labelKey: 'stepper.bid', fallback: 'BID' },
    { key: 'rfp', labelKey: 'stepper.rfp', fallback: 'RFP' },
    { key: 'proposals', labelKey: 'stepper.proposals', fallback: 'Proposals' },
    { key: 'qa', labelKey: 'stepper.qa', fallback: 'Q&A' },
    { key: 'scoring', labelKey: 'stepper.scoring', fallback: 'Scoring' },
    { key: 'results', labelKey: 'stepper.results', fallback: 'Results' },
];

/**
 * Maps backend statuses to visual step index (6 steps now).
 * setup             → 0  (BID)
 * extracting        → 1  (RFP)
 * waiting_proposals → 2  (Proposals)
 * evaluation        → 4  (Scoring)
 * completed         → 6  (all done)
 */
function getActiveStepIndex(status: string): number {
    switch (status) {
        case 'extracting': return 1;
        case 'waiting_proposals': return 2;
        case 'evaluation': return 4;
        case 'completed': return 6;
        default: return 0;
    }
}

const STATUS_COLORS: Record<string, string> = {
    setup: '#94a3b8',
    extracting: '#fbbf24',
    waiting_proposals: '#f59e0b',
    evaluation: '#06b6d4',
    completed: '#10b981',
};

function getStatusColor(status: string): string {
    return STATUS_COLORS[status?.toLowerCase()] || '#94a3b8';
}

// Terminal Q&A states — question is fully resolved
const QA_TERMINAL_STATES = new Set(['Resolved', 'Discarded']);

export const ProjectProgressStepper: React.FC<ProjectProgressStepperProps> = ({
    project,
    onClick,
    variant = 'full',
}) => {
    const { t } = useLanguageStore();
    const questions = useQAStore(s => s.questions);
    const loadQuestions = useQAStore(s => s.loadQuestions);
    const status = project.status || 'setup';
    const activeIdx = getActiveStepIndex(status);

    // Ensure Q&A questions are loaded for the current project
    useEffect(() => {
        if (project.id) {
            loadQuestions(project.id);
        }
    }, [project.id, loadQuestions]);

    // Q&A completion logic:
    // - Has questions → completed only if ALL are Resolved/Discarded
    // - No questions + project past Q&A phase → completed (skipped)
    // - No questions + project at/before Q&A → not completed yet
    const QA_STEP_INDEX = STEPS.findIndex(s => s.key === 'qa');
    const projectQuestions = questions.filter(q =>
        (q.project_id || q.project_name) === project.id
    );
    const qaCompleted = projectQuestions.length > 0
        ? projectQuestions.every(q => QA_TERMINAL_STATES.has(q.status || q.estado || ''))
        : activeIdx > QA_STEP_INDEX;

    // Compact variant: colored badge with dot + current step label
    if (variant === 'compact') {
        const color = getStatusColor(status);
        const currentStep = STEPS[Math.min(activeIdx, STEPS.length - 1)];
        const label = t(currentStep.labelKey) || currentStep.fallback;

        return (
            <div
                className="progress-stepper-compact"
                onClick={onClick}
                style={{
                    '--status-color': color,
                } as React.CSSProperties}
                title={t('projects.progress')}
            >
                <div className="compact-dot" />
                <span className="compact-label">{label}</span>
            </div>
        );
    }

    // Full variant: horizontal stepper with circles and labels
    return (
        <div className="progress-stepper" onClick={onClick} title={t('projects.progress')}>
            {STEPS.map((step, idx) => {
                // Q&A step: completed only when all questions are resolved/discarded
                const isCompleted = step.key === 'qa'
                    ? qaCompleted
                    : idx < activeIdx;
                const isCurrent = step.key === 'qa'
                    ? (idx <= activeIdx && !qaCompleted)
                    : idx === activeIdx;

                return (
                    <React.Fragment key={step.key}>
                        {idx > 0 && (
                            <div className={`stepper-line ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`} />
                        )}

                        <div className={`stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${!isCompleted && !isCurrent ? 'pending' : ''}`}>
                            <div className="stepper-circle">
                                <svg className="stepper-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    {STEP_ICONS[step.key]}
                                </svg>
                            </div>
                            <span className="stepper-label">{t(step.labelKey) || step.fallback}</span>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};
