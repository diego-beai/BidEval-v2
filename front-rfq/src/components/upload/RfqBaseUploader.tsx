import { useState, useCallback, useMemo } from 'react';
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
    clearSelectedRfqBaseFiles
  } = useRfqStore();
  const { t } = useLanguageStore();

  const { handleRfqBaseUpload } = useRfqBaseProcessing();
  const [showConfirm, setShowConfirm] = useState(false);
  const [processingFileCount, setProcessingFileCount] = useState(0);
  const [showFileList, setShowFileList] = useState(false);

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

  // Transform RFQ data to donut chart format
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

    return allEvaluationTypes.map((evalType) => {
      const hasEval = rfqBase?.tiposProcesados.some((tipo) =>
        tipo.toLowerCase().includes(evalType.toLowerCase().split(' ')[0])
      ) || false;

      return {
        label: evalType,
        value: hasEval ? 25 : 0,
        color: colors[evalType],
        isEmpty: !hasEval
      };
    });
  }, [rfqBase]);

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
          <div className="selectedFile">
            <div className="selectedFileName">
              <div style={{ marginBottom: '4px', color: 'var(--ok)', fontWeight: 600 }}>
                {t('upload.rfq_loaded')}
              </div>
              <div>{rfqBase.fileName}</div>
              {rfqBase.tiposProcesados.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '4px' }}>
                  {t('upload.processed_types')}: {rfqBase.tiposProcesados.join(', ')}
                </div>
              )}
            </div>

            <button onClick={handleClear} className="removeBtn" title={t('upload.change_rfq')}>
              ×
            </button>
          </div>

          <p className="hint" style={{ marginTop: 0 }}>
            {t('upload.rfq_hint')}
          </p>
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Requirements Analysis
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Evaluation types found in RFQ
            </p>
          </div>

          <DonutChart
            data={donutData}
            size="large"
            centerText={rfqBase.tiposProcesados.length.toString()}
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
              className="dropzone"
              data-drag={isDragActive ? '1' : '0'}
              style={{ padding: '32px', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}
            >
              <input {...getInputProps()} />

              {/* Upload Icon */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(18, 181, 176, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(18, 181, 176, 0.8)" strokeWidth="2">
                  <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21"></path>
                  <path d="M16 16l-4-4-4 4"></path>
                </svg>
              </div>

              <p className="dropzonePrompt" style={{ fontSize: '1rem', margin: 0, textAlign: 'center', fontWeight: 600 }}>
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
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
              Ready to Process
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Upload your RFQ documents to begin analysis
            </p>
          </div>

          {/* Placeholder Donut Chart */}
          <DonutChart
            data={[
              { label: 'Technical', value: 0, color: 'rgba(18, 181, 176, 0.8)', isEmpty: true },
              { label: 'Economical', value: 0, color: 'rgba(245, 158, 11, 0.8)', isEmpty: true },
              { label: 'Pre-FEED', value: 0, color: 'rgba(59, 130, 246, 0.8)', isEmpty: true },
              { label: 'FEED', value: 0, color: 'rgba(139, 92, 246, 0.8)', isEmpty: true }
            ]}
            size="large"
            centerText="0"
            showLegend={true}
            interactive={false}
          />

          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: '280px', margin: 0 }}>
            The analysis will identify Technical, Economical, Pre-FEED, and FEED requirements
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
