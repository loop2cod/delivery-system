export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  dependsOn?: string[];
  userType: 'customer' | 'admin' | 'business' | 'driver';
  userId: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
  shouldRetry?: boolean;
}

export interface OfflineSyncConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  syncInterval: number;
  conflictResolution: 'client' | 'server' | 'timestamp';
}

export class OfflineDataSync {
  private operations: Map<string, SyncOperation> = new Map();
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private config: OfflineSyncConfig;
  private storageKey: string;

  constructor(
    config: Partial<OfflineSyncConfig> = {},
    storagePrefix: string = 'offline_sync'
  ) {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 10,
      syncInterval: 30000,
      conflictResolution: 'timestamp',
      ...config
    };
    
    this.storageKey = `${storagePrefix}_operations`;
    
    this.loadOperationsFromStorage();
    this.setupEventListeners();
    this.startSyncTimer();
  }

  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      console.log('Device went online - starting sync');
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('Device went offline - queuing operations');
      this.isOnline = false;
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });

    // Before unload - save pending operations
    window.addEventListener('beforeunload', () => {
      this.saveOperationsToStorage();
    });
  }

  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.operations.size > 0) {
        this.triggerSync();
      }
    }, this.config.syncInterval);
  }

  private loadOperationsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const operations = JSON.parse(stored) as SyncOperation[];
        operations.forEach(op => {
          this.operations.set(op.id, op);
        });
        console.log(`Loaded ${operations.length} pending sync operations`);
      }
    } catch (error) {
      console.error('Failed to load sync operations from storage:', error);
    }
  }

  private saveOperationsToStorage(): void {
    try {
      const operations = Array.from(this.operations.values());
      localStorage.setItem(this.storageKey, JSON.stringify(operations));
    } catch (error) {
      console.error('Failed to save sync operations to storage:', error);
    }
  }

  // Queue operations for sync
  queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = `${operation.entity}_${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const syncOperation: SyncOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries
    };

    this.operations.set(id, syncOperation);
    this.saveOperationsToStorage();

    console.log(`Queued sync operation: ${operation.type} ${operation.entity}`, syncOperation);

    // Trigger immediate sync if online
    if (this.isOnline) {
      setTimeout(() => this.triggerSync(), 100);
    }

    return id;
  }

  // Specific operation queueing methods
  queueCreate(entity: string, data: any, options: Partial<SyncOperation> = {}): string {
    return this.queueOperation({
      type: 'CREATE',
      entity,
      data,
      priority: 'normal',
      userType: 'customer',
      userId: 'unknown',
      ...options
    });
  }

  queueUpdate(entity: string, data: any, options: Partial<SyncOperation> = {}): string {
    return this.queueOperation({
      type: 'UPDATE',
      entity,
      data,
      priority: 'normal',
      userType: 'customer',
      userId: 'unknown',
      ...options
    });
  }

  queueDelete(entity: string, data: any, options: Partial<SyncOperation> = {}): string {
    return this.queueOperation({
      type: 'DELETE',
      entity,
      data,
      priority: 'normal',
      userType: 'customer',
      userId: 'unknown',
      ...options
    });
  }

  // Driver-specific operations
  queueLocationUpdate(location: any, driverId: string): string {
    return this.queueOperation({
      type: 'UPDATE',
      entity: 'driver_location',
      data: location,
      priority: 'high',
      userType: 'driver',
      userId: driverId
    });
  }

  queueDeliveryStatusUpdate(deliveryId: string, status: string, data: any, driverId: string): string {
    return this.queueOperation({
      type: 'UPDATE',
      entity: 'delivery_status',
      data: { deliveryId, status, ...data },
      priority: 'critical',
      userType: 'driver',
      userId: driverId
    });
  }

  queuePhotoUpload(photos: string[], deliveryId: string, userId: string): string {
    return this.queueOperation({
      type: 'CREATE',
      entity: 'delivery_photos',
      data: { photos, deliveryId },
      priority: 'high',
      userType: 'driver',
      userId
    });
  }

  // Business-specific operations
  queueDeliveryRequest(requestData: any, businessId: string): string {
    return this.queueOperation({
      type: 'CREATE',
      entity: 'delivery_request',
      data: requestData,
      priority: 'high',
      userType: 'business',
      userId: businessId
    });
  }

  // Customer-specific operations
  queueInquiry(inquiryData: any, customerId: string): string {
    return this.queueOperation({
      type: 'CREATE',
      entity: 'inquiry',
      data: inquiryData,
      priority: 'normal',
      userType: 'customer',
      userId: customerId
    });
  }

  async triggerSync(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.operations.size === 0) {
      return;
    }

    this.isSyncing = true;
    console.log(`Starting sync of ${this.operations.size} operations`);

    try {
      await this.performSync();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
      this.saveOperationsToStorage();
    }
  }

  private async performSync(): Promise<void> {
    // Sort operations by priority and timestamp
    const sortedOperations = Array.from(this.operations.values()).sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    // Process operations in batches
    for (let i = 0; i < sortedOperations.length; i += this.config.batchSize) {
      const batch = sortedOperations.slice(i, i + this.config.batchSize);
      await this.processBatch(batch);
      
      // Small delay between batches to avoid overwhelming the server
      if (i + this.config.batchSize < sortedOperations.length) {
        await this.delay(100);
      }
    }
  }

  private async processBatch(operations: SyncOperation[]): Promise<void> {
    const promises = operations.map(op => this.processOperation(op));
    await Promise.allSettled(promises);
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    try {
      console.log(`Processing sync operation: ${operation.type} ${operation.entity}`, operation);

      const result = await this.syncOperation(operation);

      if (result.success) {
        console.log(`Sync operation completed: ${operation.id}`);
        this.operations.delete(operation.id);
        
        // Emit success event
        this.emitSyncEvent('operation_success', { operation, result });
      } else {
        await this.handleOperationFailure(operation, result);
      }
    } catch (error) {
      console.error(`Sync operation failed: ${operation.id}`, error);
      await this.handleOperationFailure(operation, { success: false, error: error.message });
    }
  }

  private async syncOperation(operation: SyncOperation): Promise<SyncResult> {
    const endpoint = this.getEndpointForOperation(operation);
    const method = this.getHttpMethodForOperation(operation);
    
    try {
      const token = this.getAuthToken(operation.userType);
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Sync-Operation': 'true',
          'X-Operation-Id': operation.id
        },
        body: method !== 'DELETE' ? JSON.stringify(operation.data) : undefined
      });

      if (response.ok) {
        const responseData = response.status !== 204 ? await response.json() : null;
        return { success: true, data: responseData };
      } else if (response.status === 409) {
        // Conflict - handle based on conflict resolution strategy
        const conflictData = await response.json();
        return this.handleConflict(operation, conflictData);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        return { success: false, error: `Client error: ${response.status}`, shouldRetry: false };
      } else {
        // Server error - can retry
        return { success: false, error: `Server error: ${response.status}`, shouldRetry: true };
      }
    } catch (error) {
      // Network error - can retry
      return { success: false, error: error.message, shouldRetry: true };
    }
  }

  private getEndpointForOperation(operation: SyncOperation): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    
    switch (operation.entity) {
      case 'driver_location':
        return `${baseUrl}/driver/location`;
      case 'delivery_status':
        return `${baseUrl}/deliveries/${operation.data.deliveryId}/status`;
      case 'delivery_photos':
        return `${baseUrl}/deliveries/${operation.data.deliveryId}/photos`;
      case 'delivery_request':
        return `${baseUrl}/delivery-requests`;
      case 'inquiry':
        return `${baseUrl}/inquiries`;
      default:
        return `${baseUrl}/${operation.entity}`;
    }
  }

  private getHttpMethodForOperation(operation: SyncOperation): string {
    switch (operation.type) {
      case 'CREATE': return 'POST';
      case 'UPDATE': return 'PUT';
      case 'DELETE': return 'DELETE';
      default: return 'POST';
    }
  }

  private getAuthToken(userType: string): string {
    switch (userType) {
      case 'driver':
        return localStorage.getItem('driver_token') || '';
      case 'admin':
      case 'business':
        return localStorage.getItem('auth_token') || '';
      case 'customer':
        return localStorage.getItem('customer_token') || localStorage.getItem('guest_token') || '';
      default:
        return '';
    }
  }

  private async handleConflict(operation: SyncOperation, conflictData: any): Promise<SyncResult> {
    switch (this.config.conflictResolution) {
      case 'client':
        // Client wins - force update
        return { success: true, data: operation.data };
      
      case 'server':
        // Server wins - accept server data
        return { success: true, data: conflictData.serverData };
      
      case 'timestamp':
        // Latest timestamp wins
        const clientTimestamp = operation.data.updatedAt || operation.timestamp;
        const serverTimestamp = conflictData.serverData.updatedAt || 0;
        
        if (clientTimestamp > serverTimestamp) {
          return { success: true, data: operation.data };
        } else {
          return { success: true, data: conflictData.serverData };
        }
      
      default:
        return { success: false, error: 'Conflict resolution failed', shouldRetry: false };
    }
  }

  private async handleOperationFailure(operation: SyncOperation, result: SyncResult): Promise<void> {
    if (result.shouldRetry !== false && operation.retryCount < operation.maxRetries) {
      // Increment retry count and schedule retry
      operation.retryCount++;
      
      const retryDelay = this.config.retryDelay * Math.pow(2, operation.retryCount - 1); // Exponential backoff
      
      console.log(`Scheduling retry ${operation.retryCount}/${operation.maxRetries} for operation ${operation.id} in ${retryDelay}ms`);
      
      setTimeout(() => {
        if (this.isOnline) {
          this.processOperation(operation);
        }
      }, retryDelay);
      
      this.emitSyncEvent('operation_retry', { operation, result, retryDelay });
    } else {
      // Max retries reached or non-retryable error
      console.error(`Operation ${operation.id} failed permanently:`, result.error);
      this.operations.delete(operation.id);
      
      this.emitSyncEvent('operation_failed', { operation, result });
    }
  }

  private emitSyncEvent(type: string, data: any): void {
    const event = new CustomEvent(`sync_${type}`, { detail: data });
    window.dispatchEvent(event);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for monitoring
  getPendingOperationsCount(): number {
    return this.operations.size;
  }

  getPendingOperations(): SyncOperation[] {
    return Array.from(this.operations.values());
  }

  clearPendingOperations(): void {
    this.operations.clear();
    this.saveOperationsToStorage();
  }

  getOperationsByEntity(entity: string): SyncOperation[] {
    return Array.from(this.operations.values()).filter(op => op.entity === entity);
  }

  getOperationsByPriority(priority: SyncOperation['priority']): SyncOperation[] {
    return Array.from(this.operations.values()).filter(op => op.priority === priority);
  }

  isOperationPending(operationId: string): boolean {
    return this.operations.has(operationId);
  }

  // Cleanup
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.saveOperationsToStorage();
  }
}

// React Hook for offline sync
export function useOfflineSync(config?: Partial<OfflineSyncConfig>, storagePrefix?: string) {
  const [syncManager] = useState(() => new OfflineDataSync(config, storagePrefix));
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setPendingCount(syncManager.getPendingOperationsCount());
    };

    // Update status periodically
    const statusInterval = setInterval(updateStatus, 1000);
    updateStatus();

    // Listen for sync events
    const handleSyncEvent = (event: CustomEvent) => {
      updateStatus();
      
      if (event.type === 'sync_operation_success') {
        console.log('Sync operation completed:', event.detail);
      } else if (event.type === 'sync_operation_failed') {
        console.error('Sync operation failed:', event.detail);
      }
    };

    window.addEventListener('sync_operation_success', handleSyncEvent as EventListener);
    window.addEventListener('sync_operation_failed', handleSyncEvent as EventListener);
    window.addEventListener('sync_operation_retry', handleSyncEvent as EventListener);

    // Online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('sync_operation_success', handleSyncEvent as EventListener);
      window.removeEventListener('sync_operation_failed', handleSyncEvent as EventListener);
      window.removeEventListener('sync_operation_retry', handleSyncEvent as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncManager.destroy();
    };
  }, [syncManager]);

  return {
    syncManager,
    pendingCount,
    isOnline,
    isSyncing,
    triggerSync: () => syncManager.triggerSync(),
    clearPending: () => syncManager.clearPendingOperations()
  };
}