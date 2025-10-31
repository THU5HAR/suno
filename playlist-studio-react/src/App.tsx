import React from 'react';
import { PlaylistProvider } from '@/context/PlaylistContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { CanvasProvider } from '@/context/CanvasContext';
import AppLayout from '@/components/layout/AppLayout';
import NotificationContainer from '@/components/common/NotificationContainer';

const App: React.FC = () => {
  return (
    <PlaylistProvider>
      <NotificationProvider>
        <CanvasProvider>
          <div className="min-h-screen bg-gray-50">
            <AppLayout />
            <NotificationContainer />
          </div>
        </CanvasProvider>
      </NotificationProvider>
    </PlaylistProvider>
  );
};

export default App;