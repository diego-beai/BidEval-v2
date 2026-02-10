import React from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { Project } from '../../stores/useProjectStore';
import './ProjectProgressStepper.css';

interface ProjectProgressStepperProps {
    project: Project;
    onClick?: () => void;
    /** 'full' = horizontal stepper with circles & labels (header). 'compact' = small badge with dot + label. */
    variant?: 'full' | 'compact';
}

// 7 visual phases matching the modal stepper
const STEPS = [
    { key: 'bid', labelKey: 'stepper.bid', fallback: 'BID' },
    { key: 'rfp', labelKey: 'stepper.rfp', fallback: 'RFP' },
    { key: 'qa', labelKey: 'stepper.qa', fallback: 'Q&A' },
    { key: 'proposals', labelKey: 'stepper.proposals', fallback: 'Proposals' },
    { key: 'audit', labelKey: 'stepper.audit', fallback: 'Audit' },
    { key: 'scoring', labelKey: 'stepper.scoring', fallback: 'Scoring' },
    { key: 'results', labelKey: 'stepper.results', fallback: 'Results' },
];

/**
 * Maps 5 backend statuses to 7 visual step index.
 * setup             → 0  (BID)
 * extracting        → 1  (RFP)
 * waiting_proposals → 3  (Proposals)
 * evaluation        → 5  (Scoring)
 * completed         → 7  (all done)
 */
function getActiveStepIndex(status: string): number {
    switch (status) {
        case 'extracting': return 1;
        case 'waiting_proposals': return 3;
        case 'evaluation': return 5;
        case 'completed': return 7;
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

export const ProjectProgressStepper: React.FC<ProjectProgressStepperProps> = ({
    project,
    onClick,
    variant = 'full',
}) => {
    const { t } = useLanguageStore();
    const status = project.status || 'setup';
    const activeIdx = getActiveStepIndex(status);

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
                const isCompleted = idx < activeIdx;
                const isCurrent = idx === activeIdx;

                return (
                    <React.Fragment key={step.key}>
                        {idx > 0 && (
                            <div className={`stepper-line ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`} />
                        )}

                        <div className={`stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${!isCompleted && !isCurrent ? 'pending' : ''}`}>
                            <div className="stepper-circle">
                                {isCompleted ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <span className="stepper-number">{idx + 1}</span>
                                )}
                            </div>
                            <span className="stepper-label">{t(step.labelKey) || step.fallback}</span>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};
