import React from 'react';
import { useNotifications } from '@/context/NotificationContext';

const NotificationContainer: React.FC = () => {
  const { notifications, hideNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-5 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification ${notification.type === 'error' ? 'error' : notification.type === 'warning' ? 'warning' : notification.type === 'info' ? 'info' : ''}`}
          onClick={() => hideNotification(notification.id)}
        >
          <div className="font-medium">
            {notification.message}
          </div>
          <button
            className="absolute top-2 right-2 text-white hover:text-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              hideNotification(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;