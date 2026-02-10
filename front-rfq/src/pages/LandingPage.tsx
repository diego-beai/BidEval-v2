import React from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onEnterApp: () => void;
  language?: 'es' | 'en';
}

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    color: '#12b5b0',
    titleEs: 'Ingesta inteligente de RFPs',
    titleEn: 'Smart RFP ingestion',
    descEs: 'Sube documentos PDF de licitaciones y nuestra IA extrae automáticamente requisitos, criterios y tipos de evaluación.',
    descEn: 'Upload bid PDF documents and our AI automatically extracts requirements, criteria, and evaluation types.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    color: '#3b82f6',
    titleEs: 'Scoring automatizado',
    titleEn: 'Automated scoring',
    descEs: 'Evaluación multicriteria con pesos configurables: técnico, económico, ejecución y HSE/ESG. Resultados objetivos y trazables.',
    descEn: 'Multi-criteria evaluation with configurable weights: technical, economic, execution, and HSE/ESG. Objective, traceable results.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: '#f59e0b',
    titleEs: 'Gestión de proveedores',
    titleEn: 'Supplier management',
    descEs: 'Compara ofertas de múltiples proveedores lado a lado. Visualiza fortalezas, debilidades y gaps de cumplimiento.',
    descEn: 'Compare bids from multiple suppliers side by side. Visualize strengths, weaknesses, and compliance gaps.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    color: '#8b5cf6',
    titleEs: 'Q&A con proveedores',
    titleEn: 'Supplier Q&A',
    descEs: 'Genera preguntas técnicas automáticamente y envíalas a proveedores. Recibe y evalúa respuestas en un solo lugar.',
    descEn: 'Auto-generate technical questions and send them to suppliers. Receive and evaluate responses in one place.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    color: '#06b6d4',
    titleEs: 'Asistente IA',
    titleEn: 'AI assistant',
    descEs: 'Chat con tus documentos. Pregunta sobre requisitos específicos, compara cláusulas o genera resúmenes ejecutivos.',
    descEn: 'Chat with your documents. Ask about specific requirements, compare clauses, or generate executive summaries.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    color: '#10b981',
    titleEs: 'Tabla de resultados',
    titleEn: 'Results table',
    descEs: 'Vista ejecutiva con ranking de proveedores, desglose por categoría y exportación a informes profesionales.',
    descEn: 'Executive view with provider ranking, category breakdown, and export to professional reports.',
  },
];

