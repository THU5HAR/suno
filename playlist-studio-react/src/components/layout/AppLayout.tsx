import React from 'react';
import TopToolbar from './TopToolbar';
import StepNavigation from './StepNavigation';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { usePlaylist } from '@/context/PlaylistContext';

const AppLayout: React.FC = () => {
  const { currentStep } = usePlaylist();
  
  // For Design step (step 2), hide the default sidebar - it has its own layout
  const showDefaultSidebar = currentStep !== 2;
  
  return (
    <div className="min-h-screen bg-white">
      <TopToolbar />
      <StepNavigation />
      <div className="flex h-[calc(100vh-140px)]">
        {showDefaultSidebar && <Sidebar />}
        <MainContent />
      </div>
    </div>
  );
};

export default AppLayout;