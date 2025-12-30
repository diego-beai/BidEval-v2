// DIAGNÓSTICO: Aplicación se ve blanca
// Vamos a probar importando componentes gradualmente

import { useState } from 'react';

export default function App() {
  const [step, setStep] = useState(1);
  console.log('🚀 App component is rendering - Step:', step);

  const nextStep = () => setStep(prev => prev + 1);

  return (
    <div style={{
      padding: '20px',
      color: 'white',
      backgroundColor: '#000',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#12b5b0' }}>🔧 DIAGNÓSTICO - P2X App</h1>
      <p>Paso actual: {step}</p>

      {step >= 1 && (
        <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#111', borderRadius: '8px' }}>
          <h2>✅ Paso 1: React básico funcionando</h2>
          <p>Fecha/Hora: {new Date().toLocaleString()}</p>
          <button onClick={nextStep} style={{ padding: '10px', margin: '10px 0' }}>Siguiente paso</button>
        </div>
      )}

      {step >= 2 && (
        <TestStep2 onNext={nextStep} />
      )}
    </div>
  );
}

function TestStep2({ onNext }: { onNext: () => void }) {
  console.log('🔄 TestStep2 rendering');

  return (
    <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#222', borderRadius: '8px' }}>
      <h2>🔍 Paso 2: Probando useState</h2>
      <p>Si ves este componente, useState funciona correctamente.</p>
      <button onClick={onNext} style={{ padding: '10px', margin: '10px 0' }}>Siguiente paso</button>
    </div>
  );
}
