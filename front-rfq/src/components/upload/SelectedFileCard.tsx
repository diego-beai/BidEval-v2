import { memo } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { formatFileSize } from '../../utils/formatters';

export const SelectedFileCard = memo(function SelectedFileCard() {
  const { selectedFiles, removeFile } = useRfqStore();

  if (selectedFiles.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
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
            title="Eliminar archivo"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
});
