import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRfqStore } from '../../stores/useRfqStore';
import { uploadRfqBase } from '../../services/n8n.service';
import { ApiError } from '../../types/api.types';
import { API_CONFIG } from '../../config/constants';
import { RfqBaseProcessingStatus } from '../processing/RfqBaseProcessingStatus';
import { ProcessingStage } from '../../types/rfq.types';

export function RfqBaseUploader() {
  const {
    rfqBase,
    isProcessingRfqBase,
    rfqBaseError,
    setRfqBase,
    clearRfqBase,
    startProcessingRfqBase,
    updateRfqBaseStatus,
    setRfqBaseError
  } = useRfqStore();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processingFileCount, setProcessingFileCount] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      // Validar tamaños
      const invalidFiles = acceptedFiles.filter(file => file.size > API_CONFIG.MAX_FILE_SIZE);

      if (invalidFiles.length > 0) {
        setRfqBaseError(`${invalidFiles.length} archivo(s) demasiado grande(s). Máximo ${API_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }

      setSelectedFiles(acceptedFiles);
      setRfqBaseError(null);

      // Si ya hay una RFQ cargada, pedir confirmación
      if (rfqBase) {
        setShowConfirm(true);
      }
    }
  }, [rfqBase, setRfqBaseError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': API_CONFIG.ALLOWED_EXTENSIONS
    },
    multiple: true,
    disabled: isProcessingRfqBase
  });

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const fileCount = selectedFiles.length;
    setProcessingFileCount(fileCount);
    startProcessingRfqBase(fileCount);
    setShowConfirm(false);

    try {
      // Actualizar progreso: procesando
      updateRfqBaseStatus({
        stage: ProcessingStage.OCR_PROCESSING,
        progress: 30,
        message: `Procesando ${fileCount} RFQ${fileCount > 1 ? 's' : ''}...`
      });

      // Procesar todos los archivos en paralelo
      const uploadPromises = selectedFiles.map(file => uploadRfqBase(file));
      const responses = await Promise.all(uploadPromises);

      // Actualizar progreso: finalizando
      updateRfqBaseStatus({
        stage: ProcessingStage.EVALUATING,
        progress: 80,
        message: 'Extrayendo requisitos...'
      });

      // Tomar la última respuesta como la principal
      const lastResponse = responses[responses.length - 1];
      const allTipos = [...new Set(responses.flatMap(r => r.tipos_procesados))];

      setRfqBase({
        fileId: lastResponse.file_id,
        fileName: fileCount > 1
          ? `${fileCount} archivos RFQ`
          : selectedFiles[0].name,
        tiposProcesados: allTipos,
        uploadedAt: new Date()
      });

      setSelectedFiles([]);
      setProcessingFileCount(0);
    } catch (error) {
      if (error instanceof ApiError) {
        setRfqBaseError(error.message);
      } else {
        setRfqBaseError('Error desconocido al procesar la RFQ');
      }
      setSelectedFiles([]);
      setProcessingFileCount(0);
    }
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar la RFQ base cargada?')) {
      clearRfqBase();
      setSelectedFiles([]);
      setShowConfirm(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setSelectedFiles([]);
  };

  // Si ya hay una RFQ cargada, mostrar info
  if (rfqBase && !showConfirm) {
    return (
      <div className="field">
        <div className="selectedFile">
          <div className="selectedFileName">
            <div style={{ marginBottom: '4px', color: 'var(--ok)', fontWeight: 600 }}>
              RFQ Cargada
            </div>
            <div>{rfqBase.fileName}</div>
            {rfqBase.tiposProcesados.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '4px' }}>
                Tipos: {rfqBase.tiposProcesados.join(', ')}
              </div>
            )}
          </div>

          <button onClick={handleClear} className="removeBtn" title="Cambiar RFQ">
            ×
          </button>
        </div>

        <p className="hint">
          Los requisitos de esta RFQ se usarán para comparar con las ofertas de proveedores
        </p>
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
            ¿Reemplazar RFQ actual?
          </h4>
          <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--muted)' }}>
            Ya tienes una RFQ cargada: <strong>{rfqBase?.fileName}</strong>
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--muted)' }}>
            ¿Deseas reemplazarla con: <strong>
              {selectedFiles.length > 1
                ? `${selectedFiles.length} archivos RFQ`
                : selectedFiles[0]?.name}
            </strong>?
          </p>

          <div className="actions">
            <button onClick={handleUpload} className="btn btnPrimary">
              Sí, reemplazar
            </button>
            <button onClick={handleCancelConfirm} className="btn btnSecondary">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de subida (cuando no hay RFQ cargada)
  return (
    <>
      <div className="field">
        <div
          {...getRootProps()}
          className="dropzone"
          data-drag={isDragActive ? '1' : '0'}
        >
          <input {...getInputProps()} />

          <p className="dropzonePrompt">
            {isProcessingRfqBase
              ? 'Procesando RFQ... Esto puede tardar unos minutos'
              : selectedFiles.length > 0
              ? selectedFiles.length > 1
                ? `${selectedFiles.length} archivos seleccionados (${(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB total)`
                : `${selectedFiles[0].name} (${(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB)`
              : isDragActive
              ? 'Suelta los archivos PDF aquí...'
              : 'Arrastra y suelta PDFs de RFQ aquí, o haz clic para seleccionar'}
          </p>
        </div>

        <p className="hint">
          La RFQ se procesará automáticamente para extraer requisitos que se compararán con las ofertas
        </p>
      </div>

      <div className="actions">
        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isProcessingRfqBase}
          className={`btn ${rfqBaseError ? 'btnDanger' : 'btnPrimary'}`}
        >
          {rfqBaseError
            ? 'Error'
            : isProcessingRfqBase
            ? `Procesando ${processingFileCount} archivo${processingFileCount > 1 ? 's' : ''}...`
            : `Procesar ${selectedFiles.length || ''} RFQ${selectedFiles.length > 1 ? 's' : selectedFiles.length === 1 ? '' : 's'}`
          }
        </button>

        {(selectedFiles.length > 0 || rfqBaseError) && !isProcessingRfqBase && (
          <button
            onClick={() => {
              setSelectedFiles([]);
              setRfqBaseError(null);
              setShowConfirm(false);
            }}
            className="btn btnSecondary"
          >
            Reiniciar
          </button>
        )}
      </div>

      <RfqBaseProcessingStatus />
    </>
  );
}
