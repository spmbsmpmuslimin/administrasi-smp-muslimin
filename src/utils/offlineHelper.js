// offlineHelper.js - ALL-IN-ONE OFFLINE SOLUTION
// ================================================================
// Copy file ini ke src/utils/offlineHelper.js
// Semua offline functionality dalam 1 file!
// ================================================================

// ========== INDEXEDDB SETUP ==========
const DB_NAME = "AttendanceDB";
const DB_VERSION = 1;

class OfflineHelper {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.setupNetworkListeners();
  }

  // ✅ Setup network listeners
  setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.notifyListeners({ type: "online" });
      this.autoSync();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.notifyListeners({ type: "offline" });
    });
  }

  // ✅ Subscribe to network changes
  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach((cb) => cb(event));
  }

  // ✅ Initialize IndexedDB
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log("✅ Offline DB ready");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Cache store untuk data
        if (!db.objectStoreNames.contains("cache")) {
          const cacheStore = db.createObjectStore("cache", { keyPath: "key" });
          cacheStore.createIndex("type", "type", { unique: false });
        }

        // Pending store untuk data yang belum sync
        if (!db.objectStoreNames.contains("pending")) {
          const pendingStore = db.createObjectStore("pending", {
            keyPath: "id",
            autoIncrement: true,
          });
          pendingStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  // ========== CACHE OPERATIONS ==========

  async cacheData(key, data, type = "generic") {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["cache"], "readwrite");
      const store = transaction.objectStore("cache");

      const request = store.put({
        key,
        type,
        data,
        cached_at: new Date().toISOString(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["cache"], "readonly");
      const store = transaction.objectStore("cache");
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ========== PENDING SYNC OPERATIONS ==========

  async addPending(data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["pending"], "readwrite");
      const store = transaction.objectStore("pending");

      const request = store.add({
        ...data,
        timestamp: new Date().toISOString(),
        status: "pending",
      });

      request.onsuccess = () => {
        console.log("💾 Added to sync queue");
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPending() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["pending"], "readonly");
      const store = transaction.objectStore("pending");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removePending(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["pending"], "readwrite");
      const store = transaction.objectStore("pending");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== SYNC OPERATIONS ==========

  async autoSync() {
    if (!this.isOnline) return;

    const pending = await this.getPending();
    if (pending.length === 0) return;

    console.log(`🔄 Syncing ${pending.length} items...`);

    for (const item of pending) {
      try {
        if (item.action === "save_attendance" && item.syncFn) {
          await item.syncFn(item.data);
          await this.removePending(item.id);
          console.log("✅ Synced item:", item.id);
        }
      } catch (error) {
        console.error("❌ Sync failed:", error);
      }
    }

    this.notifyListeners({ type: "sync_complete" });
  }

  // ========== HELPER METHODS ==========

  async getPendingCount() {
    const pending = await this.getPending();
    return pending.length;
  }

  async clearAll() {
    if (!this.db) await this.init();

    const stores = ["cache", "pending"];
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      await store.clear();
    }
    console.log("🧹 All offline data cleared");
  }
}

// Export singleton
const offlineHelper = new OfflineHelper();
export default offlineHelper;
