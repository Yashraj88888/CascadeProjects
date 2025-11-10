import api from './api';

// Custom EventEmitter implementation for browser environment
class EventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: Function) {
    if (!this.listeners[event]) return this;
    const index = this.listeners[event].indexOf(listener);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
    return this;
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return false;
    this.listeners[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
    return true;
  }
}

type EventMap = {
  status: (status: CaptureStatus) => void;
  packets: (packets: PacketInfo[]) => void;
  error: (error: Error) => void;
};

// Helper function to validate IP address
const isValidIP = (ip: string): boolean => {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
};

// Get WebSocket URL from environment or use current host with WebSocket protocol
const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}`;
};

const WS_URL = getWebSocketUrl();

export interface CaptureStatus {
  status: 'running' | 'completed' | 'error';
  packets: number;
  file?: string;
  error?: string;
  elapsed?: number;
  message?: string;
  captureId?: string;
}

export interface PacketInfo {
  number: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
}

class WiresharkService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private captureId: string | null = null;
  private isConnected = false;
  private emitter = new EventEmitter();
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.connect();
  }

  // Event handling
  on<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
    this.emitter.on(event as string, listener as (...args: any[]) => void);
    return this;
  }

  off<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
    this.emitter.off(event as string, listener as (...args: any[]) => void);
    return this;
  }

  private emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): boolean {
    return this.emitter.emit(event as string, ...(args as any[]));
  }

  // WebSocket connection management
  private connect() {
    try {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('status', { 
          status: 'running', 
          packets: 0, 
          message: 'Connected to WebSocket server' 
        });
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string);
          
          // Handle message-specific handlers first
          if (data.requestId && this.messageHandlers.has(data.requestId)) {
            const handler = this.messageHandlers.get(data.requestId);
            if (handler) {
              handler(data);
            }
          }
          
          // Emit general events
          if (data.type === 'packets' && Array.isArray(data.packets)) {
            this.emit('packets', data.packets);
          } 
          if (data.type === 'status') {
            this.emit('status', data as CaptureStatus);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          this.emit('error', error instanceof Error ? error : new Error('Error processing message'));
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Connection lost. Reconnecting attempt ${this.reconnectAttempts}...`);
          setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        } else {
          this.emit('error', new Error('Max reconnection attempts reached'));
        }
      };

      this.ws.onerror = (event: Event) => {
        console.error('WebSocket error:', event);
        this.emit('error', new Error('WebSocket connection error'));
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.emit('error', error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }
  }

  // Core functionality
  public async startCapture(
    ipAddress: string,
    duration: number = 30,
    interfaceName: string = 'wlan0'  // Changed default to wlan0 which is common on Kali
  ): Promise<{ captureId: string }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    if (!isValidIP(ipAddress)) {
      throw new Error('Invalid IP address format');
    }

    return new Promise((resolve, reject) => {
      const requestId = `start_${Date.now()}`;
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(requestId);
        reject(new Error('Start capture timeout. Please check if tshark has the correct permissions.'));
      }, 15000);  // Increased timeout to 15 seconds

      const onResponse = (data: any) => {
        if (data.requestId === requestId) {
          clearTimeout(timeout);
          this.messageHandlers.delete(requestId);
          
          if (data.status === 'capture_started') {
            this.captureId = data.captureId;
            this.emit('status', { 
              status: 'running', 
              packets: 0,
              message: 'Capture started successfully',
              captureId: data.captureId
            });
            resolve({ captureId: data.captureId });
          } else {
            const errorMsg = data.message || 'Failed to start capture';
            this.emit('error', new Error(errorMsg));
            reject(new Error(errorMsg));
          }
        }
      };

      this.messageHandlers.set(requestId, onResponse);

      // Get list of available interfaces first
      this.getInterfaces()
        .then(interfaces => {
          // Use the specified interface if it exists, otherwise use the first available one
          const targetInterface = interfaces.includes(interfaceName) 
            ? interfaceName 
            : interfaces.length > 0 ? interfaces[0] : 'wlan0';

          const captureConfig = {
            action: 'start',
            requestId,
            target: ipAddress,
            duration,
            interface: targetInterface,
            // Add additional tshark options for better compatibility
            options: {
              // Disable packet limit
              '--no-promiscuous-mode': '',
              // Disable name resolution for better performance
              '-n': ''
            }
          };

          console.log('Starting capture with config:', captureConfig);
          this.ws?.send(JSON.stringify(captureConfig));
        })
        .catch(error => {
          console.error('Error getting network interfaces:', error);
          // Fallback to default interface if getting interfaces fails
          const captureConfig = {
            action: 'start',
            requestId,
            target: ipAddress,
            duration,
            interface: 'wlan0',
            options: {
              '--no-promiscuous-mode': '',
              '-n': ''
            }
          };
          console.log('Using fallback interface. Starting capture with config:', captureConfig);
          this.ws?.send(JSON.stringify(captureConfig));
        });
    });
  }

  public stopCapture(captureId: string): Promise<{ success: boolean }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket not connected'));
    }

    return new Promise((resolve, reject) => {
      const requestId = `stop_${Date.now()}`;
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(requestId);
        reject(new Error('Stop capture timeout'));
      }, 10000);

      const onResponse = (data: any) => {
        if (data.requestId === requestId) {
          clearTimeout(timeout);
          this.messageHandlers.delete(requestId);
          
          if (data.status === 'capture_stopped') {
            this.captureId = null;
            resolve({ success: true });
          } else {
            reject(new Error(data.message || 'Failed to stop capture'));
          }
        }
      };

      this.messageHandlers.set(requestId, onResponse);

      this.ws?.send(JSON.stringify({
        action: 'stop',
        requestId,
        captureId
      }));
    });
  }

  public async getInterfaces(): Promise<string[]> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, using default interfaces');
      return ['wlan0', 'eth0', 'lo'];
    }

    return new Promise((resolve, reject) => {
      const requestId = `interfaces_${Date.now()}`;
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(requestId);
        console.warn('Get interfaces timeout, using default interfaces');
        resolve(['wlan0', 'eth0', 'lo']); // Return default interfaces on timeout
      }, 3000); // Reduced timeout to 3 seconds

      const onResponse = (data: any) => {
        if (data.requestId === requestId) {
          clearTimeout(timeout);
          this.messageHandlers.delete(requestId);
          
          if (data.interfaces && Array.isArray(data.interfaces) && data.interfaces.length > 0) {
            console.log('Available interfaces:', data.interfaces);
            resolve(data.interfaces);
          } else {
            console.warn('No interfaces found in response, using defaults');
            resolve(['wlan0', 'eth0', 'lo']);
          }
        }
      };

      this.messageHandlers.set(requestId, onResponse);

