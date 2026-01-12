import { ReactNode } from 'react';
import { Footer } from './Footer';
import { ChatWidget } from '../chat/ChatWidget';
import { ThemeToggle } from '../ui/ThemeToggle';

interface AppLayoutProps {
  children: ReactNode;
  wideContent?: ReactNode;
}

export function AppLayout({ children, wideContent }: AppLayoutProps) {
  return (
    <div className="app-container">
      <header className="page-header">
        <div className="brand-section">
          <div>
            <h1 className="brand-title">Bideval AI</h1>
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Análisis Automático de RFQs y Ofertas
            </small>
          </div>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          {/* Placeholder for user profile if needed */}
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-secondary)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: 'bold' }}>
            B
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {children}
        {wideContent}
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}
