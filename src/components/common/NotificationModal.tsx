import React from 'react';
import { CheckCircle, AlertTriangle, X, Info } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const icons = {
  success: <CheckCircle className="h-8 w-8 text-green-500" />,
  error: <AlertTriangle className="h-8 w-8 text-red-500" />,
  info: <Info className="h-8 w-8 text-blue-500" />,
};

const bgColors = {
  success: 'bg-green-100',
  error: 'bg-red-100',
  info: 'bg-blue-100',
};

const buttonColors = {
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    error: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, title, message, type, onClose }) => {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      autoFocus
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${bgColors[type]} mb-5`}>
          {icons[type]}
        </div>
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <div className="mt-2 px-4 text-sm">
          <p className="text-gray-600 whitespace-pre-wrap">{message}</p>
        </div>
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-3 text-base font-medium text-white ${buttonColors[type]} focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            ตกลง
          </button>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;