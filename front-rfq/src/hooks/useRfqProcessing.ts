import { useCallback, useMemo } from 'react';
import { useRfqStore } from '../stores/useRfqStore';
import { useProjectStore } from '../stores/useProjectStore';
import { uploadMultipleRfqFiles } from '../services/n8n.service';
import { isFileMetadataComplete } from '../types/rfq.types';

/**
 * Hook principal para orquestar el procesamiento de Propuestas
 *
 * Maneja:
 * - Upload de múltiples archivos en paralelo con metadata individual
 * - Simulación de progreso durante el procesamiento
 * - Actualización del estado
 */
export function useRfqProcessing() {
  const {
    selectedFiles,
    isProcessing,
    startProcessing,
    setResults,
    setError
  } = useRfqStore();

  const { activeProjectId } = useProjectStore();

  /**
   * Maneja el upload y procesamiento de múltiples archivos en paralelo
   * Cada archivo tiene su propia metadata individual
   */
  const handleUpload = useCallback(async () => {
    // Prevent concurrent operations
    if (isProcessing) {
      setError('A processing operation is already in progress. Please wait for it to complete.');
      return false;
    }

    if (selectedFiles.length === 0) {
      setError('No files selected');
      return false;
    }

    // Validate that all files have complete metadata
    const incompleteFiles = selectedFiles.filter(f => !isFileMetadataComplete(f));
    if (incompleteFiles.length > 0) {
      setError(`${incompleteFiles.length} file(s) have incomplete metadata. Please configure all files before processing.`);
      return false;
    }

    // Validate that there is an active project selected
    if (!activeProjectId) {
      setError('No project selected. Please select a project from the sidebar first.');
      return false;
    }

    try {
      startProcessing(); // Simulation starts automatically there

      // Process all files in parallel with individual metadata
      const response = await uploadMultipleRfqFiles(
        selectedFiles.map(({ file, metadata }) => ({
          file,
          metadata: {
            proyecto: metadata.proyecto,
            proveedor: metadata.proveedor as string,
            tipoEvaluacion: metadata.tipoEvaluacion
          }
        })),
        { project_id: activeProjectId }
      );

      // Check if any files failed
      if (response.failureCount > 0) {
        const failedResults = response.fileResults.filter(r => !r.success);
        const failedFiles = failedResults.map(r => r.fileName).join(', ');
        const firstError = failedResults[0]?.error || 'Unknown error';

        if (response.successCount === 0) {
          // All files failed
          setError(`All ${response.failureCount} files failed to process. Reason: ${firstError}. Files: ${failedFiles}`);
          return false;
        } else {
          // Partial failure - still save successful results
          setResults(
            response.combinedResults,
            `${response.successCount} of ${response.totalFiles} files processed. Failed (${firstError}): ${failedFiles}`
          );
          return true;
        }
      }

      // All files succeeded - save combined results
      setResults(
        response.combinedResults,
        `${response.successCount} proposal${response.successCount > 1 ? 's' : ''} processed successfully!`
      );

      return true;
    } catch (error) {
      let errorMessage = 'Unknown error while processing files';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      return false;
    }
  }, [selectedFiles, activeProjectId, isProcessing, startProcessing, setResults, setError]);

  return useMemo(() => ({
    handleUpload,
    isProcessing
  }), [handleUpload, isProcessing]);
}
