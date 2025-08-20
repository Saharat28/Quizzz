import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const Icon = type === 'warning' ? AlertTriangle : CheckCircle;
  const iconColor = type === 'warning' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  const iconBgColor = type === 'warning' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50';
  const confirmButtonColor = type === 'warning'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      autoFocus
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all duration-300 scale-100 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:flex sm:items-start">
          <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${iconBgColor} sm:mx-0 sm:h-10 sm:w-10`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white">{title}</h3>
            <div className="mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white ${confirmButtonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm`}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:mt-0 sm:w-auto sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ConfirmationModal;