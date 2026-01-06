
import { dbService } from './dbService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- Configuration ---
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const MAX_QUEUE_RETRIES = 5; // Drop item after 5 failed sync attempts to unblock queue

// --- Types ---
interface OfflineAction {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount?: number; // Track retries for dead letter logic
}

// --- Mapper Utilities ---
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const mapToDb = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const mapped: any = {};
  for (const key in obj) {
    // Explicitly handle fields that shouldn't be mapped or need special handling
    const newKey = toSnakeCase(key);
    mapped[newKey] = obj[key];
  }
  return mapped;
};

const mapFromDb = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const mapped: any = {};
  for (const key in obj) {
    const newKey = toCamelCase(key);
    mapped[newKey] = obj[key];
  }
  return mapped;
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper to check actual browser connectivity status
const isOnline = () => typeof navigator !== 'undefined' && navigator.onLine;

async function retryOperation<T>(
  operation: () => Promise<T>, 
  retries = MAX_RETRIES,
  delay = BASE_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isNetworkError = 
      error.message?.includes('fetch') || 
      error.message?.includes('network') || 
      (error.status && error.status >= 500);

    // If we are definitely offline, don't retry, just fail fast so we can queue
    if (!isOnline()) {
      throw new Error("Device offline");
    }

    if (retries > 0 && isNetworkError) {
      console.warn(`[DataService] Network glitch detected. Retrying in ${delay}ms... (${retries} attempts left)`);
      await wait(delay);
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function queueOfflineAction(table: string, action: 'UPSERT' | 'DELETE', data: any) {
  const offlineItem: OfflineAction = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    table,
    action,
    data,
    timestamp: Date.now(),
    retryCount: 0
  };
  await dbService.saveItems('offline_queue', [offlineItem]);
}

export const dataService = {
  
  async authenticate(email: string, pass: string) {
    if (!isSupabaseConfigured() || !isOnline()) return null;
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', pass)
        .maybeSingle();

      if (error) throw error;
      if (!user) return null;

      let business = null;
      if (user.business_id) {
        const { data: biz, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', user.business_id)
          .maybeSingle();
        
        if (!bizError && biz) business = mapFromDb(biz);
      }

      return { user: mapFromDb(user), business };
    } catch (err) {
      console.error("Auth error:", err);
      return null;
    }
  },

  async fetch<T>(table: string, localStore: string, businessId?: string): Promise<T[]> {
    // 1. Try Cloud if Online
    if (isSupabaseConfigured() && isOnline()) {
      try {
        const cloudData = await retryOperation(async () => {
          let query = supabase.from(table).select('*');
          if (businessId) query = query.eq('business_id', businessId);
          const { data, error } = await query;
          if (error) throw error;
          return data;
        });

        if (cloudData) {
          const normalizedData = cloudData.map(mapFromDb);
          // Update local cache
          await dbService.saveItems(localStore, normalizedData);
          return normalizedData as T[];
        }
      } catch (err: any) {
        console.warn(`[DataService] Cloud fetch failed for ${table} (Offline/Error). Serving local cache.`);
      }
    }
    
    // 2. Fallback to Local
    const localData = await dbService.getAll<T>(localStore);
    if (businessId && localData.length > 0) {
      return localData.filter((item: any) => !item.businessId || item.businessId === businessId) as T[];
    }
    return localData;
  },

  async upsert<T extends { id: string }>(table: string, localStore: string, item: T, businessId?: string) {
    const itemToSave = { ...item };
    if (businessId) (itemToSave as any).businessId = businessId;
    if (!(itemToSave as any).updatedAt) (itemToSave as any).updatedAt = new Date().toISOString();

    // 1. Always save to Local DB first (Optimistic UI)
    await dbService.saveItems(localStore, [itemToSave]);

    // 2. Attempt Cloud Sync
    if (isSupabaseConfigured()) {
      // Fast exit if offline
      if (!isOnline()) {
        console.log(`[DataService] Device offline. Queued ${table} upsert.`);
        await queueOfflineAction(table, 'UPSERT', itemToSave);
        return;
      }

      try {
        await retryOperation(async () => {
          const dbPayload = mapToDb(itemToSave);
          const { error } = await supabase.from(table).upsert(dbPayload);
          if (error) throw error;
        });
      } catch (err: any) {
        const isNetworkError = err.message?.includes('fetch') || err.message?.includes('network') || err.message === 'Device offline';
        
        if (isNetworkError) {
           console.warn(`[DataService] Connection interrupted. Added ${table} to offline queue.`);
        } else {
           console.error(`[DataService] API Error for ${table}:`, err.message);
        }
        await queueOfflineAction(table, 'UPSERT', itemToSave);
      }
    }
  },

  async delete(table: string, localStore: string, id: string) {
    await dbService.deleteItem(localStore, id);
    
    if (isSupabaseConfigured()) {
      if (!isOnline()) {
        await queueOfflineAction(table, 'DELETE', { id });
        return;
      }

      try {
        await retryOperation(async () => {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
        });
      } catch (err: any) {
        await queueOfflineAction(table, 'DELETE', { id });
      }
    }
  },

  async upsertMany<T extends { id: string }>(table: string, localStore: string, items: T[]) {
    if (items.length === 0) return;
    await dbService.saveItems(localStore, items);
    
    if (isSupabaseConfigured()) {
      if (!isOnline()) {
        console.log(`[DataService] Device offline. Queued batch upsert for ${table}.`);
        for (const item of items) await queueOfflineAction(table, 'UPSERT', item);
        return;
      }

      try {
        await retryOperation(async () => {
          const dbItems = items.map(mapToDb);
          const { error } = await supabase.from(table).upsert(dbItems);
          if (error) throw error;
        });
      } catch (err: any) {
        console.warn(`[DataService] Batch sync failed. Queuing individually.`);
        for (const item of items) await queueOfflineAction(table, 'UPSERT', item);
      }
    }
  },

  async syncPending() {
    if (!isSupabaseConfigured() || !isOnline()) return;
    
    const queue = await dbService.getAll<OfflineAction>('offline_queue');
    if (queue.length === 0) return;
    
    // Sort by timestamp to preserve order of operations
    queue.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`[DataService] Syncing ${queue.length} pending actions...`);

    for (const item of queue) {
      try {
        if (item.action === 'UPSERT') {
          const dbPayload = mapToDb(item.data);
          const { error } = await supabase.from(item.table).upsert(dbPayload);
          if (error) throw error;
        } else if (item.action === 'DELETE') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
          if (error) throw error;
        }
        // Success: Remove from queue
        await dbService.deleteItem('offline_queue', item.id);
      } catch (err: any) {
        const isNetworkError = err.message?.includes('fetch') || err.message?.includes('network');
        const isServerError = err.status >= 500;
        
        item.retryCount = (item.retryCount || 0) + 1;

        if (isNetworkError || isServerError) {
           // If network fails during sync, stop processing queue to maintain order
           console.warn(`[DataService] Sync paused due to network instability.`);
           break; 
        } else {
           // Data/Logic error (e.g. Constraint violation)
           if (item.retryCount > MAX_QUEUE_RETRIES) {
             console.error(`[DataService] Dropping malformed action ${item.id} after ${MAX_QUEUE_RETRIES} attempts.`);
             await dbService.deleteItem('offline_queue', item.id);
           } else {
             await dbService.saveItems('offline_queue', [item]);
           }
        }
      }
    }
  },

  subscribeToChanges(tables: string[], businessId: string, onChange: (payload: any) => void): RealtimeChannel[] {
    if (!isSupabaseConfigured()) return [];
    const channels: RealtimeChannel[] = [];
    tables.forEach(table => {
      const channel = supabase
        .channel(`public:${table}:${businessId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: table, filter: `business_id=eq.${businessId}` },
          (payload) => {
            let data: any = null;
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
               data = mapFromDb(payload.new);
               dbService.saveItems(table, [data]);
            } else if (payload.eventType === 'DELETE') {
               data = payload.old;
               dbService.deleteItem(table, (data as any).id);
            }
            onChange({ table, event: payload.eventType, data });
          }
        )
        .subscribe();
      channels.push(channel);
    });
    return channels;
  }
};
