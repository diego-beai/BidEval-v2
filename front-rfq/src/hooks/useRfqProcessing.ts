import { useCallback, useMemo } from 'react';
import { useRfqStore } from '../stores/useRfqStore';
import { useProjectStore } from '../stores/useProjectStore';
import { uploadRfqFile, cancelRunningN8nExecutions } from '../services/n8n.service';
import { isFileMetadataComplete, RfqItem } from '../types/rfq.types';

/**
 * Hook principal para orquestar el procesamiento de Propuestas
 *
 * Maneja:
 * - Upload de múltiples archivos en paralelo con metadata individual
 * - Cancelación individual por archivo
 * - Actualización del estado por archivo
 */
export function useRfqProcessing() {
  const {
    selectedFiles,
    isProcessing,
    startProcessing,
    cancelProcessing,
    cancelFileProcessing,
    updateFileTracker,
    setResults,
    setError
  } = useRfqStore();

  const { activeProjectId, getActiveProject, loadProjects } = useProjectStore();

  /**
   * Maneja el upload y procesamiento de múltiples archivos en paralelo
   * Cada archivo tiene su propio AbortController para cancelación individual
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
      startProcessing();

      // Get the per-file trackers created by startProcessing
      const trackers = useRfqStore.getState().fileTrackers;

      // Process each file individually with its own AbortController
      // Stagger requests by 1.5s to avoid overwhelming n8n webhooks with simultaneous calls
      const STAGGER_DELAY_MS = 1500;

      const filePromises = selectedFiles.map(async ({ file, metadata }, index) => {
        const tracker = trackers[index];
        if (!tracker) return { fileName: file.name, success: false, error: 'No tracker' };

        // Stagger: wait index * delay before starting each upload
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, index * STAGGER_DELAY_MS));
        }

        try {
          const activeProj = getActiveProject();
          const projectLanguage = activeProj?.default_language || 'es';
          const projectCurrency = activeProj?.currency || 'EUR';
          const result = await uploadRfqFile(file, {
            project_id: activeProjectId,
            proyecto: metadata.proyecto,
            proveedor: metadata.proveedor as string,
            tipoEvaluacion: metadata.tipoEvaluacion,
            language: projectLanguage,
            currency: projectCurrency
          }, tracker.abortController.signal);

          updateFileTracker(tracker.id, { status: 'completed' });

          return {
            fileName: file.name,
            success: true,
            results: result.results
          };
        } catch (error) {
          const isCancelled = error instanceof Error && error.message === 'Operation cancelled by user';

          if (isCancelled) {
            // Don't update tracker here — cancelFileProcessing already did it
            return { fileName: file.name, success: false, error: 'Cancelled by user', cancelled: true };
          }

          updateFileTracker(tracker.id, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          return {
            fileName: file.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const fileResults = await Promise.all(filePromises);

      // Check if ALL were cancelled — if so, silently exit
      const allCancelled = fileResults.every(r => !r.success && (r as any).cancelled);
      if (allCancelled) {
        return false;
      }

      const successResults = fileResults.filter(r => r.success);
      const failedResults = fileResults.filter(r => !r.success && !(r as any).cancelled);
      const cancelledResults = fileResults.filter(r => (r as any).cancelled);

      // Merge results from multiple files intelligently:
      // For the same requirement+provider, keep the best evaluation (real data over "NO INFORMATION")
      const NO_DATA_VALUES = new Set(['NO INFORMATION', 'NOT QUOTED', 'NO COTIZADO', 'SIN INFORMACIÓN', 'ERROR ANALISIS']);
      const resultsMap = new Map<string, RfqItem>();

      successResults.forEach(r => {
        if (!(r as any).results) return;
        ((r as any).results as RfqItem[]).forEach(item => {
          const key = `${(item as any).requirement_id || item.id}_${(item as any).provider_name || ''}`;
          const existing = resultsMap.get(key);
          if (!existing) {
            resultsMap.set(key, item);
          } else {
            // Keep existing if it has real data; overwrite only if existing has no data and new has data
            const existingValue = (existing as any).evaluation_value || '';
            const newValue = (item as any).evaluation_value || '';
            if (NO_DATA_VALUES.has(existingValue) && !NO_DATA_VALUES.has(newValue)) {
              resultsMap.set(key, item);
            }
          }
        });
      });

      const combinedResults: RfqItem[] = Array.from(resultsMap.values());

      if (successResults.length === 0 && failedResults.length > 0) {
        const firstError = failedResults[0]?.error || 'Unknown error';
        const failedNames = failedResults.map(r => r.fileName).join(', ');
        setError(`All ${failedResults.length} files failed to process. Reason: ${firstError}. Files: ${failedNames}`);
        return false;
      }

      if (successResults.length > 0) {
        const parts: string[] = [];
        parts.push(`${successResults.length} processed`);
        if (failedResults.length > 0) parts.push(`${failedResults.length} failed`);
        if (cancelledResults.length > 0) parts.push(`${cancelledResults.length} cancelled`);

        setResults(combinedResults, parts.join(', '));
        // Refresh project data so the progress stepper updates
        loadProjects();
        return true;
      }

      // Only cancelled files, no successes, no errors
      return false;
    } catch (error) {
      if (error instanceof Error && error.message === 'Operation cancelled by user') {
        return false;
      }

      let errorMessage = 'Unknown error while processing files';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      return false;
    }
  }, [selectedFiles, activeProjectId, isProcessing, startProcessing, updateFileTracker, setResults, setError, loadProjects]);

  const handleCancel = useCallback(async () => {
    cancelProcessing();
    // Best-effort: try to cancel n8n executions via API
    cancelRunningN8nExecutions().catch(() => {});
  }, [cancelProcessing]);

  const handleCancelFile = useCallback((fileId: string) => {
    cancelFileProcessing(fileId);
    cancelRunningN8nExecutions().catch(() => {});
  }, [cancelFileProcessing]);

  return useMemo(() => ({
    handleUpload,
    handleCancel,
    handleCancelFile,
    isProcessing
  }), [handleUpload, handleCancel, handleCancelFile, isProcessing]);
}
