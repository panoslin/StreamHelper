import React from 'react';
import { 
  Download, 
  Radio, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Pause,
  Trash2,
  Plus
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { streams, downloads, downloadQueue, connectionStatus } = useAppStore();

  const stats = [
    {
      name: 'Total Streams',
      value: streams.length,
      icon: Radio,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100 dark:bg-primary-900/20',
    },
    {
      name: 'Active Downloads',
      value: downloadQueue.active,
      icon: Download,
      color: 'text-success-600',
      bgColor: 'bg-success-100 dark:bg-success-900/20',
    },
    {
      name: 'Completed',
      value: downloadQueue.completed,
      icon: CheckCircle,
      color: 'text-success-600',
      bgColor: 'bg-success-100 dark:bg-success-900/20',
    },
    {
      name: 'Failed',
      value: downloadQueue.failed,
      icon: AlertCircle,
      color: 'text-error-600',
      bgColor: 'bg-error-100 dark:bg-error-900/20',
    },
  ];

  const quickActions = [
    {
      name: 'Start All Downloads',
      description: 'Begin all pending downloads',
      icon: Play,
      action: () => {
        // TODO: Implement start all downloads
        console.log('Start all downloads');
      },
      color: 'text-success-600',
      bgColor: 'bg-success-100 dark:bg-success-900/20',
    },
    {
      name: 'Pause All Downloads',
      description: 'Pause all active downloads',
      icon: Pause,
      action: () => {
        // TODO: Implement pause all downloads
        console.log('Pause all downloads');
      },
      color: 'text-warning-600',
      bgColor: 'bg-warning-100 dark:bg-warning-900/20',
    },
    {
      name: 'Clear Completed',
      description: 'Remove completed downloads from list',
      icon: Trash2,
      action: () => {
        // TODO: Implement clear completed
        console.log('Clear completed');
      },
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
    },
    {
      name: 'Add Stream',
      description: 'Manually add a new stream URL',
      icon: Plus,
      action: () => {
        // TODO: Implement add stream
        console.log('Add stream');
      },
      color: 'text-primary-600',
      bgColor: 'bg-primary-100 dark:bg-primary-900/20',
    },
  ];

  const recentStreams = streams.slice(0, 5);
  const recentDownloads = downloads.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview of your StreamHelper activity and downloads
        </p>
      </div>

      {/* Connection status */}
      <div className={`p-4 rounded-lg border ${
        connectionStatus.connected 
          ? 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800'
          : 'bg-error-50 border-error-200 dark:bg-error-900/20 dark:border-error-800'
      }`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus.connected ? 'bg-success-500' : 'bg-error-500'
          }`} />
          <span className="ml-3 text-sm font-medium">
            {connectionStatus.connected 
              ? 'Connected to StreamHelper extension' 
              : 'Disconnected from StreamHelper extension'
            }
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.name}
                  onClick={action.action}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-200 text-left group"
                >
                  <div className={`p-2 rounded-lg ${action.bgColor} w-fit group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                    {action.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent streams */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Streams</h2>
              <Link 
                to="/streams" 
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="card-body">
            {recentStreams.length > 0 ? (
              <div className="space-y-3">
                {recentStreams.map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {stream.pageTitle}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {stream.url}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className={`badge ${
                        stream.status === 'completed' ? 'badge-success' :
                        stream.status === 'downloading' ? 'badge-info' :
                        stream.status === 'error' ? 'badge-error' :
                        'badge-warning'
                      }`}>
                        {stream.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No streams captured yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Start browsing with the StreamHelper extension to capture streams
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent downloads */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Downloads</h2>
              <Link 
                to="/downloads" 
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="card-body">
            {recentDownloads.length > 0 ? (
              <div className="space-y-3">
                {recentDownloads.map((download) => (
                  <div key={download.streamId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        Stream {download.streamId}
                      </p>
                      <div className="mt-1">
                        <div className="progress-bar">
                          <div 
                            className={`progress-fill ${download.status === 'completed' ? 'progress-success' : 'progress-primary'}`}
                            style={{ width: `${download.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {download.percentage}% • {download.speed}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`badge ${
                        download.status === 'completed' ? 'badge-success' :
                        download.status === 'downloading' ? 'badge-info' :
                        'badge-warning'
                      }`}>
                        {download.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No downloads yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Start downloading streams to see progress here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
