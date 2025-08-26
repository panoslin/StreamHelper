import React from 'react';
import { Download } from 'lucide-react';

export const Downloads: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Downloads</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your download queue and monitor progress
        </p>
      </div>
      
      <div className="card">
        <div className="card-body text-center py-12">
          <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Downloads Page
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This page will show your download queue and progress
          </p>
        </div>
      </div>
    </div>
  );
};
