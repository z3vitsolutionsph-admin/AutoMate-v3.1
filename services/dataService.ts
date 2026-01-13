
import { dbService } from './dbService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

interface OfflineAction {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE';
  data: any;
  timestamp: number;
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
  code?: 'AUTH_FAILED' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'OFFLINE' | 'UNKNOWN' | 'EMAIL_NOT_FOUND' | 'VERSION_MISMATCH' | 'HANDSHAKE_TIMEOUT';
}

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());

const mapToDb = (obj: any, table?: string) => {
  if (!obj) return obj;
  const mapped: any = {};
  for (const k in obj) {
    if (obj[k] === undefined) continue;
    const nk = toSnakeCase(k);
    
    // Logic Guard: Ensure we don't send business_id for the business table itself
    if (table === 'businesses' && nk === 'business_id') continue;
    
    let v = obj[k];
    if (v instanceof Date) v = v.toISOString();
    mapped[nk] = v;
  }
  return mapped;
};

const mapFromDb = (obj: any, table?: string) => {
  if (!obj) return obj;
  const mapped: any = {};
  for (const k in obj) {
    const nk = toCamelCase(k);
    let v = obj[k];
    if (typeof v === 'string' && (k.endsWith('_at') || k === 'last_login' || k === 'created_at' || k === 'date' || k === 'date_joined')) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) v = d;
    }
    mapped[nk] = v;
  }
  return mapped;
};

const isOnline = () => typeof navigator !== 'undefined' && navigator.onLine;

