import { useState, useMemo, useEffect } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useScoringStore } from '../../stores/useScoringStore';
import { useScoringConfigStore } from '../../stores/useScoringConfigStore';
import { useScoringAuditStore, ScoringSimulation } from '../../stores/useScoringAuditStore';

// ============================================
// TYPES
// ============================================

interface ScenarioSimulatorProps {
  projectId: string;
}

interface SimulatedProvider {
  name: string;
  originalScore: number;
  originalPosition: number;
  simulatedScore: number;
  simulatedPosition: number;
  positionChange: number;
}

// ============================================
// COMPONENT
// ============================================

export const ScenarioSimulator = ({ projectId }: ScenarioSimulatorProps) => {
  const { language } = useLanguageStore();
  const { scoringResults } = useScoringStore();
  const { categories } = useScoringConfigStore();
  const {
    simulations,
    loadSimulations,
    saveSimulation,
    deleteSimulation,
  } = useScoringAuditStore();

  // Build initial weights from categories
  const originalWeights = useMemo(() => {
    const w: Record<string, number> = {};
    categories.forEach((cat) => {
      w[cat.name] = cat.weight;
    });
    return w;
  }, [categories]);

  const [simWeights, setSimWeights] = useState<Record<string, number>>({ ...originalWeights });
  const [scenarioName, setScenarioName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);

  // Load simulations on mount
  useEffect(() => {
    if (projectId) {
      loadSimulations(projectId);
    }
  }, [projectId, loadSimulations]);

  // Reset simWeights when categories change
  useEffect(() => {
    setSimWeights({ ...originalWeights });
  }, [originalWeights]);

  // Client-side recalculation
  const simulatedRanking: SimulatedProvider[] = useMemo(() => {
    if (!scoringResults?.ranking || categories.length === 0) return [];

    const ranking = scoringResults.ranking;

    // Build original sorted list
    const originalSorted = [...ranking].sort((a, b) => b.overall_score - a.overall_score);

    // Calculate total simulated weight for normalization
    const totalSimWeight = Object.values(simWeights).reduce((s, v) => s + v, 0) || 1;

    // Recalculate scores with new weights
    const recalculated = ranking.map((provider) => {
      let simScore = 0;

      categories.forEach((cat) => {
        const catName = cat.name.toLowerCase();
        const catScore = provider.scores[catName] ?? 0;
        const newWeight = (simWeights[cat.name] ?? cat.weight) / totalSimWeight;
        // Category scores are 0-10, weight is 0-1 after normalization
        simScore += catScore * newWeight;
      });

      // If no category scores available, use individual_scores approach
      if (simScore === 0 && Object.keys(provider.individual_scores).length > 0) {
        // Aggregate individual scores into categories using the config
        categories.forEach((cat) => {
          const criteria = cat.criteria || [];
          let catScore = 0;
          let totalCritWeight = 0;

          criteria.forEach((crit) => {
            const critScore = provider.individual_scores[crit.name] ?? 0;
            catScore += critScore * crit.weight;
            totalCritWeight += crit.weight;
          });

          if (totalCritWeight > 0) {
            catScore = catScore / totalCritWeight;
          }

          const newWeight = (simWeights[cat.name] ?? cat.weight) / totalSimWeight;
          simScore += catScore * newWeight;
        });
      }

      return {
        name: provider.provider_name,
        originalScore: provider.overall_score,
        simulatedScore: Math.round(simScore * 100) / 100,
      };
    });

    // Sort both by their respective scores
    const simSorted = [...recalculated].sort((a, b) => b.simulatedScore - a.simulatedScore);

    return simSorted.map((item, simIdx) => {
      const origIdx = originalSorted.findIndex((o) => o.provider_name === item.name);
      return {
        ...item,
        originalPosition: origIdx + 1,
        simulatedPosition: simIdx + 1,
        positionChange: origIdx - simIdx, // positive = moved up, negative = moved down
      };
    });
  }, [scoringResults, categories, simWeights]);

  const handleSliderChange = (catName: string, value: number) => {
    setSimWeights((prev) => ({ ...prev, [catName]: value }));
  };

  const handleReset = () => {
    setSimWeights({ ...originalWeights });
    setSelectedSimId(null);
  };

  const handleSave = async () => {
    if (!scenarioName.trim()) return;
    const resultData: Record<string, unknown> = {};
    simulatedRanking.forEach((p) => {
      resultData[p.name] = {
        score: p.simulatedScore,
        position: p.simulatedPosition,
        positionChange: p.positionChange,
      };
    });
    await saveSimulation(projectId, scenarioName.trim(), simWeights, resultData);
    setScenarioName('');
    setShowSaveInput(false);
  };

  const handleLoadScenario = (sim: ScoringSimulation) => {
    const weights = sim.alternative_weights as Record<string, number>;
    setSimWeights(weights);
    setSelectedSimId(sim.id);
  };

  const totalSimWeight = Object.values(simWeights).reduce((s, v) => s + v, 0);
  const isWeightValid = Math.abs(totalSimWeight - 100) < 0.5;

  if (!scoringResults?.ranking || scoringResults.ranking.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {language === 'es' ? 'Sin datos de scoring' : 'No scoring data'}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
          {language === 'es'
            ? 'Ejecuta el scoring IA primero para poder simular escenarios.'
            : 'Run AI scoring first to simulate scenarios.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {language === 'es' ? 'Simulador de Escenarios' : 'Scenario Simulator'}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            {language === 'es'
              ? 'Ajusta los pesos de las categorias para ver como cambia el ranking.'
              : 'Adjust category weights to see how rankings change.'}
          </p>
        </div>

        {/* Load scenario dropdown */}
        {simulations.length > 0 && (
          <select
            value={selectedSimId || ''}
            onChange={(e) => {
              const sim = simulations.find((s) => s.id === e.target.value);
              if (sim) handleLoadScenario(sim);
              else handleReset();
            }}
            style={{
              padding: '6px 10px',
              background: 'var(--bg-surface-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="">{language === 'es' ? 'Cargar escenario...' : 'Load scenario...'}</option>
            {simulations.map((sim) => (
              <option key={sim.id} value={sim.id}>
                {sim.name}
              </option>
            ))}
          </select>
        )}

        {/* Reset */}
        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {language === 'es' ? 'Reiniciar' : 'Reset'}
        </button>

        {/* Save */}
        {showSaveInput ? (
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={language === 'es' ? 'Nombre del escenario...' : 'Scenario name...'}
              autoFocus
              style={{
                padding: '6px 10px',
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--color-primary)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                outline: 'none',
                boxShadow: '0 0 0 3px var(--color-primary-light)',
                width: '160px',
              }}
            />
            <button
              onClick={handleSave}
              disabled={!scenarioName.trim()}
              style={{
                padding: '6px 10px',
                background: 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: scenarioName.trim() ? 'pointer' : 'not-allowed',
                opacity: scenarioName.trim() ? 1 : 0.5,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              onClick={() => {
                setShowSaveInput(false);
                setScenarioName('');
              }}
              style={{
                padding: '6px 10px',
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveInput(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              background: 'var(--color-primary-light)',
              border: '1px solid var(--color-primary)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {language === 'es' ? 'Guardar' : 'Save'}
          </button>
        )}
      </div>

      {/* Two-column layout: weights | ranking comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: '16px',
        }}
      >
        {/* LEFT: Weight sliders */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {language === 'es' ? 'Pesos de Categorias' : 'Category Weights'}
          </div>

          {categories.map((cat) => {
            const currentWeight = simWeights[cat.name] ?? cat.weight;
            const origWeight = originalWeights[cat.name] ?? cat.weight;
            const isChanged = Math.abs(currentWeight - origWeight) > 0.5;

            return (
              <div key={cat.name} style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: cat.color || 'var(--color-primary)',
                        flexShrink: 0,
                      }}
                    />
                    {language === 'es' ? (cat.display_name_es || cat.display_name) : cat.display_name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: isChanged ? 'var(--color-primary)' : 'var(--text-secondary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {currentWeight}%
                    {isChanged && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--text-tertiary)',
                          marginLeft: '4px',
                        }}
                      >
                        ({origWeight}%)
                      </span>
                    )}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={currentWeight}
                  onChange={(e) => handleSliderChange(cat.name, Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    accentColor: cat.color || 'var(--color-primary)',
                    cursor: 'pointer',
                  }}
                />
              </div>
            );
          })}

          {/* Total weight indicator */}
          <div
            style={{
              padding: '10px 12px',
              background: isWeightValid ? 'var(--color-primary-light)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${isWeightValid ? 'var(--color-primary)' : '#ef4444'}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <span style={{ color: isWeightValid ? 'var(--color-primary)' : '#ef4444' }}>
              {language === 'es' ? 'Total' : 'Total'}
            </span>
            <span
              style={{
                color: isWeightValid ? 'var(--color-primary-dark)' : '#ef4444',
                fontFamily: 'monospace',
              }}
            >
              {totalSimWeight}%
            </span>
          </div>
        </div>

        {/* RIGHT: Ranking comparison */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            {language === 'es' ? 'Comparacion de Ranking' : 'Ranking Comparison'}
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.82rem',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {language === 'es' ? 'Proveedor' : 'Provider'}
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {language === 'es' ? 'Pos. Original' : 'Original Pos.'}
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {language === 'es' ? 'Score Original' : 'Original Score'}
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {language === 'es' ? 'Score Simulado' : 'Simulated Score'}
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {language === 'es' ? 'Pos. Simulada' : 'Simulated Pos.'}
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {language === 'es' ? 'Cambio' : 'Change'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {simulatedRanking.map((provider) => {
                  const isUp = provider.positionChange > 0;
                  const isDown = provider.positionChange < 0;
                  const hasChange = provider.positionChange !== 0;

                  return (
                    <tr
                      key={provider.name}
                      style={{
                        background: hasChange ? (isUp ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)') : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {provider.name}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          textAlign: 'center',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        #{provider.originalPosition}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          textAlign: 'center',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {provider.originalScore.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          textAlign: 'center',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {provider.simulatedScore.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          textAlign: 'center',
                          fontWeight: 600,
                          color: hasChange
                            ? isUp
                              ? '#10b981'
                              : '#ef4444'
                            : 'var(--text-secondary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        #{provider.simulatedPosition}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          textAlign: 'center',
                        }}
                      >
                        {hasChange ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: isUp ? '#10b981' : '#ef4444',
                              background: isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              style={{ transform: isDown ? 'rotate(180deg)' : 'none' }}
                            >
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                            {Math.abs(provider.positionChange)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Saved scenarios list */}
      {simulations.length > 0 && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
            }}
          >
            {language === 'es' ? 'Escenarios Guardados' : 'Saved Scenarios'}
            <span
              style={{
                marginLeft: '8px',
                fontSize: '0.7rem',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                background: 'var(--bg-surface-alt)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {simulations.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {simulations.map((sim) => (
              <div
                key={sim.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  background:
                    selectedSimId === sim.id ? 'var(--color-primary-light)' : 'var(--bg-surface-alt)',
                  border: `1px solid ${selectedSimId === sim.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onClick={() => handleLoadScenario(sim)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span
                  style={{
                    flex: 1,
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  {sim.name}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {new Date(sim.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSimulation(sim.id);
                    if (selectedSimId === sim.id) setSelectedSimId(null);
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: '1px solid transparent',
                    borderRadius: '4px',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
