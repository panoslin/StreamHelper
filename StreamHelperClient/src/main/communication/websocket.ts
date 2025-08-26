import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { StreamMessage, StreamData, DownloadRequest, DownloadProgress, ClientStatus } from '@/types';
import { WEBSOCKET_PORT, APP_NAME, APP_VERSION, EVENTS } from '@/shared/constants';
import { getPlatform } from '@/shared/utils';
import { configManager } from '../config/manager';

interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  isExtension: boolean;
  lastHeartbeat: number;
  metadata?: {
    userAgent: string;
    version: string;
    platform: string;
  };
}

class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts: number = 3;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle extension connection events
    this.on(EVENTS.STREAM_CAPTURED, (stream: StreamData) => {
      this.broadcastToRenderers({
        type: 'STREAM_CAPTURED',
        id: generateMessageId(),
        timestamp: Date.now(),
        data: stream,
      });
    });

    this.on(EVENTS.DOWNLOAD_PROGRESS, (progress: DownloadProgress) => {
      this.broadcastToRenderers({
        type: 'DOWNLOAD_PROGRESS',
        id: generateMessageId(),
        timestamp: Date.now(),
        data: progress,
      });
    });

    this.on(EVENTS.DOWNLOAD_COMPLETED, (stream: StreamData) => {
      this.broadcastToRenderers({
        type: 'DOWNLOAD_COMPLETE',
        id: generateMessageId(),
        timestamp: Date.now(),
        data: stream,
      });
    });

    this.on(EVENTS.DOWNLOAD_ERROR, (error: { streamId: string; error: string }) => {
      this.broadcastToRenderers({
        type: 'DOWNLOAD_ERROR',
        id: generateMessageId(),
        timestamp: Date.now(),
        data: error,
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const port = configManager.getCommunicationConfig().websocketPort;
        
        this.wss = new WebSocketServer({
          port,
          perMessageDeflate: false,
          clientTracking: true,
        });

        this.wss.on('listening', () => {
          console.log(`WebSocket server started on port ${port}`);
          this.startHeartbeat();
          resolve();
        });

        this.wss.on('connection', (ws: WebSocket, request) => {
          this.handleConnection(ws, request);
        });

        this.wss.on('error', (error) => {
          console.error('WebSocket server error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Failed to start WebSocket server:', error);
        reject(error);
      }
    });
  }

  private handleConnection(ws: WebSocket, request: any): void {
    const connectionId = generateConnectionId();
    const userAgent = request.headers['user-agent'] || 'Unknown';
    
    console.log(`New WebSocket connection: ${connectionId} (${userAgent})`);

    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      isExtension: this.isExtensionConnection(userAgent),
      lastHeartbeat: Date.now(),
      metadata: {
        userAgent,
        version: this.extractVersion(userAgent),
        platform: this.extractPlatform(userAgent),
      },
    };

    this.connections.set(connectionId, connection);

    // Send welcome message
    this.sendMessage(connectionId, {
      type: 'CLIENT_STATUS',
      id: generateMessageId(),
      timestamp: Date.now(),
      data: this.getClientStatus(),
    });

    // Setup connection event handlers
    ws.on('message', (data: Buffer) => {
      this.handleMessage(connectionId, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket connection error (${connectionId}):`, error);
      this.handleDisconnection(connectionId);
    });

    ws.on('pong', () => {
      this.handlePong(connectionId);
    });

    // Emit connection event
    if (connection.isExtension) {
      this.emit(EVENTS.CLIENT_CONNECTED);
      console.log('StreamHelper extension connected');
    }
  }

  private handleMessage(connectionId: string, data: Buffer): void {
    try {
      const message: StreamMessage = JSON.parse(data.toString());
      console.log(`Received message from ${connectionId}:`, message.type);

      switch (message.type) {
        case 'STREAM_CAPTURED':
          this.handleStreamCaptured(message.data as StreamData);
          break;
        
        case 'DOWNLOAD_REQUEST':
          this.handleDownloadRequest(message.data as DownloadRequest);
          break;
        

        
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Failed to parse message from ${connectionId}:`, error);
    }
  }

  private handleStreamCaptured(stream: StreamData): void {
    console.log('New stream captured:', stream.url);
    this.emit(EVENTS.STREAM_CAPTURED, stream);
  }

  private handleDownloadRequest(request: DownloadRequest): void {
    console.log('Download request received:', request.streamId);
    this.emit('download:request', request);
  }

  private handleHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = Date.now();
      this.reconnectAttempts.delete(connectionId);
    }
  }

  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      console.log(`Connection closed: ${connectionId}`);
      
      if (connection.isExtension) {
        this.emit(EVENTS.CLIENT_DISCONNECTED);
        console.log('StreamHelper extension disconnected');
      }
      
      this.connections.delete(connectionId);
      this.reconnectAttempts.delete(connectionId);
    }
  }

  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = Date.now();
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkConnections();
    }, 30000); // Check every 30 seconds
  }

  private checkConnections(): void {
    const now = Date.now();
    const timeout = 60000; // 60 seconds timeout

    for (const [connectionId, connection] of this.connections) {
      if (now - connection.lastHeartbeat > timeout) {
        console.log(`Connection ${connectionId} timed out, closing...`);
        connection.ws.terminate();
        this.connections.delete(connectionId);
      } else {
        // Send ping
        connection.ws.ping();
      }
    }
  }

  // Public methods
  sendMessage(connectionId: string, message: StreamMessage): boolean {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Failed to send message to ${connectionId}:`, error);
        return false;
      }
    }
    return false;
  }

  broadcastToExtensions(message: StreamMessage): void {
    for (const [connectionId, connection] of this.connections) {
      if (connection.isExtension) {
        this.sendMessage(connectionId, message);
      }
    }
  }

  broadcastToRenderers(message: StreamMessage): void {
    for (const [connectionId, connection] of this.connections) {
      if (!connection.isExtension) {
        this.sendMessage(connectionId, message);
      }
    }
  }

  broadcastToAll(message: StreamMessage): void {
    for (const connectionId of this.connections.keys()) {
      this.sendMessage(connectionId, message);
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getExtensionConnectionCount(): number {
    let count = 0;
    for (const connection of this.connections.values()) {
      if (connection.isExtension) count++;
    }
    return count;
  }

  isExtensionConnected(): boolean {
    return this.getExtensionConnectionCount() > 0;
  }

  private isExtensionConnection(userAgent: string): boolean {
    return userAgent.includes('StreamHelper') || userAgent.includes('Chrome');
  }

  private extractVersion(userAgent: string): string {
    const match = userAgent.match(/StreamHelper\/(\d+\.\d+\.\d+)/);
    return match ? match[1] : 'unknown';
  }

  private extractPlatform(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'win32';
    if (userAgent.includes('Mac')) return 'darwin';
    if (userAgent.includes('Linux')) return 'linux';
    return 'unknown';
  }

  private getClientStatus(): ClientStatus {
    return {
      connected: true,
      version: APP_VERSION,
      platform: getPlatform(),
      downloadQueue: 0, // TODO: Get from download manager
      activeDownloads: 0, // TODO: Get from download manager
    };
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.ws.close();
    }
    this.connections.clear();
    this.reconnectAttempts.clear();

    console.log('WebSocket server stopped');
  }
}

// Utility functions
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create singleton instance
const webSocketManager = new WebSocketManager();

export function setupWebSocketServer(): Promise<void> {
  return webSocketManager.start();
}

export { webSocketManager };
export default webSocketManager;
