import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { StreamData, WebSocketMessage } from '../../types';
import { downloadManager } from '../download/manager';
import { logger } from '../utils/logger';
import { configManager } from '../config/manager';
import { ipcHandlers } from '../ipc/handlers';

export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private port: number;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    super();
    this.port = configManager.get('webSocketPort');
  }

  start(): void {
    try {
      this.wss = new WebSocketServer({ port: this.port });
      
      this.wss.on('connection', (ws: WebSocket) => {
        this.handleConnection(ws);
      });

      this.wss.on('error', (error: Error) => {
        logger.error('WebSocket server error', { error: error.message });
      });

      logger.info('WebSocket server started', { port: this.port });
      
      // Emit status change event
      this.emit('statusChanged', {
        isRunning: this.isRunning(),
        connectedClients: this.getConnectedClientsCount(),
        port: this.port
      });
    } catch (error) {
      logger.error('Failed to start WebSocket server', { error });
    }
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    logger.info('WebSocket client connected', { totalClients: this.clients.size });
    
    // Emit status change event
    this.emit('statusChanged', {
      isRunning: this.isRunning(),
      connectedClients: this.getConnectedClientsCount(),
      port: this.port
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', { error, data: data.toString() });
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info('WebSocket client disconnected', { totalClients: this.clients.size });
      
      // Emit status change event
      this.emit('statusChanged', {
        isRunning: this.isRunning(),
        connectedClients: this.getConnectedClientsCount(),
        port: this.port
      });
    });

    ws.on('error', (error: Error) => {
      logger.error('WebSocket client error', { error: error.message });
      this.clients.delete(ws);
    });

    // Send welcome message
    this.sendMessage(ws, {
      type: 'CONNECTION_ESTABLISHED',
      data: { message: 'Connected to StreamHelper Client' }
    });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    logger.debug('Received WebSocket message', { type: message.type, data: message.data });

    switch (message.type) {
      case 'STREAM_CAPTURED':
        await this.handleStreamCaptured(ws, message.data);
        break;
      
      default:
        logger.warn('Unknown message type', { type: message.type });
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleStreamCaptured(ws: WebSocket, data: any): Promise<void> {
    try {
      // Validate stream data
      if (!this.validateStreamData(data)) {
        this.sendError(ws, 'Invalid stream data format');
        return;
      }

      const stream: StreamData = {
        url: data.url,
        pageTitle: data.pageTitle || 'Unknown Stream',
        pageUrl: data.pageUrl || 'Unknown',
        userAgent: data.userAgent || 'Unknown',
        timestamp: data.timestamp || Date.now(),
        originalPageTitle: data.originalPageTitle,
        customName: data.customName,
        requestHeaders: data.requestHeaders || [],
        cookies: data.cookies || ''
      };

      // Enqueue the stream for download
      const queuePosition = await downloadManager.enqueueStream(stream);
      
      logger.info('Stream captured and enqueued', { 
        url: stream.url, 
        pageTitle: stream.pageTitle,
        queuePosition 
      });

      // Send confirmation to client
      this.sendMessage(ws, {
        type: 'STREAM_ENQUEUED',
        data: { 
          message: 'Stream enqueued for download',
          queuePosition,
          stream
        }
      });

      // Notify all clients about new stream
      this.broadcast({
        type: 'NEW_STREAM_ADDED',
        data: { stream, queuePosition }
      });

    } catch (error) {
      logger.error('Failed to handle stream capture', { error, data });
      this.sendError(ws, 'Failed to process stream');
    }
  }

  private validateStreamData(data: any): boolean {
    // Basic validation
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.url || typeof data.url !== 'string') {
      return false;
    }

    // Validate URL format
    try {
      new URL(data.url);
    } catch {
      return false;
    }

    // Validate page title
    if (data.pageTitle && typeof data.pageTitle !== 'string') {
      return false;
    }

    // Validate page URL
    if (data.pageUrl && typeof data.pageUrl !== 'string') {
      return false;
    }

    // Validate user agent
    if (data.userAgent && typeof data.userAgent !== 'string') {
      return false;
    }

    // Validate timestamp
    if (data.timestamp && typeof data.timestamp !== 'number') {
      return false;
    }

    return true;
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send WebSocket message', { error, message });
      }
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'ERROR',
      data: { error }
    });
  }

  broadcast(message: WebSocketMessage): void {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    });
  }

  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      logger.info('WebSocket server stopped');
      
      // Emit status change event
      this.emit('statusChanged', {
        isRunning: this.isRunning(),
        connectedClients: this.getConnectedClientsCount(),
        port: this.port
      });
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  isRunning(): boolean {
    return this.wss !== null;
  }
}

export const webSocketManager = new WebSocketManager();
