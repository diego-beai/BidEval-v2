import React from 'react';
import { Check, Circle, Clock, CalendarClock } from 'lucide-react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import type { ProjectMilestone } from '../../stores/useProjectStore';
import './MilestoneTimeline.css';

interface MilestoneTimelineProps {
    milestones: ProjectMilestone[];
}

/**
 * Determines milestone status relative to today.
 * Returns 'completed' | 'current' | 'upcoming'.
 */
function getMilestoneStatus(
    milestone: ProjectMilestone,
    _index: number,
    milestones: ProjectMilestone[]
): 'completed' | 'current' | 'upcoming' {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = milestone.dueDate ? new Date(milestone.dueDate) : null;
    if (dueDate) dueDate.setHours(0, 0, 0, 0);

    // If no due date, treat as upcoming
    if (!dueDate) return 'upcoming';

    // Past milestone
    if (dueDate < today) return 'completed';

    // Check if this is the closest future milestone (current)
    const futureMilestones = milestones
        .filter(m => {
            if (!m.dueDate) return false;
            const d = new Date(m.dueDate);
            d.setHours(0, 0, 0, 0);
            return d >= today;
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (futureMilestones.length > 0 && futureMilestones[0].id === milestone.id) {
        return 'current';
    }

    return 'upcoming';
}

/**
 * Formats a date string to a readable short format.
 */
function formatDate(dateStr: string, language: 'es' | 'en'): string {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ milestones }) => {
    const { t, language } = useLanguageStore();

    // Return null if no milestones configured
    if (!milestones || milestones.length === 0) return null;

    return (
        <div className="milestone-timeline">
            <div className="milestone-timeline-header">
                <div className="milestone-timeline-icon">
                    <CalendarClock size={20} />
                </div>
                <h3 className="milestone-timeline-title">
                    {t('milestone.timeline_title')}
                </h3>
            </div>

            <div className="milestone-track">
                {milestones.map((milestone, index) => {
                    const status = getMilestoneStatus(milestone, index, milestones);
                    const statusClass =
                        status === 'completed' ? 'is-completed' :
                        status === 'current' ? 'is-current' :
                        'is-upcoming';

                    const statusLabel =
                        status === 'completed' ? t('milestone.completed') :
                        status === 'current' ? t('milestone.current') :
                        t('milestone.upcoming');

                    return (
                        <div
                            key={milestone.id}
                            className={`milestone-step ${statusClass}`}
                        >
                            <div className="milestone-dot">
                                {status === 'completed' && <Check size={16} strokeWidth={3} />}
                                {status === 'current' && <Clock size={16} strokeWidth={2.5} />}
                                {status === 'upcoming' && <Circle size={12} strokeWidth={2} />}
                            </div>

                            <div className="milestone-info">
                                <div className="milestone-name" title={milestone.name}>
                                    {milestone.name}
                                </div>
                                <div className="milestone-date">
                                    {milestone.dueDate
                                        ? formatDate(milestone.dueDate, language)
                                        : t('milestone.no_date')
                                    }
                                </div>
                                <div className="milestone-status">
                                    {statusLabel}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
