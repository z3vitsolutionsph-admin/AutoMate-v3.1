
import { dbService } from './dbService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- Configuration ---
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const MAX_QUEUE_RETRIES = 5; // Drop item after 5 failed sync attempts to unblock queue

// --- Types ---
interface OfflineAction {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount?: number; 
}

export interface SyncDiagnostic {
  table: string;
  localCount: number;
  cloudCount: number;
  status: 'Synced' | 'Discrepancy' | 'Offline' | 'Error';
  pendingActions: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'AUTH_FAILED' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'OFFLINE' | 'UNKNOWN';
}

// --- Mapper Utilities ---
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const mapToDb = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const mapped: any = {};
  for (const key in obj) {
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

/**
 * Advanced Retry with Exponential Backoff and Jitter
 */
async function retryOperation<T>(
  operation: () => Promise<T>, 
  retries = MAX_RETRIES,
  delay = BASE_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const status = error?.status || error?.code; 
    const message = error?.message?.toLowerCase() || '';
    
    // Auth & Permission Errors (Fatal)
    const isFatalAuth = status === 401 || status === 403 || message.includes('jwt') || message.includes('invalid login');
    const isFatalValidation = status === 400 || status === 422;
    const isRLS = message.includes('row-level security') || message.includes('policy');
    const isSchemaError = message.includes('has no field'); // Schema mismatch

    if (isFatalAuth || isFatalValidation || isRLS || isSchemaError) {
      // Don't retry these
      throw error;
    }

    const isNetworkError = message.includes('fetch') || message.includes('network') || message.includes('connection') || message.includes('offline');
    const isServerStabilityError = (typeof status === 'number' && status >= 500) || status === 429 || status === 408;

    if (!isOnline()) throw new Error("Device offline");

    if (retries > 0 && (isNetworkError || isServerStabilityError)) {
      const jitter = Math.floor(Math.random() * 300);
      const nextDelay = (delay * 2) + jitter;
      console.warn(`[DataService] Transient issue (${status || 'Network'}). Retrying in ${nextDelay}ms... (${retries} attempts left)`);
      await wait(nextDelay);
      return retryOperation(operation, retries - 1, nextDelay);
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
  
  async authenticate(email: string, pass: string): Promise<ServiceResponse<{ user: any, business: any }>> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: "System misconfiguration: Database not linked.", code: 'SERVER_ERROR' };
    }
    if (!isOnline()) {
        return { success: false, error: "Offline mode active. Cannot verify credentials.", code: 'OFFLINE' };
    }

    try {
      const result = await retryOperation(async () => {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('password', pass)
          .maybeSingle();

        if (error) throw error;
        return user;
      });

      if (!result) {
        return { success: false, error: "Invalid credentials. Please check your inputs.", code: 'AUTH_FAILED' };
      }

      const user = mapFromDb(result);
      let business = null;

      if (user.businessId) {
        try {
            const bizData = await retryOperation(async () => {
                const { data: biz, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', user.businessId)
                .maybeSingle();
                
                if (bizError) throw bizError;
                return biz;
            });
            if (bizData) business = mapFromDb(bizData);
        } catch (bizErr) {
            console.warn("Could not fetch business details during login", bizErr);
        }
      }

      return { success: true, data: { user, business } };

    } catch (err: any) {
      console.error("Auth System Error:", err);
      const message = err.message?.toLowerCase() || '';
      if (message.includes('fetch') || message.includes('network')) {
          return { success: false, error: "Unable to reach security node. Check connection.", code: 'NETWORK_ERROR' };
      }
      return { success: false, error: "An internal system error occurred.", code: 'SERVER_ERROR' };
    }
  },

  async fetch<T>(table: string, localStore: string, businessId?: string): Promise<T[]> {
    if (isSupabaseConfigured() && isOnline()) {
      try {
        const cloudData = await retryOperation(async () => {
          let query = supabase.from(table).select('*');
          if (businessId) {
             // Handle root 'businesses' table differently as it doesn't have a parent 'business_id' column
             if (table === 'businesses') {
                query = query.eq('id', businessId);
             } else {
                query = query.eq('business_id', businessId);
             }
          }
          const { data, error } = await query;
          if (error) throw error;
          return data;
        });

        if (cloudData) {
          const normalizedData = cloudData.map(mapFromDb);
          await dbService.saveItems(localStore, normalizedData);
          return normalizedData as T[];
        }
      } catch (err: any) {
        console.warn(`[DataService] Cloud fetch failed for ${table}. Serving local cache.`, err.message);
      }
    }
    const localData = await dbService.getAll<T>(localStore);
    if (businessId && localData.length > 0) {
      if (table === 'businesses') {
         return localData.filter((item: any) => item.id === businessId) as T[];
      }
      return localData.filter((item: any) => !item.businessId || item.businessId === businessId) as T[];
    }
    return localData;
  },

  async upsert<T extends { id: string }>(table: string, localStore: string, item: T, businessId?: string): Promise<boolean> {
    const itemToSave = { ...item };
    
    // ARCHITECTURE FIX: The 'businesses' table is the root. It should NOT have a businessId column.
    // Child tables (users, products) MUST have businessId.
    if (table === 'businesses') {
        // Ensure we don't accidentally send businessId to the businesses table
        delete (itemToSave as any).businessId; 
    } else if (businessId) {
        (itemToSave as any).businessId = businessId;
    }
    
    await dbService.saveItems(localStore, [itemToSave]);

    if (isSupabaseConfigured()) {
      if (!isOnline()) {
        await queueOfflineAction(table, 'UPSERT', itemToSave);
        return false;
      }
      try {
        await retryOperation(async () => {
          const dbPayload = mapToDb(itemToSave);
          const { error } = await supabase.from(table).upsert(dbPayload);
          if (error) throw error;
        });
        return true;
      } catch (err: any) {
        const message = err.message?.toLowerCase() || '';
        
        if (message.includes('row-level security') || message.includes('policy')) {
           console.error(`[DataService] DATABASE PERMISSION ERROR: Run the SQL fix in Supabase.`);
           await queueOfflineAction(table, 'UPSERT', itemToSave);
        }
        else if (message.includes('foreign key constraint')) {
           // Parent record missing (likely pending in queue), queue this to retry later
           console.warn(`[DataService] FK Violation (Parent Missing). Queuing ${table} item.`);
           await queueOfflineAction(table, 'UPSERT', itemToSave);
        }
        else if (message.includes('record "new" has no field')) {
           console.error(`[DataService] SCHEMA MISMATCH: The database policy is checking a column that doesn't exist.`);
           // Queue anyway, hoping the DB schema gets fixed
           await queueOfflineAction(table, 'UPSERT', itemToSave);
        }
        else if (message.includes('fetch') || message.includes('network') || message === 'device offline') {
           await queueOfflineAction(table, 'UPSERT', itemToSave);
        } else {
           console.error(`[DataService] Cloud Upsert Failure:`, err.message);
        }
        return false;
      }
    }
    return true;
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
        // If bulk fail, queue individually
        for (const item of items) await queueOfflineAction(table, 'UPSERT', item);
      }
    }
  },

  async syncPending() {
    if (!isSupabaseConfigured() || !isOnline()) return;
    const queue = await dbService.getAll<OfflineAction>('offline_queue');
    if (queue.length === 0) return;
    
    // CRITICAL: Sort queue by dependency order.
    // 'businesses' table MUST be synced first because other tables reference it via FK.
    queue.sort((a, b) => {
        // 1. Businesses first
        if (a.table === 'businesses' && b.table !== 'businesses') return -1;
        if (a.table !== 'businesses' && b.table === 'businesses') return 1;
        
        // 2. Users second (often needed for audit logs)
        if (a.table === 'users' && b.table !== 'users') return -1;
        if (a.table !== 'users' && b.table === 'users') return 1;

        // 3. Chronological order for everything else
        return a.timestamp - b.timestamp;
    });

    console.log(`[DataService] Processing ${queue.length} pending actions...`);

    for (const item of queue) {
      try {
        if (item.action === 'UPSERT') {
          // IMPORTANT: Re-map and sanitize again right before sync
          let cleanData = { ...item.data };
          if (item.table === 'businesses') {
             delete cleanData.businessId; 
          }
          
          const dbPayload = mapToDb(cleanData);
          const { error } = await supabase.from(item.table).upsert(dbPayload);
          if (error) throw error;
        } else if (item.action === 'DELETE') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
          if (error) throw error;
        }
        await dbService.deleteItem('offline_queue', item.id);
      } catch (err: any) {
        const message = err.message?.toLowerCase() || '';
        
        // Stop processing if permissions are broken to avoid spamming the log
        if (message.includes('row-level security') || message.includes('policy')) {
           console.warn(`[DataService] Sync paused due to Database Permission Error.`);
           break;
        }
        
        // Stop if network drops
        if (message.includes('fetch') || message.includes('network') || err.status >= 500) {
           console.warn(`[DataService] Sync paused due to network instability.`);
           break; 
        } 
        
        // If it's still a Foreign Key error, maybe the parent failed in a previous loop?
        // We increment retry count and try again later.
        else {
           item.retryCount = (item.retryCount || 0) + 1;
           if (item.retryCount > MAX_QUEUE_RETRIES) {
             console.error(`[DataService] Dropping item ${item.id} after max retries:`, err.message);
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
      // Businesses table filter is id, others are business_id
      const filter = table === 'businesses' ? `id=eq.${businessId}` : `business_id=eq.${businessId}`;
      
      const channel = supabase.channel(`public:${table}:${businessId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table, filter: filter },
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
  },

  async getSyncDiagnostics(businessId: string): Promise<SyncDiagnostic[]> {
    const report: SyncDiagnostic[] = [];
    const tables = [
      { name: 'businesses', store: 'businesses' },
      { name: 'products', store: 'products' },
      { name: 'transactions', store: 'transactions' },
      { name: 'suppliers', store: 'suppliers' },
      { name: 'users', store: 'users' },
      { name: 'referrals', store: 'referrals' }
    ];

    const queue = await dbService.getAll<OfflineAction>('offline_queue');

    for (const t of tables) {
      let status: SyncDiagnostic['status'] = 'Offline';
      let cloudCount = 0;
      
      const allLocal = await dbService.getAll(t.store);
      // Local count filtering
      const localCount = t.name === 'businesses' 
         ? allLocal.filter((i: any) => i.id === businessId).length
         : allLocal.filter((i: any) => i.businessId === businessId).length;
         
      const pending = queue.filter(q => q.table === t.name).length;

      if (isOnline() && isSupabaseConfigured()) {
        try {
          let query = supabase.from(t.name).select('*', { count: 'exact', head: true });
          if (t.name === 'businesses') query = query.eq('id', businessId);
          else query = query.eq('business_id', businessId);

          const { count, error } = await query;
          
          if (!error && count !== null) {
            cloudCount = count;
            status = localCount === cloudCount ? 'Synced' : 'Discrepancy';
          } else {
            status = 'Error';
          }
        } catch (e) {
          status = 'Error';
        }
      } else {
        status = 'Offline';
      }

      report.push({
        table: t.name,
        localCount,
        cloudCount,
        status,
        pendingActions: pending
      });
    }
    return report;
  }
};
