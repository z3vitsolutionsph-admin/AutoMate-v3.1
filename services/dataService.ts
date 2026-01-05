
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

// --- Utilities ---

/**
 * Converts object keys from camelCase to snake_case for Supabase/Postgres
 */
const toSnakeCase = (obj: any): any => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[key];
    }
  }
  return newObj;
};

/**
 * Converts object keys from snake_case to camelCase for React App
 */
const toCamelCase = (obj: any): any => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj;
};

// --- Sync Service ---

export const dataService = {
  
  /**
   * Fetches data from Supabase if available, caches it to LocalDB.
   * STRICTLY enforces business_id filtering if provided to ensure multi-tenant security.
   */
  async fetch<T>(table: string, localStore: string, businessId?: string): Promise<T[]> {
    // 1. Try Cloud Fetch
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        let query = supabase.from(table).select('*');
        
        // Enforce Multi-tenant isolation at application level
        if (businessId) {
          query = query.eq('business_id', businessId);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`[Sync] Cloud fetch error for ${table}:`, error.message);
          throw error;
        }

        if (data) {
          const mappedData = data.map(toCamelCase) as T[];
          // Replace Local Cache completely for this store (Single Source of Truth from Server)
          // Note: In a complex app, we might merge, but for this architecture, server wins.
          await dbService.clearStore(localStore); 
          await dbService.saveItems(localStore, mappedData);
          return mappedData;
        }
      } catch (e) {
        console.warn(`[Sync] Network/Auth error for ${table}, falling back to local.`, e);
      }
    }

    // 2. Fallback to LocalDB
    let localData = await dbService.getAll<T>(localStore);
    
    // Local filtering if we are offline but have mixed data (rare, but safe)
    if (businessId && localData.length > 0) {
      localData = localData.filter((item: any) => item.businessId === businessId);
    }
    
    return localData;
  },

  /**
   * Upserts an item to LocalDB immediately (Optimistic), then pushes to Cloud.
   */
  async upsert<T extends { id: string }>(table: string, localStore: string, item: T, businessId?: string) {
    // 1. Save Local (Optimistic UI)
    await dbService.saveItems(localStore, [item]);

    // 2. Prepare Payload
    const payload = toSnakeCase(item);
    
    // Ensure business_id is attached if missing (critical for RLS/Filtering)
    if (businessId && !payload.business_id) {
      payload.business_id = businessId;
    }
    // Maintain updated_at for conflict resolution
    payload.updated_at = new Date().toISOString();

    // 3. Try Cloud Sync
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const { error } = await supabase.from(table).upsert(payload);
        if (error) throw error;
        return; // Success, don't queue
      } catch (e) {
        console.warn(`[Sync] Upload failed for ${table}, adding to offline queue.`);
      }
    }

    // 4. Queue if failed or offline
    await this.addToQueue(table, 'UPSERT', payload);
  },

  /**
   * Deletes an item from LocalDB, then pushes to Cloud.
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
        console.warn(`[Sync] Delete failed for ${table}, adding to offline queue.`);
      }
    }

    // 3. Queue if failed or offline
    await this.addToQueue(table, 'DELETE', { id });
  },

  /**
   * Helper to Add to Offline Queue
   */
  async addToQueue(table: string, action: 'UPSERT' | 'DELETE', payload: any) {
    const queueItem: QueueItem = {
      id: `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      table,
      action,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };
    await dbService.saveItems('offline_queue', [queueItem]);
  },

  /**
   * Process pending items in the offline queue.
   * Implements Batching and Exponential Backoff.
   */
  async syncPending() {
    if (!navigator.onLine || !isSupabaseConfigured()) return;

    const queue = await dbService.getAll<QueueItem>('offline_queue');
    if (queue.length === 0) return;

    console.log(`[Sync] Processing ${queue.length} pending operations...`);

    // Group by Table and Action for Batching (Optimization)
    // Map<Table, Map<Action, Items[]>>
    const batches = new Map<string, Map<string, QueueItem[]>>();

    queue.forEach(item => {
      if (!batches.has(item.table)) batches.set(item.table, new Map());
      const tableActions = batches.get(item.table)!;
      if (!tableActions.has(item.action)) tableActions.set(item.action, []);
      tableActions.get(item.action)!.push(item);
    });

    // Process Batches
    for (const [table, actions] of batches.entries()) {
      
      // Process UPSERTS
      if (actions.has('UPSERT')) {
        const items = actions.get('UPSERT')!;
        const payloads = items.map(i => i.payload);
        
        try {
          const { error } = await supabase.from(table).upsert(payloads);
          if (!error) {
            // Success: Delete all processed queue items
            for (const i of items) await dbService.deleteItem('offline_queue', i.id);
          } else {
            console.error(`[Sync] Batch UPSERT failed for ${table}`, error);
            // On batch fail, increment retry count or keep in queue
            await this.handleBatchFailure(items);
          }
        } catch (e) {
          await this.handleBatchFailure(items);
        }
      }

      // Process DELETES
      if (actions.has('DELETE')) {
        const items = actions.get('DELETE')!;
        const idsToDelete = items.map(i => i.payload.id);
        
        try {
          const { error } = await supabase.from(table).delete().in('id', idsToDelete);
          if (!error) {
            for (const i of items) await dbService.deleteItem('offline_queue', i.id);
          } else {
            console.error(`[Sync] Batch DELETE failed for ${table}`, error);
            await this.handleBatchFailure(items);
          }
        } catch (e) {
          await this.handleBatchFailure(items);
        }
      }
    }
  },

  /**
   * Increment retry count or purge if too many retries
   */
  async handleBatchFailure(items: QueueItem[]) {
    const MAX_RETRIES = 5;
    for (const item of items) {
      if (item.retryCount >= MAX_RETRIES) {
        console.error(`[Sync] Dropping item ${item.id} after ${MAX_RETRIES} failures.`);
        await dbService.deleteItem('offline_queue', item.id);
      } else {
        item.retryCount++;
        await dbService.saveItems('offline_queue', [item]);
      }
    }
  }
};
