import { ReactNode } from 'react';
import { Footer } from './Footer';
import { ChatWidget } from '../chat/ChatWidget';

interface AppLayoutProps {
  children: ReactNode;
  wideContent?: ReactNode;
}

export function AppLayout({ children, wideContent }: AppLayoutProps) {
  return (
    <>
      <main className="page">
        <div className="shell">
          {children}
        </div>
        {wideContent}
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
