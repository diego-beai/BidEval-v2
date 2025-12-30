import { AppLayout } from './components/layout/AppLayout';
import { FileUploadZone } from './components/upload/FileUploadZone';
import { SelectedFileCard } from './components/upload/SelectedFileCard';
import { ProcessingStatus } from './components/processing/ProcessingStatus';
import { LazyResultsTable } from './components/results/ResultsTable.lazy';
import { Preloader } from './components/ui/Preloader';
import { useRfqStore } from './stores/useRfqStore';
import { useRfqProcessing } from './hooks/useRfqProcessing';

export default function App() {
  const { selectedFiles, reset, isProcessing, results } = useRfqStore();
  const { handleUpload } = useRfqProcessing();

  return (
    <AppLayout>
      <Preloader />
      <div className="card">
        <div className="cardHeader">
          <div className="brand">
            <img src="/logo.png" className="brandLogo" alt="P2X Logo" />
            <h1 className="title">Procesador de Propuestas</h1>
            <p className="desc">
              Procesamiento automático de Propuestas con análisis de múltiples proveedores con IA
            </p>
          </div>
        </div>

        <div className="form">
          <div className="field">
            <label className="label">Cargar Propuesta de Proveedor (PDF)</label>

            <FileUploadZone />

            <SelectedFileCard />

            <p className="hint">
              Proveedores soportados: Técnicas Reunidas, IDOM, SACYR, Empresarios Agrupados, SENER, TRESCA, WORLEY
            </p>
          </div>

          <div className="actions">
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isProcessing}
              className="btn btnPrimary"
            >
              {isProcessing
                ? `Procesando ${selectedFiles.length} archivo${selectedFiles.length > 1 ? 's' : ''}...`
                : `Procesar ${selectedFiles.length || ''} Propuesta${selectedFiles.length > 1 ? 's' : selectedFiles.length === 1 ? '' : 's'}`
              }
            </button>

            {(selectedFiles.length > 0 || results) && !isProcessing && (
              <button
                onClick={reset}
                className="btn btnSecondary"
              >
                Reiniciar
              </button>
            )}
          </div>

          <ProcessingStatus />
          <LazyResultsTable />
        </div>
      </div>
    </AppLayout>
  );
}
