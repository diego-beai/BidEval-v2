import { useCallback, memo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRfqStore } from '../../stores/useRfqStore';
import { validateFile } from '../../utils/validators';

export const FileUploadZone = memo(function FileUploadZone() {
  const { addFiles, setError } = useRfqStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Validar todos los archivos
    const invalidFiles = acceptedFiles.filter(file => {
      const validation = validateFile(file);
      return !validation.valid;
    });

    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.length} archivo(s) no válido(s). Solo se permiten PDFs menores a 50MB`);
      return;
    }

    // Agregar archivos (addFiles ya limita a máximo 7)
    addFiles(acceptedFiles);

    if (acceptedFiles.length > 7) {
      setError('Solo se pueden procesar hasta 7 archivos. Se agregaron los primeros disponibles.');
    }
  }, [addFiles, setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 7,
    multiple: true
  });

  return (
    <div
      {...getRootProps()}
      className="dropzone"
      data-drag={isDragActive ? '1' : '0'}
    >
      <input {...getInputProps()} />
      <p className="dropzonePrompt">
        {isDragActive
          ? '📄 Suelta los archivos PDF aquí...'
          : '📄 Arrastra y suelta archivos PDF aquí (hasta 7), o haz clic para seleccionar'}
      </p>
    </div>
  );
});
