import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { PlaylistProvider } from '@/context/PlaylistContext';
import { NotificationProvider } from '@/context/NotificationContext';
import AppLayout from '@/components/layout/AppLayout';
import NotificationContainer from '@/components/common/NotificationContainer';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PlaylistProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50">
            <AppLayout />
            <NotificationContainer />
          </div>
        </NotificationProvider>
      </PlaylistProvider>
    </AuthProvider>
  );
};

export default App;
