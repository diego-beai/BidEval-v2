import React, { useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useOnboardingStore } from '../../stores/useOnboardingStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './Tour.css';

interface TourProviderProps {
    onNavigate?: (view: string) => void;
}

export const TourProvider: React.FC<TourProviderProps> = ({ onNavigate: _onNavigate }) => {
    const { isRunning, hasCompletedTour, startTour, completeTour, setStep, currentStep } = useOnboardingStore();
    const { t, language } = useLanguageStore();

    // Auto-start tour on first visit
    useEffect(() => {
        if (!hasCompletedTour) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                startTour();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [hasCompletedTour, startTour]);

    // Navigation logic removed as per user request
    // The tour will now stay on the main dashboard while highlighting sidebar items

    const steps: Step[] = [
        // 0. Welcome
        {
            target: 'body',
            content: (
                <div className="tour-content">
                    <h3>{language === 'es' ? 'Bienvenido a ' : 'Welcome to '}Bid<span style={{ color: '#12b5b0' }}>Eval</span></h3>
                    <p>{t('tour.welcome.description')}</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        // 1. Sidebar overview
        {
            target: '.sidebar',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.sidebar.title')}</h3>
                    <p>{t('tour.sidebar.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 2. Home dashboard
        {
            target: '[data-tour="nav-home"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.home.title')}</h3>
                    <p>{t('tour.home.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 3. Projects list
        {
            target: '[data-tour="nav-projects-status"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.projects_status.title')}</h3>
                    <p>{t('tour.projects_status.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 4. Upload documents
        {
            target: '[data-tour="nav-upload"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.upload.title')}</h3>
                    <p>{t('tour.upload.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 5. Data explorer
        {
            target: '[data-tour="nav-table"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.table.title')}</h3>
                    <p>{t('tour.table.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 6. Q&A
        {
            target: '[data-tour="nav-qa"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.qa.title')}</h3>
                    <p>{t('tour.qa.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 7. Scoring / Decision
        {
            target: '[data-tour="nav-decision"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.decision.title')}</h3>
                    <p>{t('tour.decision.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 8. Economic section
        {
            target: '[data-tour="nav-economic"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.economic.title')}</h3>
                    <p>{t('tour.economic.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 9. Mail
        {
            target: '[data-tour="nav-mail"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.mail.title')}</h3>
                    <p>{t('tour.mail.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 10. AI Chat
        {
            target: '[data-tour="nav-chat"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.chat.title')}</h3>
                    <p>{t('tour.chat.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 11. RFP Generator
        {
            target: '[data-tour="nav-rfp-gen"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.rfp_gen.title')}</h3>
                    <p>{t('tour.rfp_gen.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 12. Supplier directory
        {
            target: '[data-tour="nav-suppliers"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.suppliers.title')}</h3>
                    <p>{t('tour.suppliers.description')}</p>
                </div>
            ),
            placement: 'right',
            disableBeacon: true,
        },
        // 13. Project selector
        {
            target: '[data-tour="project-selector"]',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.project.title')}</h3>
                    <p>{t('tour.project.description')}</p>
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },
        // 14. Header settings
        {
            target: '.header-actions',
            content: (
                <div className="tour-content">
                    <h3>{t('tour.header.title')}</h3>
                    <p>{t('tour.header.description')}</p>
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },
        // 15. Finish
        {
            target: 'body',
            content: (
                <div className="tour-content tour-final">
                    <h3>{t('tour.finish.title')}</h3>
                    <p>{t('tour.finish.description')}</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, action, index, type } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            completeTour();
        } else if (action === ACTIONS.CLOSE) {
            completeTour();
        } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            setStep(index + 1);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={isRunning}
            continuous
            showProgress
            showSkipButton
            stepIndex={currentStep}
            callback={handleJoyrideCallback}
            scrollToFirstStep
            disableOverlayClose
            spotlightClicks={false}
            locale={{
                back: t('tour.btn.back'),
                close: t('tour.btn.close'),
                last: t('tour.btn.finish'),
                next: t('tour.btn.next'),
                skip: t('tour.btn.skip'),
            }}
            styles={{
                options: {
                    arrowColor: 'var(--bg-surface)',
                    backgroundColor: 'var(--bg-surface)',
                    overlayColor: 'rgba(0, 0, 0, 0.75)',
                    primaryColor: '#12b5b0',
                    textColor: 'var(--text-primary)',
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: '12px',
                    padding: '0',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                tooltipContent: {
                    padding: '20px 24px 16px',
                },
                tooltipTitle: {
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '8px',
                },
                tooltipFooter: {
                    padding: '12px 24px 20px',
                    marginTop: 0,
                },
                buttonNext: {
                    backgroundColor: '#12b5b0',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '10px 20px',
                    outline: 'none',
                },
                buttonBack: {
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginRight: '8px',
                },
                buttonSkip: {
                    color: 'var(--text-tertiary)',
                    fontSize: '13px',
                },
                buttonClose: {
                    color: 'var(--text-secondary)',
                },
                spotlight: {
                    borderRadius: '12px',
                },
                overlay: {
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                },
            }}
            floaterProps={{
                disableAnimation: true,
            }}
            disableScrolling={true}
        />
    );
};

// Component to restart tour from settings or help
export const TourRestartButton: React.FC = () => {
    const { resetTour, startTour } = useOnboardingStore();
    const { t } = useLanguageStore();

    const handleRestart = () => {
        resetTour();
        setTimeout(() => startTour(), 100);
    };

    return (
        <button
            onClick={handleRestart}
            className="tour-restart-btn"
            title={t('tour.btn.restart')}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{t('tour.btn.restart')}</span>
        </button>
    );
};
