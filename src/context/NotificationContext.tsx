import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import NotificationModal from '../components/common/NotificationModal';
import ConfirmationModal from '../components/common/ConfirmationModal';

type NotificationType = 'success' | 'error' | 'info';
type ConfirmationType = 'warning' | 'success';

interface NotificationState {
  isOpen: boolean;
  title: string;
  message: string;
  type: NotificationType;
}

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  type: ConfirmationType; 
}

interface NotificationContextType {
  showNotification: (title: string, message: string, type?: NotificationType) => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void, type?: ConfirmationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning', 
  });

  const showNotification = useCallback((title: string, message: string, type: NotificationType = 'info') => {
    setNotification({ isOpen: true, title, message, type });
  }, []);

  const showConfirmation = useCallback((title: string, message: string, onConfirm: () => void, type: ConfirmationType = 'warning') => {
    setConfirmation({ isOpen: true, title, message, onConfirm, type });
  }, []);

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    confirmation.onConfirm();
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirmation }}>
      {children}
      <NotificationModal {...notification} onClose={closeNotification} />
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        type={confirmation.type}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};