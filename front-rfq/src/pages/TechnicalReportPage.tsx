import React, { lazy, Suspense } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import './TechnicalReportPage.css';

const BoardReport = lazy(() => import('../components/dashboard/tabs/BoardReport'));

export const TechnicalReportPage: React.FC = () => {
  const { t } = useLanguageStore();
  const { activeProjectId } = useProjectStore();

  if (!activeProjectId) {
    return (
      <div className="report-page">
        <div className="report-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>{t('report.select_project')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <Suspense fallback={
        <div className="report-empty-state">
          <span>{t('report.loading')}</span>
        </div>
      }>
        <BoardReport />
      </Suspense>
    </div>
  );
};

export default TechnicalReportPage;
