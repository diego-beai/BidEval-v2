import { useCallback, useMemo } from 'react';
import { useRfqStore } from '../stores/useRfqStore';
import { uploadMultipleRfqFiles } from '../services/n8n.service';

/**
 * Hook principal para orquestar el procesamiento de Propuestas
 *
 * Maneja:
 * - Upload de múltiples archivos en paralelo
 * - Simulación de progreso durante el procesamiento
 * - Actualización del estado
 */
export function useRfqProcessing() {
  const {
    selectedFiles,
    rfqMetadata,
    isProcessing,
    startProcessing,
    setResults,
    setError
  } = useRfqStore();

  /**
   * Maneja el upload y procesamiento de múltiples archivos en paralelo
   */
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setError('No files selected');
      return false;
    }

    // Validar que todos los campos de metadata estén completos
    if (!rfqMetadata.proyecto || !rfqMetadata.proveedor || rfqMetadata.tipoEvaluacion.length === 0) {
      setError('Please complete all fields: Project, Provider and Evaluation Types');
      return false;
    }

    try {
      startProcessing(); // Simulation starts automatically there

      // Procesar todos los archivos en paralelo con la metadata
      const { results, message } = await uploadMultipleRfqFiles(selectedFiles, {
        proyecto: rfqMetadata.proyecto,
        proveedor: rfqMetadata.proveedor,
        tipoEvaluacion: rfqMetadata.tipoEvaluacion
      });

      // Guardar resultados (última respuesta) - stops simulation automatically
      setResults(results, message);

      return true;
    } catch (error) {
      let errorMessage = 'Unknown error while processing files';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      return false;
    }
  }, [selectedFiles, rfqMetadata, startProcessing, setResults, setError]);

  return useMemo(() => ({
    handleUpload,
    isProcessing
  }), [handleUpload, isProcessing]);
}
