import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { usePrefetch } from '@/hooks/usePrefetch';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  // Prefetch key data on first render for instant navigation
  usePrefetch();
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-sidebar min-h-screen">
        <div className="max-w-[1440px] mx-auto p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
};
