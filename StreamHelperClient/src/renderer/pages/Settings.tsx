import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure application preferences and download options
        </p>
      </div>
      
      <div className="card">
        <div className="card-body text-center py-12">
          <SettingsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Settings Page
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This page will allow you to configure download settings, yt-dlp options, and more
          </p>
        </div>
      </div>
    </div>
  );
};
