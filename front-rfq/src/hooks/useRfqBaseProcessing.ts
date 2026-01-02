import { useCallback, useEffect, useRef } from 'react';
import { useRfqStore } from '../stores/useRfqStore';
import { uploadRfqBase } from '../services/n8n.service';
import { ProcessingStage } from '../types/rfq.types';
import { ApiError } from '../types/api.types';

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
      { threshold: 0.10, stage: ProcessingStage.UPLOADING, message: 'Subiendo archivos RFQ a n8n...' },
      { threshold: 0.25, stage: ProcessingStage.OCR_PROCESSING, message: 'Extrayendo texto de los PDFs...' },
      { threshold: 0.50, stage: ProcessingStage.CLASSIFYING, message: 'Clasificando tipos de requisitos...' },
      { threshold: 0.70, stage: ProcessingStage.EMBEDDING, message: 'Generando embeddings vectoriales...' },
      { threshold: 0.85, stage: ProcessingStage.EVALUATING, message: 'Extrayendo requisitos con IA...' },
      { threshold: 0.95, stage: ProcessingStage.EVALUATING, message: 'Finalizando procesamiento...' }
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

    const fileCount = files.length;

    try {
      startProcessingRfqBase(fileCount);
      simulateProgress();

      // Procesar todos los archivos en paralelo
      const uploadPromises = files.map(file => uploadRfqBase(file));
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
      });

      return true;
    } catch (error) {
      clearProgressTimer();

      let errorMessage = 'Error desconocido al procesar la RFQ';

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setRfqBaseError(errorMessage);
      return false;
    }
  }, [startProcessingRfqBase, simulateProgress, clearProgressTimer, setRfqBase, setRfqBaseError]);

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
