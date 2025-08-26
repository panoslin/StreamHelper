import React from 'react';
import { Radio } from 'lucide-react';

export const Streams: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Streams</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View and manage captured streams from the extension
        </p>
      </div>
      
      <div className="card">
        <div className="card-body text-center py-12">
          <Radio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Streams Page
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This page will show all captured streams and allow you to manage them
          </p>
        </div>
      </div>
    </div>
  );
};
