import { useState, useMemo, useEffect } from 'react';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { RfqBaseUploader } from './components/upload/RfqBaseUploader';
import { FileUploadZone } from './components/upload/FileUploadZone';
import { ProcessingStatus } from './components/processing/ProcessingStatus';
import { ExternalDataTable } from './components/results/ExternalDataTable';
import { Preloader } from './components/ui/Preloader';
import { useRfqStore } from './stores/useRfqStore';
import { VendorDecisionDashboard } from './components/dashboard/VendorDecisionDashboard';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { ChatPage } from './components/chat/ChatPage';
import { MailDashboard } from './components/mail/MailDashboard';
import { useLanguageStore } from './stores/useLanguageStore';
import { ProgressRing } from './components/charts/ProgressRing';
import { ProviderProgressGrid, ProviderEvaluationData } from './components/charts/ProviderProgressGrid';
import { ProcessingStage } from './types/rfq.types';
import { QAModule } from './components/dashboard/tabs/QAModule';
import { useDashboardStore } from './stores/useDashboardStore';
import { ToastContainer } from './components/common/ToastContainer';
import { useProjectStore } from './stores/useProjectStore';
import { useProviderStore } from './stores/useProviderStore';
import { getProviderDisplayName } from './types/provider.types';


type ViewType = 'home' | 'upload' | 'table' | 'qa' | 'decision' | 'chat' | 'mail';