const STEPS_DATA = [
  { numEs: '1', titleEs: 'Sube tu RFP', titleEn: 'Upload your RFP', descEs: 'Carga los documentos de licitación en PDF.', descEn: 'Upload your bid documents in PDF format.' },
  { numEs: '2', titleEs: 'Recibe ofertas', titleEn: 'Receive bids', descEs: 'Los proveedores envían sus propuestas.', descEn: 'Suppliers submit their proposals.' },
  { numEs: '3', titleEs: 'IA evalúa', titleEn: 'AI evaluates', descEs: 'Scoring automatizado multicriteria.', descEn: 'Automated multi-criteria scoring.' },
  { numEs: '4', titleEs: 'Decide', titleEn: 'Decide', descEs: 'Compara resultados y toma la mejor decisión.', descEn: 'Compare results and make the best decision.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, language = 'es' }) => {
  const isEs = language === 'es';

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <span style={{ color: 'white' }}>Bid</span>
          <span style={{ color: 'var(--lp-accent)' }}>Eval</span>
        </div>
        <div className="lp-nav-links">
          <a href="#features">{isEs ? 'Funcionalidades' : 'Features'}</a>
          <a href="#how">{isEs ? 'Cómo funciona' : 'How it works'}</a>
          <a href="#stats">{isEs ? 'Resultados' : 'Results'}</a>
          <button className="lp-btn lp-btn-primary" onClick={onEnterApp}>
            {isEs ? 'Acceder' : 'Get started'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-hero-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {isEs ? 'Evaluación de licitaciones con IA' : 'AI-powered bid evaluation'}
        </div>
        <h1>
          {isEs ? (
            <>Evalúa licitaciones <span className="accent">10x más rápido</span></>
          ) : (
            <>Evaluate bids <span className="accent">10x faster</span></>
          )}
        </h1>
        <p className="lp-hero-subtitle">
          {isEs
            ? 'BidEval automatiza la evaluación de ofertas con inteligencia artificial. Scoring multicriteria, Q&A con proveedores y decisiones basadas en datos.'
            : 'BidEval automates bid evaluation with artificial intelligence. Multi-criteria scoring, supplier Q&A, and data-driven decisions.'}
        </p>
        <div className="lp-hero-actions">
          <button className="lp-btn lp-btn-primary lp-btn-large" onClick={onEnterApp}>
            {isEs ? 'Empezar ahora' : 'Get started'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <a href="#how" className="lp-btn lp-btn-outline lp-btn-large">
            {isEs ? 'Ver demo' : 'See demo'}
          </a>
        </div>

        {/* Mock dashboard visual */}
        <div className="lp-hero-visual">
          <div className="lp-hero-visual-inner">
            <div className="lp-mock-header">
              <div className="lp-mock-dot" style={{ background: '#ef4444' }} />
              <div className="lp-mock-dot" style={{ background: '#f59e0b' }} />
              <div className="lp-mock-dot" style={{ background: '#10b981' }} />
              <div style={{ marginLeft: 'auto', height: '10px', width: '120px', borderRadius: '5px', background: 'rgba(148, 163, 184, 0.15)' }} />
            </div>
            <div className="lp-mock-bars">
              {[75, 60, 85, 45, 70].map((h, i) => (
                <div key={i} className="lp-mock-bar" style={{
                  height: `${h}%`,
                  background: `linear-gradient(180deg, ${['#12b5b0', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'][i]}, ${['#12b5b0', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'][i]}88)`
                }} />
              ))}
            </div>
            <div className="lp-mock-labels">
              {[0, 1, 2, 3, 4].map(i => <div key={i} className="lp-mock-label" />)}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="lp-section">
        <div className="lp-section-header">
          <h2>{isEs ? 'Todo lo que necesitas' : 'Everything you need'}</h2>
          <p>
            {isEs
              ? 'Una plataforma completa para gestionar el ciclo de vida de licitaciones, desde la recepción de RFPs hasta la decisión final.'
              : 'A complete platform to manage the bid lifecycle, from RFP receipt to final decision.'}
          </p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="lp-feature-card">
              <div className="lp-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                {f.icon}
              </div>
              <h3>{isEs ? f.titleEs : f.titleEn}</h3>
              <p>{isEs ? f.descEs : f.descEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="lp-section">
        <div className="lp-section-header">
          <h2>{isEs ? 'Cómo funciona' : 'How it works'}</h2>
          <p>{isEs ? 'Cuatro pasos simples para evaluar licitaciones con IA.' : 'Four simple steps to evaluate bids with AI.'}</p>
        </div>
        <div className="lp-steps">
          {STEPS_DATA.map((s, i) => (
            <div key={i} className="lp-step">
              <div className="lp-step-number">{i + 1}</div>
              <h4>{isEs ? s.titleEs : s.titleEn}</h4>
              <p>{isEs ? s.descEs : s.descEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="lp-section">
        <div className="lp-stats">
          <div className="lp-stat">
            <div className="lp-stat-value">10x</div>
            <div className="lp-stat-label">{isEs ? 'Más rápido que evaluación manual' : 'Faster than manual evaluation'}</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-value">95%</div>
            <div className="lp-stat-label">{isEs ? 'Precisión en extracción de requisitos' : 'Requirements extraction accuracy'}</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-value">4</div>
            <div className="lp-stat-label">{isEs ? 'Categorías de evaluación' : 'Evaluation categories'}</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-value">0</div>
            <div className="lp-stat-label">{isEs ? 'Sesgo humano en scoring' : 'Human bias in scoring'}</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="lp-cta">
        <h2>{isEs ? 'Empieza a evaluar hoy' : 'Start evaluating today'}</h2>
        <p>
          {isEs
            ? 'Configura tu primera licitación en menos de 5 minutos.'
            : 'Set up your first bid evaluation in under 5 minutes.'}
        </p>
        <button className="lp-btn lp-btn-primary lp-btn-large" onClick={onEnterApp}>
          {isEs ? 'Acceder a BidEval' : 'Access BidEval'}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {/* Footer */}
      <footer className="lp-footer">
        <p>
          <span style={{ fontWeight: 700 }}>Bid</span><span style={{ color: 'var(--lp-accent)', fontWeight: 700 }}>Eval</span>
          {' '}&copy; {new Date().getFullYear()}.{' '}
          {isEs ? 'Evaluación de licitaciones potenciada con IA.' : 'AI-powered bid evaluation.'}
        </p>
      </footer>
    </div>
  );
};
