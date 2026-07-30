import { supabase } from './supabase';
import { mirrorDatabaseToLocal, getLocalSnapshot, BackupSnapshot } from './backupEngine';

export interface OfflineAction {
  id: string;
  table: string;
  action: 'insert' | 'upsert' | 'update' | 'delete';
  payload: any;
  matchField?: string;
  timestamp: string;
}

const OFFLINE_QUEUE_KEY = 'AOE_OFFLINE_QUEUE';
const LAST_DELTA_SYNC_KEY = 'AOE_LAST_DELTA_SYNC_TIME';

export class SyncEngine {
  private static instance: SyncEngine;
  private isOnlineState: boolean = navigator.onLine;
  private pendingQueue: OfflineAction[] = [];
  private listeners: Array<(status: { isOnline: boolean; pendingCount: number; lastSync: string; isSyncing: boolean }) => void> = [];
  private isSyncing: boolean = false;

  private constructor() {
    this.loadOfflineQueue();
    this.setupNetworkListeners();
    this.setupRealtimeSubscriptions();
  }

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  /**
   * Initialize sync engine and trigger initial delta sync
   */
  public async init() {
    if (this.isOnlineState) {
      await this.flushOfflineQueue();
      await mirrorDatabaseToLocal();
    }
    this.notifyListeners();
  }

  /**
   * Subscribe to network online/offline events
   */
  private setupNetworkListeners() {
    window.addEventListener('online', async () => {
      console.log('⚡ Network reconnected! Flushing offline queue & syncing delta changes...');
      this.isOnlineState = true;
      this.notifyListeners();
      await this.flushOfflineQueue();
      await mirrorDatabaseToLocal();
    });

    window.addEventListener('offline', () => {
      console.warn('📡 Network disconnected. Switching to Local Mirror & Offline Queue Mode.');
      this.isOnlineState = false;
      this.notifyListeners();
    });
  }

