import { supabase, isSupabaseConfigured } from './supabaseClient';
import { dbService } from './dbService';

// --- Types ---
interface QueueItem {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE';
  payload: any;
  timestamp: number;
  retryCount: number;
}

// --- Mappers ---
const toSnakeCase = (obj: any): any => {
  if (!obj) return obj;
  const newObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

const toCamelCase = (obj: any): any => {
  if (!obj) return obj;
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

// --- Sync Service ---

export const dataService = {
  
  /**
   * Fetches data from Supabase if available, caches it to LocalDB, 
   * and returns the data. Falls back to LocalDB if offline.
   */
  async fetch<T>(table: string, localStore: string): Promise<T[]> {
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
          const mappedData = data.map(toCamelCase) as T[];
          // Update Local Cache
          await dbService.saveItems(localStore, mappedData);
          return mappedData;
        } else {
          console.warn(`[Sync] Cloud fetch failed for ${table}, falling back to local.`, error);
        }
      } catch (e) {
        console.warn(`[Sync] Network error for ${table}, using local data.`);
      }
    }
    // Fallback
    return await dbService.getAll<T>(localStore);
  },

  /**
   * Upserts an item to LocalDB immediately, then tries Supabase.
   * If offline or fails, queues it for later.
   */
  async upsert<T extends { id: string }>(table: string, localStore: string, item: T, businessId?: string) {
    // 1. Save Local (Optimistic UI)
    await dbService.saveItems(localStore, [item]);

    // 2. Prepare Payload
    const payload = toSnakeCase(item);
    if (businessId && !payload.business_id) {
      payload.business_id = businessId;
    }

    // 3. Try Cloud Sync
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const { error } = await supabase.from(table).upsert(payload);
        if (error) throw error;
        return; // Success
      } catch (e) {
        console.warn(`[Sync] Upload failed for ${table}, queuing.`, e);
      }
    }

    // 4. Queue if failed or offline
    const queueItem: QueueItem = {
      id: `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      table,
      action: 'UPSERT',
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };
    await dbService.saveItems('offline_queue', [queueItem]);
  },

  /**
   * Deletes an item from LocalDB, then tries Supabase.
   * If offline or fails, queues it.
   */
  async delete(table: string, localStore: string, id: string) {
    // 1. Local Delete
    await dbService.deleteItem(localStore, id);

    // 2. Try Cloud Delete
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return; // Success
      } catch (e) {
        console.warn(`[Sync] Delete failed for ${table}, queuing.`, e);
      }
    }

    // 3. Queue if failed or offline
    const queueItem: QueueItem = {
      id: `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      table,
      action: 'DELETE',
      payload: { id },
      timestamp: Date.now(),
      retryCount: 0
    };
    await dbService.saveItems('offline_queue', [queueItem]);
  },

  /**
   * Process pending items in the offline queue.
   * Call this on app init or when online status changes.
   */
  async syncPending() {
    if (!navigator.onLine || !isSupabaseConfigured()) return;

    const queue = await dbService.getAll<QueueItem>('offline_queue');
    if (queue.length === 0) return;

    console.log(`[Sync] Processing ${queue.length} pending operations...`);

    for (const item of queue) {
      try {
        let error = null;
        if (item.action === 'UPSERT') {
          const { error: upsertError } = await supabase.from(item.table).upsert(item.payload);
          error = upsertError;
        } else if (item.action === 'DELETE') {
          const { error: deleteError } = await supabase.from(item.table).delete().eq('id', item.payload.id);
          error = deleteError;
        }

        if (!error) {
          // Success: Remove from queue
          await dbService.deleteItem('offline_queue', item.id);
        } else {
          console.error(`[Sync] Failed to process queue item ${item.id}`, error);
          // Optional: Implement retry count logic here
        }
      } catch (e) {
        console.error(`[Sync] Error processing queue item ${item.id}`, e);
      }
    }
  }
};
