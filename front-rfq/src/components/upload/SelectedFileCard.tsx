import { memo } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { formatFileSize } from '../../utils/formatters';

export const SelectedFileCard = memo(function SelectedFileCard() {
  const { selectedFiles, removeFile } = useRfqStore();

  if (selectedFiles.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {selectedFiles.map((fileWithMeta, index) => (
        <div key={`${fileWithMeta.file.name}-${index}`} className="selectedFile">
          <div>
            <div className="selectedFileName">
              {index + 1}. {fileWithMeta.file.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '4px' }}>
              {formatFileSize(fileWithMeta.file.size)}
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
  );
});
