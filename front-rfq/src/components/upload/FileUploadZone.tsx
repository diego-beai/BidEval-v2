import { useCallback, memo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRfqStore } from '../../stores/useRfqStore';
import { validateFile } from '../../utils/validators';
import { formatFileSize } from '../../utils/formatters';

export const FileUploadZone = memo(function FileUploadZone({ compact = false }: { compact?: boolean }) {
  const { selectedFiles, addFiles, removeFile, setSelectedFiles, setError, isProcessing } = useRfqStore();
  const [showFileList, setShowFileList] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Validar todos los archivos
    const invalidFiles = acceptedFiles.filter(file => {
      const validation = validateFile(file);
      return !validation.valid;
    });

    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.length} invalid file(s). Only PDFs under 50MB are allowed`);
      return;
    }

    // Add files (addFiles already limits to max 7)
    addFiles(acceptedFiles);

    if (acceptedFiles.length > 7) {
      setError('Only up to 7 files can be processed. The first available files were added.');
    }
  }, [addFiles, setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 7,
    multiple: true,
    disabled: isProcessing
  });

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
            ? 'Processing proposals... This may take a few minutes'
            : selectedFiles.length > 0
              ? selectedFiles.length > 1
                ? `${selectedFiles.length} files selected (${(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB total)`
                : `${selectedFiles[0].name} (${(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB)`
              : isDragActive
                ? 'Drop the PDF files here...'
                : compact
                  ? 'Drag PDF files or click to select'
                  : 'Drag and drop PDF files here (up to 7), or click to select'}
        </p>

        {selectedFiles.length > 0 && (
          <p className="dropzoneSubtext">
            {(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
          </p>
        )}
      </div>

      {selectedFiles.length > 1 && (
        <div style={{ width: '100%', marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setShowFileList(true)}
            className="btn btnSecondary"
            style={{
              minWidth: '140px',
              fontSize: '12px',
              padding: '8px 14px'
            }}
          >
            View files ({selectedFiles.length})
          </button>
        </div>
      )}

      {showFileList && (
        <>
          <div
            className="modalOverlay"
            onClick={() => setShowFileList(false)}
          />
          <div className="fileListModal">
            <div className="fileListModalHeader">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Selected Files ({selectedFiles.length})
              </h3>
              <button
                onClick={() => setShowFileList(false)}
                className="removeBtn"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="fileListModalBody">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="selectedFile">
                  <div>
                    <div className="selectedFileName">
                      {index + 1}. {file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '4px' }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <button
                    className="removeBtn"
                    onClick={() => removeFile(index)}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="fileListModalFooter">
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setError(null);
                  setShowFileList(false);
                }}
                className="btn btnDanger"
                style={{
                  width: '100%',
                  fontSize: '13px',
                  padding: '10px 16px'
                }}
              >
                Remove all files
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
});
