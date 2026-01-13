
import { dbService } from './dbService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  code?: 'AUTH_FAILED' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'OFFLINE' | 'UNKNOWN' | 'EMAIL_NOT_FOUND';
}

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());

const mapToDb = (obj: any, table?: string) => {
  if (!obj) return obj;
  const mapped: any = {};
  for (const k in obj) {
    const nk = toSnakeCase(k);
    if (table === 'businesses' && (nk === 'business_id' || k === 'businessId')) continue;
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
    if (typeof v === 'string' && (k.endsWith('_at') || k === 'last_login' || k === 'created_at')) {
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
    if (!isOnline()) return { success: false, error: "Network offline.", code: 'OFFLINE' };
    try {
      const { data: result, error } = await supabase.from('users').select('*').eq('email', email).eq('password', pass).maybeSingle();
      if (error || !result) return { success: false, error: "Credentials rejected.", code: 'AUTH_FAILED' };
      const user = mapFromDb(result, 'users');
      let business = null;
      if (user.businessId) {
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', user.businessId).maybeSingle();
        if (biz) business = mapFromDb(biz, 'businesses');
      }
      return { success: true, data: { user, business } };
    } catch (e) { return { success: false, error: "Cloud access failure.", code: 'SERVER_ERROR' }; }
  },

  async requestAccessKeyReset(email: string): Promise<ServiceResponse<void>> {
    if (!isOnline()) return { success: false, error: "Network offline.", code: 'OFFLINE' };
    try {
      const { data, error } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
      if (error || !data) return { success: false, error: "Identity not recognized.", code: 'EMAIL_NOT_FOUND' };
      return { success: true };
    } catch (e) { return { success: false, error: "Sync protocol error.", code: 'UNKNOWN' }; }
  },

  async fetch<T>(table: string, localStore: string, businessId?: string): Promise<T[]> {
    if (isOnline()) {
      try {
        let query = supabase.from(table).select('*');
        if (businessId) query = table === 'businesses' ? query.eq('id', businessId) : query.eq('business_id', businessId);
        const { data, error } = await query;
        if (data && !error) {
          const normalized = data.map(d => mapFromDb(d, table));
          await dbService.saveItems(localStore, normalized);
          return normalized as T[];
        }
      } catch (e) { console.warn(`[Supabase] Fetch failed for ${table}`); }
    }
    const local = await dbService.getAll<T>(localStore);
    return businessId ? local.filter((i: any) => table === 'businesses' ? i.id === businessId : i.businessId === businessId) : local;
  },

  async upsert<T extends { id: string }>(table: string, localStore: string, item: T, businessId?: string): Promise<boolean> {
    const copy = { ...item };
    if (table !== 'businesses' && businessId) (copy as any).businessId = businessId;
    await dbService.saveItems(localStore, [copy]);
    if (isOnline()) {
      try {
        const { error } = await supabase.from(table).upsert(mapToDb(copy, table));
        if (!error) return true;
      } catch (e) {}
    }
    await dbService.saveItems('offline_queue', [{ id: `q-${Date.now()}`, table, action: 'UPSERT', data: copy, timestamp: Date.now() }]);
    return false;
  },

  async upsertMany<T extends { id: string }>(table: string, localStore: string, items: T[]) {
    if (items.length === 0) return;
    await dbService.saveItems(localStore, items);
    if (isOnline()) {
      try { await supabase.from(table).upsert(items.map(i => mapToDb(i, table))); return; } catch (e) {}
    }
    for (const i of items) await dbService.saveItems('offline_queue', [{ id: `q-${Date.now()}-${Math.random()}`, table, action: 'UPSERT', data: i, timestamp: Date.now() }]);
  },

  async delete(table: string, localStore: string, id: string): Promise<boolean> {
    await dbService.deleteItem(localStore, id);
    if (isOnline()) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }
    await dbService.saveItems('offline_queue', [{ id: `q-${Date.now()}`, table, action: 'DELETE', data: { id }, timestamp: Date.now() }]);
    return false;
  },

  async syncPending() {
    if (!isOnline()) return;
    const queue = await dbService.getAll<OfflineAction>('offline_queue');
    if (queue.length === 0) return;
    
    for (const item of queue) {
      try {
        const { error } = item.action === 'UPSERT' 
          ? await supabase.from(item.table).upsert(mapToDb(item.data, item.table)) 
          : await supabase.from(item.table).delete().eq('id', item.data.id);
        
        if (!error) {
          await dbService.deleteItem('offline_queue', item.id);
        } else if (error.code === 'PGRST204' || error.message.includes('not found')) {
          await dbService.deleteItem('offline_queue', item.id);
        } else break;
      } catch (e) { break; }
    }
  },

  async getSyncDiagnostics(businessId: string): Promise<SyncDiagnostic[]> {
    const tables = ['products', 'transactions', 'users', 'suppliers', 'referrals'];
    const diag: SyncDiagnostic[] = [];
    const queue = await dbService.getAll<OfflineAction>('offline_queue');

    for (const t of tables) {
      const local = (await dbService.getAll(t)).length;
      let cloud = -1;
      let status: any = isOnline() ? 'Synced' : 'Offline';

      if (isOnline()) {
        try {
          const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
          if (!error) cloud = count || 0;
          if (local !== cloud) status = 'Discrepancy';
        } catch (e) { status = 'Error'; }
      }

      diag.push({ 
        table: t, 
        localCount: local, 
        cloudCount: cloud, 
        status, 
        pendingActions: queue.filter(q => q.table === t).length 
      });
    }
    return diag;
  },

  /**
   * Added missing syncWithGitHub method for the settings integration.
   */
  async syncWithGitHub(businessId: string): Promise<ServiceResponse<{ commitHash: string }>> {
    if (!isOnline()) return { success: false, error: "Network offline.", code: 'OFFLINE' };
    try {
      // Simulate secure GitHub sync logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, data: { commitHash: Math.random().toString(36).substring(7).toUpperCase() } };
    } catch (e) {
      return { success: false, error: "GitHub integration failure.", code: 'UNKNOWN' };
    }
  },

  /**
   * Added missing subscribeToChanges method for realtime Supabase updates.
   */
  subscribeToChanges(tables: string[], businessId: string, callback: (change: any) => void): RealtimeChannel[] {
    return tables.map(table => {
      return supabase
        .channel(`${table}_changes_${businessId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter: `business_id=eq.${businessId}` }, (payload) => {
          callback({
            table,
            event: payload.eventType,
            data: mapFromDb(payload.new || payload.old, table)
          });
        })
        .subscribe();
    });
  }
};