export default function App() {
  const { selectedFiles, isProcessing, error, processingFileCount, setApplyTableFilters, results, refreshProposalEvaluations, status } = useRfqStore();
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('activeView') as ViewType;
    return saved || 'home';
  });

  // Track clicked provider from the grid (separate from files)
  const [clickedProvider, setClickedProvider] = useState<string>('');

  // Get selected provider - prioritize clicked provider, then fall back to files
  const selectedProvider = useMemo(() => {
    // If a provider was clicked in the grid, use that
    if (clickedProvider) return clickedProvider;
    // Otherwise, get from files being uploaded
    if (selectedFiles.length === 0) return '';
    const providers = selectedFiles
      .map(f => f.metadata.proveedor)
      .filter(Boolean);
    return providers[0] || '';
  }, [clickedProvider, selectedFiles]);

  // Persist activeView state and clear stale errors on navigation
  useMemo(() => {
    localStorage.setItem('activeView', activeView);
  }, [activeView]);

  useEffect(() => {
    // Clear processing error when navigating away from the upload view
    if (error && !isProcessing) {
      useRfqStore.getState().setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const { loadDashboardData } = useDashboardStore();
  const { loadProjects, getActiveProject, activeProjectId } = useProjectStore();
  const { fetchProjectProviders, projectProviders } = useProviderStore();

  // Load projects on app mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Fetch dynamic providers when active project changes
  useEffect(() => {
    if (activeProjectId) {
      fetchProjectProviders(activeProjectId);
    }
  }, [activeProjectId, fetchProjectProviders]);

  useEffect(() => {
    if (activeView === 'qa' || activeView === 'decision') {
      loadDashboardData();
    }
  }, [activeView, loadDashboardData]);

  // Get active project for use throughout the app
  const activeProject = getActiveProject();
  const [uploadTab, setUploadTab] = useState<'rfq' | 'propuestas'>('rfq');
  const { t } = useLanguageStore();
  const [selectedProviderData, setSelectedProviderData] = useState<ProviderEvaluationData | null>(null);

  // Refresh proposal evaluations periodically when in proposals upload tab
  useEffect(() => {
    if (activeView === 'upload' && uploadTab === 'propuestas') {
      const refreshInterval = setInterval(() => {
        refreshProposalEvaluations();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(refreshInterval);
    }
  }, [activeView, uploadTab, refreshProposalEvaluations]);

  // Calculate progress for the selected provider (from files metadata)
  const selectedProviderProgress = useMemo(() => {
    if (!selectedProvider || !results || results.length === 0) {
      return { count: 0, progress: 0 };
    }

    const uniqueEvaluations = new Set<string>();
    results.forEach(result => {
      const providerEval = result.evaluations[selectedProvider];
      if (providerEval && providerEval.hasValue) {
        uniqueEvaluations.add(result.evaluation);
      }
    });

    const count = uniqueEvaluations.size;
    const progressValue = (count / 4) * 100;

    return {
      count,
      progress: Math.min(progressValue, 100)
    };
  }, [selectedProvider, results]);

  // Handle routing logic for the Upload View
  const renderUploadView = () => (
    <div className="card" style={{ minHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '32px' }}>
        <div className="tabs-container" style={{
          background: 'var(--bg-surface-alt)',
          padding: '4px',
          borderRadius: '12px',
          display: 'inline-flex',
          gap: '4px',
          border: '1px solid var(--border-color)',
          alignSelf: 'center',
          marginBottom: '32px'
        }}>
          <button
            className={`tab-btn ${uploadTab === 'rfq' ? 'active' : ''}`}
            onClick={() => setUploadTab('rfq')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            {t('app.upload.tab.rfq')}
          </button>
          <button
            className={`tab-btn ${uploadTab === 'propuestas' ? 'active' : ''}`}
            onClick={() => setUploadTab('propuestas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21"></path>
              <path d="M16 16l-4-4-4 4"></path>
            </svg>
            {t('app.upload.tab.proposals')}
          </button>
        </div>

        {uploadTab === 'rfq' && (
          <div className="fade-in">
            <RfqBaseUploader />
          </div>
        )}

        {uploadTab === 'propuestas' && (
          <div className="fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '32px', width: '100%' }}>
              {/* Left Column - Upload Zone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Instructions */}
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'rgba(18, 181, 176, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(18, 181, 176, 0.15)'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('proposal.upload_title')}
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {t('proposal.upload_subtitle')}
                  </p>
                </div>

                {/* File Upload Zone - modal opens automatically when files are selected */}
                <FileUploadZone compact={true} autoOpenModal={true} />

                {projectProviders.length > 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
                    {t('app.upload.providers_label')}: {projectProviders.map(p => getProviderDisplayName(p)).join(', ')}
                  </p>
                )}

                {/* Error Display */}
                {error && !isProcessing && (
                  <div style={{
                    padding: '16px 20px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid var(--color-error)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'shake 0.5s ease-in-out'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--color-error)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: 'var(--color-error)',
                        marginBottom: '4px'
                      }}>
                        {t('proposal.processing_error')}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                      }}>
                        {error}
                      </div>
                    </div>
                    <button
                      onClick={() => useRfqStore.getState().setError(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                )}

                {/* Processing indicator */}
                {isProcessing && (
                  <div style={{
                    textAlign: 'center',
                    padding: '16px',
                    background: 'rgba(18, 181, 176, 0.08)',
                    borderRadius: '12px',
                    border: '1px solid rgba(18, 181, 176, 0.2)'
                  }}>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--accent)', fontWeight: 500 }}>
                      Processing {processingFileCount} proposal{processingFileCount > 1 ? 's' : ''}...
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Provider Details Visualization */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Large Progress Ring for Selected Provider */}
                {selectedProvider ? (
                  <div style={{
                    background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-alt) 100%)',
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px solid var(--border-color)',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px',
                    height: '100%',
                    justifyContent: 'center'
                  }}>
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {selectedProvider}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Evaluation Progress
                      </p>
                    </div>

                    <ProgressRing
                      progress={selectedProviderData?.progress || selectedProviderProgress.progress}
                      size="large"
                      color="#12b5b0"
                      showPercentage={true}
                    />

                    {/* Evaluation Types Breakdown */}
                    {selectedProviderData && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '12px',
                        width: '100%',
                        maxWidth: '320px'
                      }}>
                        {Object.entries(selectedProviderData.evaluations).map(([evalType, hasEvaluation]) => (
                          <div
                            key={evalType}
                            style={{
                              textAlign: 'center',
                              padding: '12px',
                              background: hasEvaluation ? 'rgba(18, 181, 176, 0.1)' : 'var(--bg-surface)',
                              borderRadius: 'var(--radius-md)',
                              border: hasEvaluation ? '2px solid #12b5b0' : '1px solid var(--border-color)',
                              opacity: hasEvaluation ? 1 : 0.6
                            }}
                          >
                            <div style={{
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              color: hasEvaluation ? '#12b5b0' : 'var(--text-secondary)',
                              marginBottom: '4px'
                            }}>
                              {hasEvaluation ? '✓' : '○'}
                            </div>
                            <div style={{
                              fontSize: '0.7rem',
                              color: hasEvaluation ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: hasEvaluation ? 600 : 400,
                              lineHeight: '1.2'
                            }}>
                              {evalType.replace(' Evaluation', '').replace(' Deliverables', '')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Completed/Remaining Summary */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      width: '100%',
                      maxWidth: '280px'
                    }}>
                      <div style={{
                        textAlign: 'center',
                        padding: '12px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {selectedProviderData?.count || selectedProviderProgress.count}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Completed
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        padding: '12px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {4 - (selectedProviderData?.count || selectedProviderProgress.count)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {t('proposal.remaining')}
                        </div>
                      </div>
                    </div>

                    <p style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-tertiary)',
                      textAlign: 'center',
                      margin: 0,
                      maxWidth: '260px'
                    }}>
                      {t('proposal.upload_hint')}
                    </p>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: '32px',
                    background: 'var(--bg-surface-alt)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-tertiary)',
                    textAlign: 'center'
                  }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <p style={{ margin: 0 }}>{t('proposal.select_provider')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Provider Grid Row */}
            <div style={{
              marginTop: '32px',
              background: 'var(--bg-surface)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('proposal.provider_progress')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {t('proposal.provider_progress_hint')}
                </p>
              </div>

              <ProviderProgressGrid
                selectedProvider={selectedProvider}
                onProviderClick={(provider) => {
                  // When clicking on provider grid, select that provider
                  setClickedProvider(provider);
                }}
                onProviderDataChange={setSelectedProviderData}
              />
            </div>

            {/* Processing Status - Overlay */}
            {(isProcessing || status.stage === ProcessingStage.COMPLETED) && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  animation: 'fadeIn 0.3s ease-out'
                }}
                onClick={(e) => {
                  // Close when clicking on backdrop (not on the modal content)
                  if (e.target === e.currentTarget && status.stage === ProcessingStage.COMPLETED) {
                    useRfqStore.getState().updateStatus({ stage: ProcessingStage.IDLE, message: '', progress: 0 });
                  }
                }}
              >
                <div style={{ maxWidth: '600px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                  <ProcessingStatus
                    onViewResults={() => {
                      useRfqStore.getState().updateStatus({ stage: ProcessingStage.IDLE, message: '', progress: 0 });
                      setActiveView('table');
                      setApplyTableFilters(true);
                    }}
                    onClose={() => {
                      useRfqStore.getState().updateStatus({ stage: ProcessingStage.IDLE, message: '', progress: 0 });
                    }}
                    onCancel={() => {
                      useRfqStore.getState().cancelProcessing();
                      import('./services/n8n.service').then(m => m.cancelRunningN8nExecutions().catch(() => {}));
                    }}
                    onCancelFile={(fileId) => {
                      useRfqStore.getState().cancelFileProcessing(fileId);
                      import('./services/n8n.service').then(m => m.cancelRunningN8nExecutions().catch(() => {}));
                    }}
                  />
                </div>
              </div>
            )}

            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
                20%, 40%, 60%, 80% { transform: translateX(8px); }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Preloader />
      <SidebarLayout activeView={activeView} onNavigate={(view) => setActiveView(view as ViewType)}>

        {activeView === 'home' && <HomeDashboard onNavigate={(view) => setActiveView(view as ViewType)} />}

        {activeView === 'upload' && renderUploadView()}

        {activeView === 'table' && (
          <div className="card" style={{ height: 'calc(100vh - 140px)', padding: 0, overflow: 'hidden' }}>
            <ExternalDataTable />
          </div>
        )}

        {activeView === 'qa' && (
          <div style={{ padding: '24px', overflow: 'auto', height: 'calc(100vh - 140px)' }}>
            <QAModule projectId={activeProject?.display_name || ''} />
          </div>
        )}

        {activeView === 'decision' && <VendorDecisionDashboard />}

        {activeView === 'chat' && <ChatPage />}

        {activeView === 'mail' && <MailDashboard />}

      </SidebarLayout>
      <ToastContainer />
    </>
  );
}