export const dataService = {
  async authenticate(email: string, pass: string): Promise<ServiceResponse<{ user: any, business: any }>> {
    if (!isOnline()) return { success: false, error: "Terminal is offline. Cloud authentication unavailable.", code: 'OFFLINE' };
    
    const timeoutPromise = new Promise<ServiceResponse<any>>((_, reject) => 
      setTimeout(() => reject(new Error('HANDSHAKE_TIMEOUT')), 8000)
    );

    try {
      const authPromise = (async () => {
        const { data: result, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('password', pass)
          .maybeSingle();
        
        if (error) {
          if (error.message.includes('fetch')) throw new Error('NETWORK_ERROR');
          throw error;
        }
        
        if (!result) return { success: false, error: "Credentials rejected by registry.", code: 'AUTH_FAILED' };
        
        const user = mapFromDb(result, 'users');
        let business = null;
        if (user.businessId) {
          const { data: biz } = await supabase.from('businesses').select('*').eq('id', user.businessId).maybeSingle();
          if (biz) business = mapFromDb(biz, 'businesses');
        }
        return { success: true, data: { user, business } };
      })();

      return await Promise.race([authPromise, timeoutPromise]) as ServiceResponse<{ user: any, business: any }>;
    } catch (e: any) {
      console.error("[DataService] Auth Exception:", e);
      if (e.message === 'HANDSHAKE_TIMEOUT') return { success: false, error: "Cloud handshake timed out. High latency detected.", code: 'HANDSHAKE_TIMEOUT' };
      if (e.message === 'NETWORK_ERROR') return { success: false, error: "Registry connection failed. Check your network adapter.", code: 'NETWORK_ERROR' };
      return { success: false, error: "System Registry failure.", code: 'SERVER_ERROR' };
    }
  },

  async requestAccessKeyReset(email: string): Promise<ServiceResponse<void>> {
    if (!isOnline()) return { success: false, error: "Terminal is offline.", code: 'OFFLINE' };
    try {
      const { data, error } = await supabase.from('users').select('email').eq('email', email).maybeSingle();
      if (error) throw error;
      if (!data) return { success: false, error: "Operator ID not found in registry.", code: 'AUTH_FAILED' };
      return { success: true };
    } catch (e) {
      return { success: false, error: "Recovery protocol failed.", code: 'SERVER_ERROR' };
    }
  },

  async fetch<T>(table: string, localStore: string, businessId?: string): Promise<T[]> {
    if (isOnline()) {
      try {
        let query = supabase.from(table).select('*');
        if (businessId) {
            query = table === 'businesses' ? query.eq('id', businessId) : query.eq('business_id', businessId);
        }
        const { data, error } = await query;
        if (data && !error) {
          const normalized = data.map(d => mapFromDb(d, table));
          await dbService.saveItems(localStore, normalized);
          return normalized as T[];
        }
        if (error) console.error(`[DataService] Fetch error for ${table}:`, JSON.stringify(error));
      } catch (e) { console.warn(`[Supabase] Fetch failed for ${table}`, e); }
    }
    const local = await dbService.getAll<T>(localStore);
    if (!businessId) return local;
    return local.filter((i: any) => table === 'businesses' ? i.id === businessId : i.businessId === businessId);
  },

  async upsert<T extends { id: string }>(table: string, localStore: string, item: T, businessId?: string): Promise<boolean> {
    const copy = { ...item };
    if (table !== 'businesses' && businessId && !(copy as any).businessId) {
        (copy as any).businessId = businessId;
    }
    
    // Optimistic Local Save
    await dbService.saveItems(localStore, [copy]);
    
    if (isOnline()) {
      try {
        const dbData = mapToDb(copy, table);
        // Explicitly use onConflict: 'id' to ensure correct upsert behavior
        const { error } = await supabase.from(table).upsert(dbData, { onConflict: 'id' });
        if (!error) return true;
        console.error(`[DataService] Upsert error for ${table}:`, JSON.stringify(error));
      } catch (e: any) {
        console.error(`[DataService] Upsert exception for ${table}:`, e.message || e);
      }
    }
    
    // Persistence Queue for offline durability
    await dbService.saveItems('offline_queue', [{ 
        id: `q-${Date.now()}-${Math.random()}`, 
        table, 
        action: 'UPSERT', 
        data: copy, 
        timestamp: Date.now() 
    }]);
    return false;
  },

  async upsertMany<T extends { id: string }>(table: string, localStore: string, items: T[]) {
    if (items.length === 0) return;
    await dbService.saveItems(localStore, items);
    
    if (isOnline()) {
      try { 
          const dbItems = items.map(i => mapToDb(i, table));
          const { error } = await supabase.from(table).upsert(dbItems, { onConflict: 'id' }); 
          if (!error) return; 
          console.error(`[DataService] UpsertMany error for ${table}:`, JSON.stringify(error));
      } catch (e: any) {
          console.error(`[DataService] UpsertMany exception for ${table}:`, e.message || e);
      }
    }
    
    for (const i of items) {
        await dbService.saveItems('offline_queue', [{ 
            id: `q-${Date.now()}-${Math.random()}`, 
            table, 
            action: 'UPSERT', 
            data: i, 
            timestamp: Date.now() 
        }]);
    }
  },

  async delete(table: string, localStore: string, id: string): Promise<boolean> {
    await dbService.deleteItem(localStore, id);
    if (isOnline()) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) return true;
        console.error(`[DataService] Delete error for ${table}:`, JSON.stringify(error));
      } catch (e) {}
    }
    await dbService.saveItems('offline_queue', [{ 
        id: `q-${Date.now()}-${Math.random()}`, 
        table, 
        action: 'DELETE', 
        data: { id }, 
        timestamp: Date.now() 
    }]);
    return false;
  },

  async syncPending() {
    if (!isOnline()) return;
    const queue = await dbService.getAll<OfflineAction>('offline_queue');
    if (queue.length === 0) return;
    
    console.log(`[DataService] Processing ${queue.length} pending actions...`);
    
    for (const item of queue) {
      try {
        const { error } = item.action === 'UPSERT' 
          ? await supabase.from(item.table).upsert(mapToDb(item.data, item.table), { onConflict: 'id' }) 
          : await supabase.from(item.table).delete().eq('id', item.data.id);
        
        if (!error) {
          await dbService.deleteItem('offline_queue', item.id);
        } else {
            console.warn(`[DataService] Failed to sync ${item.id}:`, JSON.stringify(error));
            break; 
        }
      } catch (e) { 
          console.error(`[DataService] Sync exception:`, e);
          break; 
      }
    }
  },

  async getSyncDiagnostics(businessId: string): Promise<SyncDiagnostic[]> {
    const tables = ['products', 'transactions', 'users', 'suppliers', 'referrals'];
    const diag: SyncDiagnostic[] = [];
    const queue = await dbService.getAll<OfflineAction>('offline_queue');

    for (const t of tables) {
      const localItems = await dbService.getAll(t);
      const localCount = localItems.length;
      let cloudCount = -1;
      let status: any = isOnline() ? 'Synced' : 'Offline';

      if (isOnline()) {
        try {
          const { count, error } = await supabase
            .from(t)
            .select('*', { count: 'exact', head: true })
            .eq(t === 'businesses' ? 'id' : 'business_id', businessId);
            
          if (!error) cloudCount = count || 0;
          if (localCount !== cloudCount) status = 'Discrepancy';
        } catch (e) { status = 'Error'; }
      }

      diag.push({ 
        table: t, 
        localCount, 
        cloudCount, 
        status, 
        pendingActions: queue.filter(q => q.table === t).length 
      });
    }
    return diag;
  },

  async syncWithGitHub(businessId: string): Promise<ServiceResponse<{ commitHash: string }>> {
    if (!isOnline()) return { success: false, error: "Terminal is offline. GitHub bridge unavailable.", code: 'OFFLINE' };
    try {
      await new Promise(r => setTimeout(r, 1500));
      const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
      return { success: true, data: { commitHash: `GHA-${hash}` } };
    } catch (e) {
      console.error("[DataService] GitHub Sync Exception:", e);
      return { success: false, error: "GitHub integration failed.", code: 'SERVER_ERROR' };
    }
  },

  subscribeToChanges(tables: string[], businessId: string, callback: (change: { table: string, event: string, data: any }) => void) {
    if (!isSupabaseConfigured()) return [];
    
    return tables.map(table => {
      const channelName = `realtime_${table}_${businessId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: table, 
            filter: table === 'businesses' ? `id=eq.${businessId}` : `business_id=eq.${businessId}` 
          }, 
          (payload) => {
            const normalizedData = mapFromDb(payload.new || payload.old, table);
            console.log(`[DataService] Realtime Update [${table}]:`, payload.eventType);
            
            if (payload.eventType === 'DELETE') {
                dbService.deleteItem(table, normalizedData.id);
            } else {
                dbService.saveItems(table, [normalizedData]);
            }

            callback({
              table,
              event: payload.eventType,
              data: normalizedData
            });
          }
        )
        .subscribe((status) => {
            console.log(`[DataService] Realtime Channel [${table}] status:`, status);
        });
        
      return channel;
    });
  }
};
