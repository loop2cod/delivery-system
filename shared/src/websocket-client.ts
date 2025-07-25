export interface WebSocketMessage {
  type: string;
  channel?: string;
  data: any;
  timestamp: number;
  deliveryId?: string;
  driverId?: string;
  inquiryId?: string;
  trackingNumber?: string;
}

export interface WebSocketConfig {
  url: string;
  token: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
}

export type WebSocketEventHandler = (data: any) => void;

export interface WebSocketEvents {
  // Connection events
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number) => void;
  
  // Data events
  delivery_update: WebSocketEventHandler;
  driver_location: WebSocketEventHandler;
  driver_status: WebSocketEventHandler;
  inquiry_update: WebSocketEventHandler;
  tracking_update: WebSocketEventHandler;
  business_notification: WebSocketEventHandler;
  customer_notification: WebSocketEventHandler;
  driver_notification: WebSocketEventHandler;
  emergency_broadcast: WebSocketEventHandler;
  
  // Generic broadcast
  broadcast: WebSocketEventHandler;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private eventHandlers = new Map<keyof WebSocketEvents, Set<Function>>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isManualClose = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
      ...config
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.url}?token=${encodeURIComponent(this.config.token)}`;
        this.ws = new WebSocket(wsUrl);
        this.isManualClose = false;

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.startPingTimer();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.cleanup();
          this.emit('disconnected');

          if (!this.isManualClose && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', new Error('WebSocket connection error'));
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isManualClose = true;
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          data: {},
          timestamp: Date.now()
        });
      }
    }, this.config.pingInterval);
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'pong':
        // Handle ping response
        break;

      case 'connected':
        console.log('WebSocket authentication successful:', message.data);
        break;

      case 'error':
        console.error('WebSocket server error:', message.data);
        this.emit('error', new Error(message.data.message || 'Server error'));
        break;

      case 'broadcast':
        this.emit('broadcast', message.data);
        break;

      case 'delivery_update':
        this.emit('delivery_update', {
          deliveryId: message.deliveryId,
          ...message.data
        });
        break;

      case 'driver_location':
        this.emit('driver_location', {
          driverId: message.driverId,
          ...message.data
        });
        break;

      case 'driver_status':
        this.emit('driver_status', {
          driverId: message.driverId,
          ...message.data
        });
        break;

      case 'inquiry_update':
        this.emit('inquiry_update', {
          inquiryId: message.inquiryId,
          ...message.data
        });
        break;

      case 'tracking_update':
        this.emit('tracking_update', {
          trackingNumber: message.trackingNumber,
          ...message.data
        });
        break;

      case 'business_notification':
      case 'customer_notification':
      case 'driver_notification':
        this.emit(message.type as keyof WebSocketEvents, message.data);
        break;

      case 'emergency_broadcast':
        this.emit('emergency_broadcast', message.data);
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  send(message: Partial<WebSocketMessage>): void {
    if (this.isConnected()) {
      const fullMessage: WebSocketMessage = {
        type: message.type || 'message',
        data: message.data || {},
        timestamp: Date.now(),
        ...message
      };

      this.ws!.send(JSON.stringify(fullMessage));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Event subscription methods
  on<K extends keyof WebSocketEvents>(
    event: K, 
    handler: WebSocketEvents[K]
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off<K extends keyof WebSocketEvents>(
    event: K, 
    handler: WebSocketEvents[K]
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit<K extends keyof WebSocketEvents>(
    event: K, 
    ...args: Parameters<WebSocketEvents[K]>
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as Function)(...args);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Convenience methods for common operations
  subscribeToChannel(channel: string): void {
    this.send({
      type: 'subscribe',
      channel,
      data: {}
    });
  }

  unsubscribeFromChannel(channel: string): void {
    this.send({
      type: 'unsubscribe',
      channel,
      data: {}
    });
  }

  updateDriverLocation(location: { lat: number; lng: number; address?: string }): void {
    this.send({
      type: 'driver_location_update',
      data: location
    });
  }

  updateDeliveryStatus(deliveryId: string, status: string, data?: any): void {
    this.send({
      type: 'delivery_status_update',
      data: {
        deliveryId,
        status,
        ...data
      }
    });
  }

  // Connection status
  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// React Hook for WebSocket usage
export function useWebSocket(config: WebSocketConfig) {
  const [client] = useState(() => new WebSocketClient(config));
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const updateConnectionState = () => {
      setConnectionState(client.getConnectionState());
      setIsConnected(client.isConnected());
      setReconnectAttempts(client.getReconnectAttempts());
    };

    client.on('connected', () => {
      updateConnectionState();
    });

    client.on('disconnected', () => {
      updateConnectionState();
    });

    client.on('reconnecting', (attempts) => {
      setReconnectAttempts(attempts);
    });

    // Auto-connect on mount
    client.connect().catch(console.error);

    // Cleanup on unmount
    return () => {
      client.disconnect();
    };
  }, [client]);

  return {
    client,
    isConnected,
    connectionState,
    reconnectAttempts,
    connect: () => client.connect(),
    disconnect: () => client.disconnect()
  };
}