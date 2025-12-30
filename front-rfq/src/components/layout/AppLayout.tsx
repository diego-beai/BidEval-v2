import { ReactNode } from 'react';
import { Footer } from './Footer';
import { ChatWidget } from '../chat/ChatWidget';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <main className="page">
        <div className="shell">
          {children}
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
