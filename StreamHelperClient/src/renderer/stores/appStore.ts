import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { StreamData, DownloadProgress, AppConfig, ClientStatus } from '@/types';

interface AppState {
  // Application state
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Streams
  streams: StreamData[];
  selectedStream: StreamData | null;
  
  // Downloads
  downloads: DownloadProgress[];
  downloadQueue: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  };
  
  // Configuration
  config: AppConfig | null;
  
  // Connection status
  connectionStatus: ClientStatus;
  
  // Actions
  initializeApp: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Stream actions
  addStream: (stream: StreamData) => void;
  updateStream: (streamId: string, updates: Partial<StreamData>) => void;
  removeStream: (streamId: string) => void;
  selectStream: (stream: StreamData | null) => void;
  clearStreams: () => void;
  
  // Download actions
  addDownload: (download: DownloadProgress) => void;
  updateDownload: (streamId: string, updates: Partial<DownloadProgress>) => void;
  removeDownload: (streamId: string) => void;
  clearDownloads: () => void;
  updateDownloadQueue: (queue: any) => void;
  
  // Configuration actions
  setConfig: (config: AppConfig) => void;
  updateConfig: (updates: Partial<AppConfig>) => void;
  
  // Connection actions
  updateConnectionStatus: (status: Partial<ClientStatus>) => void;
  
  // WebSocket event handlers
  setupWebSocketListeners: () => void;
  cleanupWebSocketListeners: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isInitialized: false,
      isLoading: false,
      error: null,
      streams: [],
      selectedStream: null,
      downloads: [],
      downloadQueue: {
        pending: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
      config: null,
      connectionStatus: {
        connected: false,
        version: '1.0.0',
        platform: 'unknown',
        downloadQueue: 0,
        activeDownloads: 0,
      },

      // Initialize application
      initializeApp: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Load configuration
          const config = await window.electronAPI.config.getAppConfig();
          set({ config });
          
          
          
          // Load initial data
          await Promise.all([
            get().loadStreams(),
            get().loadDownloads(),
            get().loadConnectionStatus(),
          ]);
          
          set({ isInitialized: true, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize application';
          set({ error: errorMessage, isLoading: false });
        }
      },

      // Error handling
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),

      // Stream management
      addStream: (stream: StreamData) => {
        set((state) => ({
          streams: [stream, ...state.streams].slice(0, 100), // Keep only last 100 streams
        }));
      },

      updateStream: (streamId: string, updates: Partial<StreamData>) => {
        set((state) => ({
          streams: state.streams.map((stream) =>
            stream.id === streamId ? { ...stream, ...updates } : stream
          ),
        }));
      },

      removeStream: (streamId: string) => {
        set((state) => ({
          streams: state.streams.filter((stream) => stream.id !== streamId),
        }));
      },

      selectStream: (stream: StreamData | null) => set({ selectedStream: stream }),
      clearStreams: () => set({ streams: [] }),

      // Download management
      addDownload: (download: DownloadProgress) => {
        set((state) => ({
          downloads: [download, ...state.downloads.filter(d => d.streamId !== download.streamId)],
        }));
      },

      updateDownload: (streamId: string, updates: Partial<DownloadProgress>) => {
        set((state) => ({
          downloads: state.downloads.map((download) =>
            download.streamId === streamId ? { ...download, ...updates } : download
          ),
        }));
      },

      removeDownload: (streamId: string) => {
        set((state) => ({
          downloads: state.downloads.filter((download) => download.streamId !== streamId),
        }));
      },

      clearDownloads: () => set({ downloads: [] }),

      updateDownloadQueue: (queue: any) => {
        set({ downloadQueue: queue });
      },

      // Configuration management
      setConfig: (config: AppConfig) => set({ config }),
      
      updateConfig: (updates: Partial<AppConfig>) => {
        set((state) => ({
          config: state.config ? { ...state.config, ...updates } : null,
        }));
      },

      // Connection status
      updateConnectionStatus: (status: Partial<ClientStatus>) => {
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, ...status },
        }));
      },



      // Data loading methods
      loadStreams: async () => {
        try {
          // TODO: Load streams from storage or API
          set({ streams: [] });
        } catch (error) {
          console.error('Failed to load streams:', error);
        }
      },

      loadDownloads: async () => {
        try {
          const queueStatus = await window.electronAPI.download.getQueueStatus();
          const activeDownloads = await window.electronAPI.download.getActive();
          const completedDownloads = await window.electronAPI.download.getCompleted();
          const failedDownloads = await window.electronAPI.download.getFailed();

          set({
            downloadQueue: queueStatus,
            downloads: [...activeDownloads, ...completedDownloads, ...failedDownloads],
          });
        } catch (error) {
          console.error('Failed to load downloads:', error);
        }
      },

      loadConnectionStatus: async () => {
        try {
          const status = await window.electronAPI.websocket.getStatus();
          get().updateConnectionStatus({
            connected: status.extensionConnected,
            downloadQueue: status.connectionCount,
            activeDownloads: 0, // TODO: Get from download manager
          });
        } catch (error) {
          console.error('Failed to load connection status:', error);
        }
      },
    }),
    {
      name: 'app-store',
    }
  )
);
