
import { dbService } from './dbService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// --- Configuration ---
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

// --- Types ---
interface OfflineAction {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE';
  data: any;
  timestamp: number;
}

// --- Helpers ---
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Executes a promise with exponential backoff retry logic.
 */
async function retryOperation<T>(
  operation: () => Promise<T>, 
  retries = MAX_RETRIES,
  delay = BASE_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Retry on network errors or 5xx server errors
    const isRetryable = 
      error.message?.includes('fetch') || 
      error.message?.includes('network') || 
      (error.status && error.status >= 500);

    if (retries > 0 && isRetryable) {
      console.warn(`[DataService] Operation failed. Retrying in ${delay}ms... (${retries} attempts left)`);
      await wait(delay);
      return retryOperation(operation, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

/**
 * Queues an action for offline synchronization.
 */
async function queueOfflineAction(table: string, action: 'UPSERT' | 'DELETE', data: any) {
  const offlineItem: OfflineAction = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    table,
    action,
    data,
    timestamp: Date.now()
  };
  await dbService.saveItems('offline_queue', [offlineItem]);
  console.log(`[DataService] Action queued offline: ${action} on ${table}`);
}

// --- Data Service (Cloud Hybrid + Resilience) ---

export const dataService = {
  
  /**
   * Authenticate user against Cloud DB
   */
  async authenticate(email: string, pass: string) {
    if (!isSupabaseConfigured()) return null;
    try {
      // 1. Get User
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', pass) // In production, use hashed passwords
        .maybeSingle();

      if (error || !user) return null;

      // 2. Get Business
      let business = null;
      if (user.business_id) {
        const { data: biz, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', user.business_id)
          .maybeSingle();
        
        if (!bizError && biz) business = biz;
      }

      return { user, business };
    } catch (err) {
      console.error("Auth error:", err);
      return null;
    }
  },

  /**
   * Fetches data with Cloud-First, Local-Fallback strategy.
   * Includes retry logic for unstable connections.
   */
  async fetch<T>(table: string, localStore: string, businessId?: string): Promise<T[]> {
    // 1. Try Cloud Fetch
    if (isSupabaseConfigured()) {
      try {
        const cloudData = await retryOperation(async () => {
          let query = supabase.from(table).select('*');
          if (businessId) {
            // Map camelCase businessId to snake_case business_id for SQL
            query = query.eq('business_id', businessId);
          }
          
          const { data, error } = await query;
          if (error) throw error;
          return data;
        });

        if (cloudData) {
          // Normalize Data (snake_case -> camelCase if needed, though simple strategy is to align types)
          // For this implementation we assume types handle optional mapping or we store as received.
          
          // Map snake_case to camelCase for specific fields if necessary before saving
          const normalizedData = cloudData.map((item: any) => {
             if (item.business_id) {
                item.businessId = item.business_id; // Polyfill for frontend types
             }
             return item;
          });

          // Sync successful: Update local cache
          await dbService.saveItems(localStore, normalizedData);
          return normalizedData as T[];
        }
      } catch (err: any) {
        console.warn(`[DataService] Cloud unreachable for ${table}. Serving local data. Error: ${err.message}`);
      }
    }

    // 2. Fallback to Local IndexedDB
    let localData = await dbService.getAll<T>(localStore);
    
    // Client-side filtering
    if (businessId && localData.length > 0) {
      localData = localData.filter((item: any) => 
        !item.businessId || item.businessId === businessId || !item.business_id || item.business_id === businessId
      );
    }
    return localData;
  },

  /**
   * Upserts an item. Optimistically updates LocalDB, then pushes to Supabase.
   * If Cloud fails, queues for offline sync.
   */
  async upsert<T extends { id: string }>(table: string, localStore: string, item: T, businessId?: string) {
    const itemToSave = { ...item };
    
    // Ensure businessId is attached (handle both camel and snake for hybrid compat)
    if (businessId) {
       (itemToSave as any).businessId = businessId;
       (itemToSave as any).business_id = businessId;
    }
    
    // Auto-timestamp
    if (!(itemToSave as any).updated_at) {
        (itemToSave as any).updated_at = new Date().toISOString();
    }

    // 1. Optimistic Local Save
    await dbService.saveItems(localStore, [itemToSave]);

    // 2. Push to Cloud with Retry
    if (isSupabaseConfigured()) {
      try {
        await retryOperation(async () => {
          const { error } = await supabase.from(table).upsert(itemToSave);
          if (error) throw error;
        });
      } catch (err: any) {
        console.error(`[DataService] Cloud upsert failed for ${table}:`, err.message);
        await queueOfflineAction(table, 'UPSERT', itemToSave);
      }
    }
  },

  /**
   * Deletes an item. Optimistically deletes from LocalDB, then Supabase.
   */
  async delete(table: string, localStore: string, id: string) {
    // 1. Optimistic Local Delete
    await dbService.deleteItem(localStore, id);

    // 2. Delete from Cloud with Retry
    if (isSupabaseConfigured()) {
      try {
        await retryOperation(async () => {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
        });
      } catch (err: any) {
        console.error(`[DataService] Cloud delete failed for ${table}:`, err.message);
        await queueOfflineAction(table, 'DELETE', { id });
      }
    }
  },

  /**
   * Bulk upsert helper
   */
  async upsertMany<T extends { id: string }>(table: string, localStore: string, items: T[]) {
    if (items.length === 0) return;

    // 1. Local Save
    await dbService.saveItems(localStore, items);

    // 2. Cloud Save
    if (isSupabaseConfigured()) {
      try {
        await retryOperation(async () => {
          // Ensure snake_case mapping for DB
          const dbItems = items.map((i: any) => ({
             ...i,
             business_id: i.businessId || i.business_id, // ensure snake_case for Supabase
          }));

          const { error } = await supabase.from(table).upsert(dbItems);
          if (error) throw error;
        });
      } catch (err: any) {
        console.error(`[DataService] Cloud bulk upsert failed for ${table}:`, err.message);
        // Queue individual items to ensure consistency
        for (const item of items) {
          await queueOfflineAction(table, 'UPSERT', item);
        }
      }
    }
  },

  /**
   * Process the offline queue. 
   * Call this on app start or when network status changes to online.
   */
  async syncPending() {
    if (!isSupabaseConfigured()) return;

    const queue = await dbService.getAll<OfflineAction>('offline_queue');
    if (queue.length === 0) return;

    console.log(`[DataService] Processing ${queue.length} offline actions...`);

    for (const item of queue) {
      try {
        if (item.action === 'UPSERT') {
          const { error } = await supabase.from(item.table).upsert(item.data);
          if (error) throw error;
        } else if (item.action === 'DELETE') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
          if (error) throw error;
        }
        
        // Remove from queue if successful
        await dbService.deleteItem('offline_queue', item.id);
      } catch (err) {
        console.error(`[DataService] Failed to sync item ${item.id}`, err);
        // Keep in queue to retry later
      }
    }
  }
};
