
// IndexedDB Wrapper for handling large datasets (Images, Products) that exceed LocalStorage quotas.
const DB_NAME = 'AutoMate_v3_DB';
const DB_VERSION = 3; // Version 3 adds indices
const STORES = ['products', 'transactions', 'users', 'suppliers', 'offline_queue'];

export const dbService = {
  // Initialize Database
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported in this environment"));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as any).error);
        reject((event.target as any).error);
      };

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        STORES.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            
            // Create Indices for faster local querying
            if (storeName !== 'offline_queue') {
              store.createIndex('business_id', 'businessId', { unique: false });
            }
            if (storeName === 'transactions') {
              store.createIndex('date', 'date', { unique: false });
            }
          } else {
             // Upgrade existing stores if needed
             const store = (event.target as IDBOpenDBRequest).transaction?.objectStore(storeName);
             if (store && storeName !== 'offline_queue' && !store.indexNames.contains('business_id')) {
                store.createIndex('business_id', 'businessId', { unique: false });
             }
          }
        });
      };
    });
  },

  // Generic Get All
  getAll: async <T>(storeName: string): Promise<T[]> => {
    try {
      const db = await dbService.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`[LocalDB] Failed to load ${storeName}`, e);
      return [];
    }
  },

  // Get by ID
  getById: async <T>(storeName: string, id: string): Promise<T | undefined> => {
    try {
      const db = await dbService.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return undefined;
    }
  },

  // Generic Save (Bulk)
  saveItems: async (storeName: string, items: any[]) => {
    if (!items.length) return;
    try {
      const db = await dbService.open();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        items.forEach(item => store.put(item));
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error(`[LocalDB] Failed to save ${storeName}`, e);
      throw e;
    }
  },

  // Delete Item
  deleteItem: async (storeName: string, id: string) => {
    try {
      const db = await dbService.open();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error(`[LocalDB] Failed to delete from ${storeName}`, e);
      throw e;
    }
  },

  // Clear specific store
  clearStore: async (storeName: string) => {
    const db = await dbService.open();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
  }
};
