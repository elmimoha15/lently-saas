import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

interface AskAILayoutProps {
  children: ReactNode;
}

/**
 * Layout wrapper for Ask AI page.
 * Uses fixed height (100vh) to ensure full viewport height for proper sidebar stretching.
 */
export const AskAILayout = ({ children }: AskAILayoutProps) => {
  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <Sidebar />
      <main className="absolute inset-0 left-sidebar flex overflow-hidden">
        {children}
      </main>
    </div>
  );
};
