import React from 'react';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <TopHeader />
      <main className="pt-14 pb-20 min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;
