
// IndexedDB Wrapper for handling large datasets (Images, Products) that exceed LocalStorage quotas.
const DB_NAME = 'AutoMate_v3_DB';
const DB_VERSION = 2; // Incremented version for schema update
const STORES = ['products', 'transactions', 'users', 'suppliers', 'offline_queue'];

export const dbService = {
  // Initialize Database
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        STORES.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            // Create stores with 'id' as the keyPath
            // For offline_queue, we might want autoIncrement if we don't have IDs, 
            // but we'll use a generated UUID for queue items.
            db.createObjectStore(storeName, { keyPath: 'id' });
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

  // Generic Save (Bulk)
  saveItems: async (storeName: string, items: any[]) => {
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
    }
  },

  // Clear specific store
  clearStore: async (storeName: string) => {
    const db = await dbService.open();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
  }
};
