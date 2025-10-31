import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NotificationItem } from '@/types';
import { generateId } from '@/utils/helpers';

interface NotificationContextType {
  notifications: NotificationItem[];
  showNotification: (message: string, type?: NotificationItem['type'], duration?: number) => void;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const showNotification = useCallback((
    message: string,
    type: NotificationItem['type'] = 'info',
    duration: number = 5000
  ) => {
    const notification: NotificationItem = {
      id: generateId(),
      type,
      message,
      duration,
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-hide notification
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(notification.id);
      }, duration);
    }
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    hideNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};