  /**
   * Subscribe to Supabase Realtime WebSockets (0-polling real-time push updates)
   */
  private setupRealtimeSubscriptions() {
    try {
      supabase
        .channel('aoe-public-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            console.log('⚡ Realtime Cloud Push received:', payload);
            // Silently update local mirror in background
            mirrorDatabaseToLocal();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }

  /**
   * Load offline pending queue from LocalStorage
   */
  private loadOfflineQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (raw) {
        this.pendingQueue = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading offline queue:', e);
      this.pendingQueue = [];
    }
  }

  /**
   * Save offline pending queue to LocalStorage
   */
  private saveOfflineQueue() {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.pendingQueue));
    } catch (e) {
      console.error('Error saving offline queue:', e);
    }
  }

  /**
   * Execute database write operation with Dual-Sync (Supabase + Local Mirror / Offline Queue)
   */
  public async writeRecord(
    table: string,
    action: 'insert' | 'upsert' | 'update' | 'delete',
    payload: any,
    matchField: string = 'id'
  ): Promise<{ success: boolean; data?: any; isOffline: boolean }> {
    
    // Always mirror write to local snapshot immediately
    this.applyLocalWrite(table, action, payload, matchField);

    if (this.isOnlineState) {
      try {
        let result: any = null;
        if (action === 'insert') {
          const { data, error } = await supabase.from(table).insert(payload).select().single();
          if (error) throw error;
          result = data;
        } else if (action === 'upsert') {
          const { data, error } = await supabase.from(table).upsert(payload).select();
          if (error) throw error;
          result = data;
        } else if (action === 'update') {
          const { data, error } = await supabase.from(table).update(payload).eq(matchField, payload[matchField]).select();
          if (error) throw error;
          result = data;
        } else if (action === 'delete') {
          const { error } = await supabase.from(table).delete().eq(matchField, payload[matchField]);
          if (error) throw error;
        }

        return { success: true, data: result, isOffline: false };
      } catch (err) {
        console.warn(`Cloud write failed for ${table}. Adding to offline queue:`, err);
        this.enqueueOfflineAction(table, action, payload, matchField);
        return { success: true, data: payload, isOffline: true };
      }
    } else {
      // Offline mode
      this.enqueueOfflineAction(table, action, payload, matchField);
      return { success: true, data: payload, isOffline: true };
    }
  }

  /**
   * Apply write directly into local cached snapshot for immediate UI reactivity
   */
  private applyLocalWrite(table: string, action: string, payload: any, matchField: string) {
    const snapshot = getLocalSnapshot();
    if (!snapshot) return;

    if (!snapshot.tables[table as keyof typeof snapshot.tables]) {
      (snapshot.tables as any)[table] = [];
    }

    const tableArr = (snapshot.tables as any)[table] as any[];

    if (action === 'insert' || action === 'upsert') {
      const idx = tableArr.findIndex(r => r[matchField] === payload[matchField]);
      if (idx >= 0) {
        tableArr[idx] = { ...tableArr[idx], ...payload };
      } else {
        tableArr.push(payload);
      }
    } else if (action === 'update') {
      const idx = tableArr.findIndex(r => r[matchField] === payload[matchField]);
      if (idx >= 0) {
        tableArr[idx] = { ...tableArr[idx], ...payload };
      }
    } else if (action === 'delete') {
      (snapshot.tables as any)[table] = tableArr.filter(r => r[matchField] !== payload[matchField]);
    }

    // Save updated local mirror
    try {
      localStorage.setItem('AOE_LOCAL_BACKUP_MIRROR', JSON.stringify(snapshot));
    } catch (e) {}
  }

  /**
   * Enqueue offline action item
   */
  private enqueueOfflineAction(table: string, action: 'insert' | 'upsert' | 'update' | 'delete', payload: any, matchField: string) {
    const offlineItem: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      table,
      action,
      payload,
      matchField,
      timestamp: new Date().toISOString()
    };
    this.pendingQueue.push(offlineItem);
    this.saveOfflineQueue();
    this.notifyListeners();
  }

  /**
   * Flush pending offline queue items up to Supabase cloud
   */
  public async flushOfflineQueue() {
    if (this.pendingQueue.length === 0 || !this.isOnlineState) return;

    this.isSyncing = true;
    this.notifyListeners();

    console.log(`📤 Flushing ${this.pendingQueue.length} pending offline actions to Supabase cloud...`);

    const queueCopy = [...this.pendingQueue];
    const failedItems: OfflineAction[] = [];

    for (const item of queueCopy) {
      try {
        if (item.action === 'insert') {
          await supabase.from(item.table).insert(item.payload);
        } else if (item.action === 'upsert') {
          await supabase.from(item.table).upsert(item.payload);
        } else if (item.action === 'update') {
          await supabase.from(item.table).update(item.payload).eq(item.matchField || 'id', item.payload[item.matchField || 'id']);
        } else if (item.action === 'delete') {
          await supabase.from(item.table).delete().eq(item.matchField || 'id', item.payload[item.matchField || 'id']);
        }
      } catch (err) {
        console.error(`Failed to flush queue item ${item.id}:`, err);
        failedItems.push(item);
      }
    }

    this.pendingQueue = failedItems;
    this.saveOfflineQueue();
    this.isSyncing = false;
    this.notifyListeners();
  }

  /**
   * Subscribe status listener
   */
  public subscribe(callback: (status: { isOnline: boolean; pendingCount: number; lastSync: string; isSyncing: boolean }) => void) {
    this.listeners.push(callback);
    this.notifyListeners();
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    const lastSync = localStorage.getItem('AOE_LAST_BACKUP_TIMESTAMP') || new Date().toISOString();
    const status = {
      isOnline: this.isOnlineState,
      pendingCount: this.pendingQueue.length,
      lastSync,
      isSyncing: this.isSyncing
    };
    this.listeners.forEach(cb => cb(status));
  }
}

export const syncEngine = SyncEngine.getInstance();
