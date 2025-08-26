import React from 'react';
import { Radio, Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Radio className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          StreamHelper Client
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Initializing application...
        </p>
        
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Loading components
          </span>
        </div>
      </div>
    </div>
  );
};
