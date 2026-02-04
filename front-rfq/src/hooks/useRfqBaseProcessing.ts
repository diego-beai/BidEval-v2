import { useCallback, useEffect, useRef } from 'react';
import { useRfqStore } from '../stores/useRfqStore';
import { useProjectStore } from '../stores/useProjectStore';
import { uploadRfqBase } from '../services/n8n.service';
import { ProcessingStage } from '../types/rfq.types';

/**
 * Hook para orquestar el procesamiento de RFQ Base con progreso simulado
 *
 * Maneja:
 * - Upload de archivos RFQ en paralelo
 * - Simulación de progreso durante el procesamiento
 * - Actualización del estado
 */
export function useRfqBaseProcessing() {
  const {
    startProcessingRfqBase,
    updateRfqBaseStatus,
    setRfqBase,
    setRfqBaseError
  } = useRfqStore();

  const { activeProjectId, getActiveProject } = useProjectStore();

  const processingTimerRef = useRef<number>();

  /**
   * Simula el progreso durante el procesamiento de forma más realista
   * Dado que n8n no devuelve actualizaciones de progreso intermedias,
   * simulamos el progreso basándonos en el tiempo transcurrido estimado
   */
  const simulateProgress = useCallback(() => {
    const startTime = Date.now();
    const estimatedTotalTime = 120000; // 2 minutos estimados

    const stages = [
      { threshold: 0.10, stage: ProcessingStage.UPLOADING, message: 'Uploading RFQ files to n8n...' },
      { threshold: 0.25, stage: ProcessingStage.OCR_PROCESSING, message: 'Extracting text from PDFs...' },
      { threshold: 0.50, stage: ProcessingStage.CLASSIFYING, message: 'Classifying requirement types...' },
      { threshold: 0.70, stage: ProcessingStage.EMBEDDING, message: 'Generating vector embeddings...' },
      { threshold: 0.85, stage: ProcessingStage.EVALUATING, message: 'Extracting requirements with IA...' },
      { threshold: 0.95, stage: ProcessingStage.EVALUATING, message: 'Finalizing processing...' }
    ];

    let currentStageIndex = 0;

    processingTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / estimatedTotalTime, 0.95);
      const progress = Math.floor(progressRatio * 100);

      // Actualizar etapa según el progreso
      while (
        currentStageIndex < stages.length - 1 &&
        progressRatio > stages[currentStageIndex + 1].threshold
      ) {
        currentStageIndex++;
      }

      const currentStage = stages[currentStageIndex];

      updateRfqBaseStatus({
        progress,
        stage: currentStage.stage,
        message: currentStage.message
      });
    }, 1000); // Actualizar cada segundo para progreso fluido
  }, [updateRfqBaseStatus]);

  /**
   * Limpia el timer de progreso
   */
  const clearProgressTimer = useCallback(() => {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
      processingTimerRef.current = undefined;
    }
  }, []);

  /**
   * Maneja el upload y procesamiento de archivos RFQ
   */
  const handleRfqBaseUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setRfqBaseError('No se han seleccionado archivos');
      return;
    }

    // Validar que hay un proyecto activo seleccionado
    if (!activeProjectId) {
      setRfqBaseError('No project selected. Please select a project from the sidebar first.');
      return false;
    }

    // Obtener el nombre del proyecto para enviarlo a N8N
    const activeProject = getActiveProject();
    const projectName = activeProject?.display_name || activeProject?.name || undefined;

    const fileCount = files.length;

    try {
      startProcessingRfqBase(fileCount);
      simulateProgress();

      // Procesar todos los archivos en paralelo con el project_id y project_name
      const uploadPromises = files.map(file =>
        uploadRfqBase(file, activeProjectId, projectName)
      );
      const responses = await Promise.all(uploadPromises);

      // Detener simulación de progreso
      clearProgressTimer();

      // Tomar la última respuesta como la principal
      const lastResponse = responses[responses.length - 1];
      const allTipos = [...new Set(responses.flatMap(r => r.tipos_procesados))];

      setRfqBase({
        fileId: lastResponse.file_id,
        fileName: fileCount > 1
          ? `${fileCount} archivos RFQ`
          : files[0].name,
        tiposProcesados: allTipos,
        uploadedAt: new Date()
      }, lastResponse.message);

      return true;
    } catch (error) {
      clearProgressTimer();

      // No mostrar notificación de error - solo limpiar el estado de procesamiento
      setRfqBaseError(null);

      return false;
    }
  }, [activeProjectId, startProcessingRfqBase, simulateProgress, clearProgressTimer, setRfqBase, setRfqBaseError]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearProgressTimer();
    };
  }, [clearProgressTimer]);

  return {
    handleRfqBaseUpload
  };
}