try {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(JSON.stringify({
      action: 'get_interfaces',
      requestId
    }));
  } else {
    console.error('WebSocket is not connected');
    resolve(['wlan0', 'eth0', 'lo']);
  }
} catch (error) {
  console.error('Error sending get_interfaces request:', error);
  resolve(['wlan0', 'eth0', 'lo']);
}
    });
  }

  public close() {
    if (this.ws) {
      if (this.captureId) {
        this.stopCapture(this.captureId).catch(console.error);
      }
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

// Create a singleton instance
export const wiresharkService = new WiresharkService();

// Backward compatibility with existing code
export function startCapture(ipAddress: string, duration: number = 30, interfaceName: string = 'wlan0') {
  return wiresharkService.startCapture(ipAddress, duration, interfaceName);
}

export function stopCapture(captureId: string) {
  return wiresharkService.stopCapture(captureId);
}

// These are kept for backward compatibility but will not work with WebSocket
export function getCaptureStatus(): Promise<CaptureStatus> {
  return Promise.resolve({ 
    status: 'completed', 
    packets: 0,
    message: 'This method is deprecated. Use WebSocket events instead.' 
  });
}

export function getLivePackets(): Promise<PacketInfo[]> {
  return Promise.resolve([]);
}

export function getDetailedPackets(): Promise<PacketInfo[]> {
  return Promise.resolve([]);
};
