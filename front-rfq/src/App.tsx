import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { RfqBaseUploader } from './components/upload/RfqBaseUploader';
import { FileUploadZone } from './components/upload/FileUploadZone';
import { RfqMetadataForm } from './components/upload/RfqMetadataForm';
import { ProcessingStatus } from './components/processing/ProcessingStatus';
import { LazyResultsTable } from './components/results/ResultsTable.lazy';
import { Preloader } from './components/ui/Preloader';
import { useRfqStore } from './stores/useRfqStore';
import { useRfqProcessing } from './hooks/useRfqProcessing';

type TabType = 'rfq' | 'propuestas';

export default function App() {
  const { selectedFiles, reset, isProcessing, results, error, processingFileCount, rfqMetadata, setRfqMetadata } = useRfqStore();
  const { handleUpload } = useRfqProcessing();
  const [activeTab, setActiveTab] = useState<TabType>('rfq');

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
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'rfq' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('rfq')}
            >
              RFQ de Referencia
            </button>
            <button
              className={`tab ${activeTab === 'propuestas' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('propuestas')}
            >
              Propuestas de Proveedores
            </button>
          </div>

          {/* Contenido de RFQ Base */}
          {activeTab === 'rfq' && (
            <RfqBaseUploader />
          )}

          {/* Contenido de Propuestas */}
          {activeTab === 'propuestas' && (
            <>
              {/* Mostrar zona de carga solo si no hay resultados */}
              {!results && (
                <>
                  {/* Formulario de metadata */}
                  <RfqMetadataForm
                    metadata={rfqMetadata}
                    onChange={setRfqMetadata}
                    disabled={isProcessing}
                  />

                  <div className="field">
                    <FileUploadZone />

                    <p className="hint">
                      Proveedores soportados: Técnicas Reunidas, IDOM, SACYR, Empresarios Agrupados, SENER, TRESCA, WORLEY
                    </p>
                  </div>

                  <div className="actions">
                    <button
                      onClick={handleUpload}
                      disabled={selectedFiles.length === 0 || isProcessing}
                      className={`btn ${error ? 'btnDanger' : 'btnPrimary'}`}
                    >
                      {error
                        ? 'Error'
                        : isProcessing
                        ? `Procesando ${processingFileCount} archivo${processingFileCount > 1 ? 's' : ''}...`
                        : `Procesar ${selectedFiles.length || ''} Propuesta${selectedFiles.length > 1 ? 's' : selectedFiles.length === 1 ? '' : 's'}`
                      }
                    </button>

                    {selectedFiles.length > 0 && !isProcessing && (
                      <button
                        onClick={reset}
                        className="btn btnSecondary"
                      >
                        Reiniciar
                      </button>
                    )}
                  </div>
                </>
              )}

              <ProcessingStatus />

              {/* Mostrar resultados y botón reiniciar abajo */}
              {results && (
                <>
                  <LazyResultsTable />

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', paddingBottom: '24px' }}>
                    <button
                      onClick={reset}
                      className="btn btnReset"
                    >
                      Reiniciar
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Tabla solo visible fuera de propuestas o si no hay resultados */}
          {activeTab !== 'propuestas' && <LazyResultsTable />}
        </div>
      </div>
    </AppLayout>
  );
}
