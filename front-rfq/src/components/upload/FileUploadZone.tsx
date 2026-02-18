import { useCallback, memo, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRfqStore } from '../../stores/useRfqStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { validateFile } from '../../utils/validators';
import { MultiFileMetadataModal } from './MultiFileMetadataModal';
import { useRfqProcessing } from '../../hooks/useRfqProcessing';

interface FileUploadZoneProps {
  compact?: boolean;
  autoOpenModal?: boolean;
}

export const FileUploadZone = memo(function FileUploadZone({
  compact = false,
  autoOpenModal = true
}: FileUploadZoneProps) {
  const {
    selectedFiles,
    addFiles,
    removeFile,
    setSelectedFiles,
    setError,
    isProcessing,
    updateFileMetadata,
    copyMetadataFromPrevious
  } = useRfqStore();
  const { handleUpload } = useRfqProcessing();
  const { t } = useLanguageStore();
  const projectType = useProjectStore((s) => s.projects.find(p => p.id === s.activeProjectId)?.project_type || 'RFP');
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  // Auto-open modal when files are added
  useEffect(() => {
    if (autoOpenModal && selectedFiles.length > 0 && !isProcessing) {
      setShowMetadataModal(true);
    }
  }, [selectedFiles.length, autoOpenModal, isProcessing]);

  // Shared validation and add logic
  const validateAndAddFiles = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return;

    // Validate all files
    const invalidFiles = newFiles.filter(file => {
      const validation = validateFile(file);
      return !validation.valid;
    });

    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.length} invalid file(s). Only PDFs under 50MB are allowed`);
      return;
    }

    // Add files (addFiles already limits to max 7)
    addFiles(newFiles);

    const totalAfterAdd = selectedFiles.length + newFiles.length;
    if (totalAfterAdd > 7) {
      setError('Only up to 7 files can be processed. Some files were not added.');
    }
  }, [addFiles, setError, selectedFiles.length]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    validateAndAddFiles(acceptedFiles);
  }, [validateAndAddFiles]);

  // Handler for adding files from within the modal
  const handleAddFilesFromModal = useCallback((newFiles: File[]) => {
    validateAndAddFiles(newFiles);
  }, [validateAndAddFiles]);

  const handleModalClose = useCallback(() => {
    setShowMetadataModal(false);
  }, []);

  const handleModalConfirm = useCallback(async () => {
    setShowMetadataModal(false);
    await handleUpload();
  }, [handleUpload]);

  const handleRemoveFile = useCallback((index: number) => {
    removeFile(index);
    // If all files removed, close modal
    if (selectedFiles.length <= 1) {
      setShowMetadataModal(false);
    }
  }, [removeFile, selectedFiles.length]);

  const handleClearAll = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
    setShowMetadataModal(false);
  }, [setSelectedFiles, setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 15,
    multiple: true,
    disabled: isProcessing
  });

  // Calculate total size from FileWithMetadata array
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

  return (
    <>
      <div
        {...getRootProps()}
        className={`dropzone dropzone--centered ${compact ? 'dropzone--compact' : ''}`}
        data-drag={isDragActive ? '1' : '0'}
      >
        <input {...getInputProps()} />

        <div className="dropzoneIcon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(18, 181, 176, 0.8)" strokeWidth="2">
            <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21"></path>
            <path d="M16 16l-4-4-4 4"></path>
          </svg>
        </div>

        <p className={`dropzonePrompt ${compact ? 'dropzonePrompt--compact' : ''}`}>
          {isProcessing
            ? t('dropzone.processing')
            : selectedFiles.length > 0
              ? selectedFiles.length > 1
                ? t('dropzone.files_selected').replace('{count}', selectedFiles.length.toString()).replace('{size}', totalSizeMB)
                : t('dropzone.file_selected').replace('{name}', selectedFiles[0].file.name).replace('{size}', (selectedFiles[0].file.size / 1024 / 1024).toFixed(2))
              : isDragActive
                ? t('dropzone.drop_here')
                : compact
                  ? t('dropzone.drag_compact')
                  : t(`dropzone.drag_full_${projectType.toLowerCase()}`) || t('dropzone.drag_full')}
        </p>

        {selectedFiles.length > 0 && (
          <p className="dropzoneSubtext">
            {totalSizeMB} MB total
          </p>
        )}
      </div>

      {selectedFiles.length > 0 && !isProcessing && (
        <div style={{ width: '100%', marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowMetadataModal(true)}
            className="btn btnSecondary"
            style={{
              minWidth: '140px',
              fontSize: '12px',
              padding: '8px 14px'
            }}
          >
            {t('dropzone.configure_files').replace('{count}', selectedFiles.length.toString())}
          </button>
          <button
            onClick={handleClearAll}
            className="btn btnDanger"
            style={{
              fontSize: '12px',
              padding: '8px 14px'
            }}
          >
            {t('dropzone.clear_all')}
          </button>
        </div>
      )}

      {/* Multi-file metadata modal */}
      <MultiFileMetadataModal
        files={selectedFiles}
        open={showMetadataModal}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        onRemoveFile={handleRemoveFile}
        onUpdateMetadata={updateFileMetadata}
        onCopyFromPrevious={copyMetadataFromPrevious}
        onAddFiles={handleAddFilesFromModal}
        disabled={isProcessing}
      />
    </>
  );
});
