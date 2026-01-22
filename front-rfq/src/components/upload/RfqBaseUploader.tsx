import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRfqStore } from '../../stores/useRfqStore';
import { useRfqBaseProcessing } from '../../hooks/useRfqBaseProcessing';
import { API_CONFIG } from '../../config/constants';
import { RfqBaseProcessingStatus } from '../processing/RfqBaseProcessingStatus';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { DonutChart, DonutChartData } from '../charts/DonutChart';
import { EvaluationStats } from '../charts/EvaluationStats';

export function RfqBaseUploader() {
  const {
    rfqBase,
    isProcessingRfqBase,
    rfqBaseError,
    clearRfqBase,
    setRfqBaseError,
    selectedRfqBaseFiles,
    setSelectedRfqBaseFiles,
    clearSelectedRfqBaseFiles,
    tableData,
    fetchAllTableData
  } = useRfqStore();
  const { t } = useLanguageStore();

  const { handleRfqBaseUpload } = useRfqBaseProcessing();
  const [showConfirm, setShowConfirm] = useState(false);
  const [processingFileCount, setProcessingFileCount] = useState(0);
  const [showFileList, setShowFileList] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Function to compute dashboard stats from tableData (rfq_items_master)
  const dashboardStats = useMemo(() => {
    if (!tableData || tableData.length === 0) {
      return { totalDocuments: 0, evaluationTypeCounts: {} };
    }

    // Map to track which projects have each evaluation type
    const projectsByEvalType: Record<string, Set<string>> = {};
    const uniqueProjects = new Set<string>();

    // Map database evaluation values to display names
    const evaluationTypeMap: Record<string, string> = {
      'Technical Evaluation': 'Technical Evaluation',
      'Economical Evaluation': 'Economical Evaluation',
      'Pre-FEED Deliverables': 'Pre-FEED Deliverables',
      'FEED Deliverables': 'FEED Deliverables',
      // Add possible variations
      'technical': 'Technical Evaluation',
      'economical': 'Economical Evaluation',
      'pre-feed': 'Pre-FEED Deliverables',
      'feed': 'FEED Deliverables',
      'Technical': 'Technical Evaluation',
      'Economical': 'Economical Evaluation',
      'Pre-FEED': 'Pre-FEED Deliverables',
      'FEED': 'FEED Deliverables'
    };

    tableData.forEach((item: any) => {
      const projectName = item.project_name;

      // Track unique projects
      if (projectName) {
        uniqueProjects.add(projectName);
      }

      // Count unique documents per evaluation type
      const evalType = item.evaluation_type || item.evaluation;
      if (evalType && typeof evalType === 'string' && projectName) {
        // Normalize the evaluation type name
        const normalizedType = evaluationTypeMap[evalType] || evalType;

        // Initialize Set if not exists
        if (!projectsByEvalType[normalizedType]) {
          projectsByEvalType[normalizedType] = new Set();
        }

        // Add project to this evaluation type's set
        projectsByEvalType[normalizedType].add(projectName);
      }
    });

    // Convert Sets to counts
    const evaluationTypeCounts: Record<string, number> = {};
    Object.entries(projectsByEvalType).forEach(([evalType, projects]) => {
      evaluationTypeCounts[evalType] = projects.size;
    });

    return {
      totalDocuments: uniqueProjects.size,
      evaluationTypeCounts
    };
  }, [tableData]);

  // Function to refresh data from the store
  const loadDashboardStats = useCallback(async () => {
    setIsRefreshingStats(true);
    try {
      await fetchAllTableData();
    } catch (err) {
      console.error('Error refreshing dashboard stats:', err);
    } finally {
      setIsRefreshingStats(false);
    }
  }, [fetchAllTableData]);

  // Load dashboard stats on component mount and set up periodic refresh
  useEffect(() => {
    // Always load dashboard stats on mount, regardless of rfqBase state
    loadDashboardStats();

    // Set up periodic refresh every 30 seconds to keep dashboard updated
    const interval = setInterval(() => {
      loadDashboardStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loadDashboardStats]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      // Validar tamaños
      const invalidFiles = acceptedFiles.filter(file => file.size > API_CONFIG.MAX_FILE_SIZE);

      if (invalidFiles.length > 0) {
        setRfqBaseError(`${invalidFiles.length} ${t('upload.error.file_size')} ${API_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }

      setSelectedRfqBaseFiles(acceptedFiles);
      setRfqBaseError(null);

      // Si ya hay una RFQ cargada, pedir confirmación
      if (rfqBase) {
        setShowConfirm(true);
      }
    }
  }, [rfqBase, setRfqBaseError, setSelectedRfqBaseFiles, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': API_CONFIG.ALLOWED_EXTENSIONS
    },
    multiple: true,
    disabled: isProcessingRfqBase
  });

  const handleUpload = async () => {
    if (selectedRfqBaseFiles.length === 0) return;

    const fileCount = selectedRfqBaseFiles.length;
    setProcessingFileCount(fileCount);
    setShowConfirm(false);

    const success = await handleRfqBaseUpload(selectedRfqBaseFiles);

    // Solo limpiar archivos si el procesamiento fue exitoso
    if (success) {
      clearSelectedRfqBaseFiles();
    }
    setProcessingFileCount(0);
  };

  const handleClear = () => {
    if (window.confirm(t('upload.confirm.delete'))) {
      clearRfqBase();
      clearSelectedRfqBaseFiles();
      setShowConfirm(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    clearSelectedRfqBaseFiles();
  };

  // Transform dashboard stats to donut chart format
  const donutData: DonutChartData[] = useMemo(() => {
    const allEvaluationTypes = [
      'Technical Evaluation',
      'Economical Evaluation',
      'Pre-FEED Deliverables',
      'FEED Deliverables'
    ];

    const colors: Record<string, string> = {
      'Technical Evaluation': 'rgba(18, 181, 176, 0.8)',
      'Economical Evaluation': 'rgba(245, 158, 11, 0.8)',
      'Pre-FEED Deliverables': 'rgba(59, 130, 246, 0.8)',
      'FEED Deliverables': 'rgba(139, 92, 246, 0.8)'
    };

    // Always try to use Supabase data first, even if it's being loaded
    if (dashboardStats && Object.keys(dashboardStats.evaluationTypeCounts).length > 0) {
      return allEvaluationTypes.map((evalType) => {
        const count = dashboardStats.evaluationTypeCounts[evalType] || 0;

        return {
          label: evalType,
          value: count,
          color: colors[evalType],
          isEmpty: count === 0
        };
      });
    }

    // Fallback: use mock data based on uploaded RFQ or default empty state
    if (rfqBase?.tiposProcesados) {
      return allEvaluationTypes.map((evalType) => {
        const hasEval = rfqBase.tiposProcesados.some((tipo) =>
          tipo.toLowerCase().includes(evalType.toLowerCase().split(' ')[0])
        ) || false;

        return {
          label: evalType,
          value: hasEval ? 1 : 0,
          color: colors[evalType],
          isEmpty: !hasEval
        };
      });
    }

    // Default empty state
    return allEvaluationTypes.map((evalType) => ({
      label: evalType,
      value: 0,
      color: colors[evalType],
      isEmpty: true
    }));
  }, [dashboardStats, rfqBase]);

  // Calculate file stats
  const fileStats = useMemo(() => {
    const totalSize = selectedRfqBaseFiles.reduce((sum, f) => sum + f.size, 0);
    return {
      totalFiles: selectedRfqBaseFiles.length,
      totalSize: totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(2)} MB` : '0 MB',
      status: isProcessingRfqBase ? 'processing' : rfqBaseError ? 'error' : selectedRfqBaseFiles.length > 0 ? 'idle' : 'idle',
      evaluationCounts: rfqBase?.tiposProcesados.reduce((acc, tipo) => {
        acc[tipo] = 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };
  }, [selectedRfqBaseFiles, isProcessingRfqBase, rfqBaseError, rfqBase]);

  // Si ya hay una RFQ cargada, mostrar info
  if (rfqBase && !showConfirm) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '32px', width: '100%' }}>
        {/* Left Column - File Info & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div 
            className="card"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'slideInLeft 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            {/* Decorative gradient background - subtle like dashboard */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: `radial-gradient(circle, var(--color-primary)15 0%, transparent 70%)`,
              opacity: 0.5,
              transition: 'opacity 0.3s'
            }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Header with icon and title - matching dashboard style */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '24px',
                animation: 'fadeInDown 0.6s ease-out 0.2s both'
              }}>
                <div>
                  <h3 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: '1.15rem', 
                    fontWeight: 700, 
                    color: 'var(--text-primary)'
                  }}>
                    {t('upload.rfq_loaded')}
                  </h3>
                  <span style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {t('upload.doc_processed')}
                  </span>
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  opacity: 0.8,
                  animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
              </div>

              {/* File name card - matching dashboard card style */}
              <div style={{
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'all 0.3s ease',
                animation: 'fadeInUp 0.6s ease-out 0.3s both'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--color-primary)15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--color-primary)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '2px'
                  }}>
                    {rfqBase.fileName}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {t('upload.ready_comparison')}
                  </div>
                </div>
                <button 
                  onClick={handleClear} 
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '18px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    lineHeight: 1,
                    flexShrink: 0
                  }}
                  title={t('upload.change_rfq')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.borderColor = 'var(--color-error)';
                    e.currentTarget.style.color = 'var(--color-error)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>

              {/* Evaluation types badges - matching dashboard legend style */}
              {rfqBase.tiposProcesados.length > 0 && (
                <div style={{
                  marginBottom: '20px',
                  animation: 'fadeInUp 0.6s ease-out 0.4s both'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {t('upload.processed_types')}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    {rfqBase.tiposProcesados.map((tipo, index) => {
                      const colors: Record<string, string> = {
                        'Technical Evaluation': 'rgba(20, 184, 166, 0.8)',
                        'Economical Evaluation': 'rgba(245, 158, 11, 0.8)',
                        'Pre-FEED Deliverables': 'rgba(59, 130, 246, 0.8)',
                        'FEED Deliverables': 'rgba(139, 92, 246, 0.8)'
                      };
                      
                      // Find matching color or use default
                      const colorKey = Object.keys(colors).find(key => 
                        tipo.toLowerCase().includes(key.toLowerCase().split(' ')[0])
                      ) || 'Technical Evaluation';
                      const badgeColor = colors[colorKey] || colors['Technical Evaluation'];
                      
                      return (
                        <div
                          key={tipo}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'var(--bg-surface)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s ease',
                            animation: `scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.5 + index * 0.1}s both`
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = badgeColor;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '2px', 
                            background: badgeColor 
                          }}></div>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-secondary)', 
                            fontWeight: 600 
                          }}>
                            {tipo}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hint text - matching dashboard info style */}
              <div style={{
                padding: '16px 20px',
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                display: 'flex',
                alignItems: 'start',
                gap: '12px',
                animation: 'fadeInUp 0.6s ease-out 0.5s both'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--color-primary)20',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  opacity: 0.8
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <span style={{ flex: 1 }}>{t('upload.rfq_hint')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Visualization */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {dashboardStats ? t('upload.doc_overview') : t('upload.requirements_analysis')}
              </h3>
              {dashboardStats && (
                <button
                  onClick={loadDashboardStats}
                  disabled={isRefreshingStats}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isRefreshingStats ? 'var(--color-primary)' : 'var(--text-secondary)',
                    cursor: isRefreshingStats ? 'not-allowed' : 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'color 0.2s',
                    transform: isRefreshingStats ? 'rotate(360deg)' : 'none',
                    animation: isRefreshingStats ? 'spin 1s linear infinite' : 'none'
                  }}
                  title={isRefreshingStats ? t('upload.refreshing') : t('upload.refresh_data')}
                  onMouseEnter={(e) => !isRefreshingStats && (e.currentTarget.style.color = 'var(--color-primary)')}
                  onMouseLeave={(e) => !isRefreshingStats && (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {dashboardStats ? t('upload.rfq_by_type') : 'Evaluation types found in uploaded RFQ'}
              {dashboardStats && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
                  {t('upload.auto_updates')}
                </span>
              )}
            </p>
          </div>

          <DonutChart
            data={donutData}
            size="large"
            centerText={donutData.reduce((sum, d) => sum + d.value, 0).toString()}
            showLegend={true}
            interactive={false}
          />
        </div>
      </div>
    );
  }

  // Modal de confirmación para reemplazar RFQ
  if (showConfirm) {
    return (
      <div className="field">
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid rgba(232, 238, 245, 0.18)',
          background: 'rgba(255, 255, 255, 0.02)',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>
            {t('upload.modal.replace_title')}
          </h4>
          <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--muted)' }}>
            {t('upload.modal.current')}: <strong>{rfqBase?.fileName}</strong>
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--muted)' }}>
            {t('upload.modal.replace_bg')}: <strong>
              {selectedRfqBaseFiles.length > 1
                ? `${selectedRfqBaseFiles.length} ${t('upload.files')}`
                : selectedRfqBaseFiles[0]?.name}
            </strong>?
          </p>

          <div className="actions">
            <button onClick={handleUpload} className="btn btnPrimary">
              {t('upload.btn.replace')}
            </button>
            <button onClick={handleCancelConfirm} className="btn btnSecondary">
              {t('upload.btn.cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de subida (cuando no hay RFQ cargada)
  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '32px', width: '100%' }}>
        {/* Left Column - Upload Zone & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <div
              {...getRootProps()}
              className="dropzone dropzone--centered"
              data-drag={isDragActive ? '1' : '0'}
            >
              <input {...getInputProps()} />

              {/* Upload Icon */}
              <div className="dropzoneIcon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(18, 181, 176, 0.8)" strokeWidth="2">
                  <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21"></path>
                  <path d="M16 16l-4-4-4 4"></path>
                </svg>
              </div>

              <p className="dropzonePrompt">
                {isProcessingRfqBase
                  ? t('upload.status.processing')
                  : selectedRfqBaseFiles.length > 0
                    ? selectedRfqBaseFiles.length > 1
                      ? `${selectedRfqBaseFiles.length} ${t('upload.files_selected')}`
                      : selectedRfqBaseFiles[0].name
                    : isDragActive
                      ? t('upload.drop_here')
                      : t('upload.drag_drop')}
              </p>

              {selectedRfqBaseFiles.length > 0 && (
                <p className="dropzoneSubtext">
                  {(selectedRfqBaseFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                </p>
              )}
            </div>

            <p className="hint" style={{ marginTop: '12px', marginBottom: 0 }}>
              {t('upload.rfq_hint')}
            </p>
          </div>

          {/* Stats Cards */}
          <EvaluationStats
            totalFiles={fileStats.totalFiles}
            totalSize={fileStats.totalSize}
            status={fileStats.status as any}
            evaluationCounts={fileStats.evaluationCounts}
          />

          {selectedRfqBaseFiles.length > 1 && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setShowFileList(true)}
                className="btn btnSecondary"
                style={{
                  minWidth: '140px',
                  fontSize: '12px',
                  padding: '8px 14px'
                }}
              >
                {t('upload.view_files')} ({selectedRfqBaseFiles.length})
              </button>
            </div>
          )}

      {/* Error Display */}
      {rfqBaseError && !isProcessingRfqBase && (
        <div style={{
          marginTop: '20px',
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
              {t('upload.status.error')}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              {rfqBaseError}
            </div>
          </div>
          <button
            onClick={() => setRfqBaseError(null)}
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

          <div className="actions">
            <button
              onClick={handleUpload}
              disabled={selectedRfqBaseFiles.length === 0 || isProcessingRfqBase}
              className={`btn ${rfqBaseError ? 'btnDanger' : 'btnPrimary'}`}
            >
              {rfqBaseError
                ? t('upload.status.error')
                : isProcessingRfqBase
                  ? `${t('upload.status.processing')} ${processingFileCount} ${t('upload.file')}${processingFileCount > 1 ? 's' : ''}...`
                  : `${t('upload.btn.process')} ${selectedRfqBaseFiles.length || ''} RFQ${selectedRfqBaseFiles.length > 1 ? 's' : selectedRfqBaseFiles.length === 1 ? '' : 's'}`
              }
            </button>

            {(selectedRfqBaseFiles.length > 0 || rfqBaseError) && !isProcessingRfqBase && (
              <button
                onClick={() => {
                  clearSelectedRfqBaseFiles();
                  setRfqBaseError(null);
                  setShowConfirm(false);
                }}
                className="btn btnSecondary"
              >
                {t('upload.btn.reset')}
              </button>
            )}
          </div>
        </div>

        {/* Right Column - Preview Visualization */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: 'var(--shadow-sm)',
          minHeight: '400px',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('upload.ready_process')}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('upload.upload_begin')}
            </p>
          </div>

          {/* Donut Chart with database data */}
          <DonutChart
            data={donutData}
            size="large"
            centerText={donutData.reduce((sum, d) => sum + d.value, 0).toString()}
            showLegend={true}
            interactive={false}
          />

          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: '280px', margin: 0 }}>
            {dashboardStats
              ? t('upload.distribution_desc')
              : t('upload.upload_see_breakdown')
            }
          </p>
        </div>
      </div>

      {/* Processing Status */}
      <div style={{ marginTop: '24px' }}>
        <RfqBaseProcessingStatus />
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        @keyframes pulseDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
      `}</style>

      {/* File List Modal */}
      {showFileList && (
        <>
          <div
            className="modalOverlay"
            onClick={() => setShowFileList(false)}
          />
          <div className="fileListModal">
            <div className="fileListModalHeader">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {t('upload.modal.files_title')} ({selectedRfqBaseFiles.length})
              </h3>
              <button
                onClick={() => setShowFileList(false)}
                className="removeBtn"
                title={t('upload.btn.close')}
              >
                ×
              </button>
            </div>
            <div className="fileListModalBody">
              {selectedRfqBaseFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="selectedFile">
                  <div>
                    <div className="selectedFileName">
                      {index + 1}. {file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '4px' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button
                    className="removeBtn"
                    onClick={() => {
                      setSelectedRfqBaseFiles(selectedRfqBaseFiles.filter((_, i) => i !== index));
                      if (selectedRfqBaseFiles.length === 2) {
                        setShowFileList(false);
                      }
                    }}
                    title={t('upload.btn.remove')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="fileListModalFooter">
              <button
                onClick={() => {
                  clearSelectedRfqBaseFiles();
                  setRfqBaseError(null);
                  setShowFileList(false);
                }}
                className="btn btnDanger"
                style={{
                  width: '100%',
                  fontSize: '13px',
                  padding: '10px 16px'
                }}
              >
                {t('upload.btn.clear_all')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
