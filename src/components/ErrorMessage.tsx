import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010b13] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center dark:bg-gray-900">
        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">An Error Occurred</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;