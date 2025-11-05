import React from 'react';
import TopToolbar from './TopToolbar';
import StepNavigation from './StepNavigation';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <TopToolbar />
      <StepNavigation />
      <div className="flex h-[calc(100vh-140px)]">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
};

export default AppLayout;
