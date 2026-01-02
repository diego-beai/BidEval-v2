import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useRfqStore } from '../stores/useRfqStore';
import { uploadMultipleRfqFiles } from '../services/n8n.service';
import { ProcessingStage } from '../types/rfq.types';

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
    updateStatus,
    setResults,
    setError
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
      { threshold: 0.15, stage: ProcessingStage.OCR_PROCESSING, message: 'Extrayendo texto del PDF...' },
      { threshold: 0.30, stage: ProcessingStage.CLASSIFYING, message: 'Clasificando proveedor y tipo...' },
      { threshold: 0.50, stage: ProcessingStage.EMBEDDING, message: 'Generando embeddings vectoriales...' },
      { threshold: 0.70, stage: ProcessingStage.EVALUATING, message: 'Evaluando ítems con IA...' },
      { threshold: 0.90, stage: ProcessingStage.EVALUATING, message: 'Finalizando evaluación...' }
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

      updateStatus({
        progress,
        stage: currentStage.stage,
        message: currentStage.message
      });
    }, 1000); // Actualizar cada segundo para progreso fluido
  }, [updateStatus]);

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
   * Maneja el upload y procesamiento de múltiples archivos en paralelo
   */
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setError('No se han seleccionado archivos');
      return false;
    }

    // Validar que todos los campos de metadata estén completos
    if (!rfqMetadata.proyecto || !rfqMetadata.proveedor || rfqMetadata.tipoEvaluacion.length === 0) {
      setError('Por favor complete todos los campos: Proyecto, Proveedor y Tipos de Evaluación');
      return false;
    }

    try {
      startProcessing();
      simulateProgress();

      // Procesar todos los archivos en paralelo con la metadata
      // La función uploadMultipleRfqFiles devuelve solo la ÚLTIMA respuesta
      const results = await uploadMultipleRfqFiles(selectedFiles, {
        proyecto: rfqMetadata.proyecto,
        proveedor: rfqMetadata.proveedor,
        tipoEvaluacion: rfqMetadata.tipoEvaluacion
      });

      // Detener simulación de progreso
      clearProgressTimer();

      // Guardar resultados (última respuesta con todos los datos actualizados)
      setResults(results);

      return true;
    } catch (error) {
      clearProgressTimer();

      let errorMessage = 'Error desconocido al procesar los archivos';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      return false;
    }
  }, [selectedFiles, rfqMetadata, startProcessing, simulateProgress, clearProgressTimer, setResults, setError]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearProgressTimer();
    };
  }, [clearProgressTimer]);

  return useMemo(() => ({
    handleUpload,
    isProcessing
  }), [handleUpload, isProcessing]);
}
