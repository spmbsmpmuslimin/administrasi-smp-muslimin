// offlineHelper.js - ALL-IN-ONE OFFLINE SOLUTION (v2 - dengan retry mechanism)
// ================================================================
// Copy file ini ke src/utils/offlineHelper.js
// Semua offline functionality dalam 1 file!
//
// ✅ CHANGELOG v2:
// - Retry mechanism dengan batas maksimal percobaan (biar ga infinite retry diem-diem)
// - Item yang gagal terus-menerus ditandai 'failed' + bisa di-retry manual dari UI
// - Periodic fallback sync (jaga-jaga kalau event 'online' browser ga ke-trigger,
//   ini emang kadang kejadian di beberapa browser mobile)
// - notifyListeners bawa payload lebih detail (jumlah pending, failed, dsb)
// ================================================================

const DB_NAME = "AttendanceDB";
const DB_VERSION = 1;
const MAX_RETRY = 5; // ✅ Batas maksimal percobaan sync per item
const PERIODIC_SYNC_INTERVAL = 30000; // ✅ Cek ulang tiap 30 detik sebagai fallback

class OfflineHelper {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.isSyncing = false; // ✅ Cegah autoSync jalan bareng-bareng (race condition)
    this.syncHandlers = {}; // ✅ BARU: registry function sync per "action", disimpen di memory (BUKAN di IndexedDB)
    this.setupNetworkListeners();
    this.setupPeriodicSync();
  }

  // ✅ BARU: Daftarkan function sync untuk suatu "action".
  // Panggil ini sekali aja waktu component mount (misal di useEffect Attendance.js),
  // supaya autoSync tau harus jalanin apa buat tiap action tanpa nyimpen function ke DB.
  registerSyncHandler(action, fn) {
    this.syncHandlers[action] = fn;
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

  // ✅ BARU: Periodic fallback sync
  // Event 'online' browser kadang ga fire (terutama di beberapa browser mobile
  // atau kalau koneksi flaky/naik-turun). Ini jaring pengaman tambahan.
  setupPeriodicSync() {
    setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.autoSync();
      }
    }, PERIODIC_SYNC_INTERVAL);
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
          pendingStore.createIndex("status", "status", { unique: false }); // ✅ BARU
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

    // ✅ FIX DataCloneError: IndexedDB cuma bisa nyimpen data plain (structured clone).
    // Kalau ada field function (misal syncFn) ke-selip, buang dulu di sini —
    // function harusnya didaftarkan lewat registerSyncHandler(), bukan disimpen ke DB.
    const { syncFn, ...cleanData } = data;
    if (syncFn) {
      console.warn(
        "⚠️ syncFn dibuang sebelum disimpen ke IndexedDB (tidak bisa di-clone). " +
          "Pastikan sudah didaftarkan lewat offlineHelper.registerSyncHandler('" +
          data.action +
          "', fn) sebelum addPending dipanggil."
      );
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["pending"], "readwrite");
      const store = transaction.objectStore("pending");

      const request = store.add({
        ...cleanData,
        timestamp: new Date().toISOString(),
        status: "pending",
        retryCount: 0, // ✅ BARU: hitungan percobaan sync
        lastError: null, // ✅ BARU: simpan pesan error terakhir
      });

      request.onsuccess = () => {
        console.log("💾 Added to sync queue");
        resolve(request.result);
        // Coba sync langsung kalau kebetulan lagi online
        if (this.isOnline) this.autoSync();
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

  // ✅ BARU: Update satu item pending (dipakai buat naikin retryCount / ubah status)
  async updatePendingItem(id, updates) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["pending"], "readwrite");
      const store = transaction.objectStore("pending");
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (!item) {
          resolve(null);
          return;
        }
        const updatedItem = { ...item, ...updates };
        const putRequest = store.put(updatedItem);
        putRequest.onsuccess = () => resolve(updatedItem);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ========== SYNC OPERATIONS ==========

  async autoSync() {
    if (!this.isOnline) return;
    if (this.isSyncing) {
      console.log("⏸️ Sync sudah jalan, skip...");
      return;
    }

    const allPending = await this.getPending();
    // ✅ Cuma proses yang statusnya 'pending' (bukan yang udah 'failed' permanen)
    const toSync = allPending.filter((item) => item.status === "pending");

    if (toSync.length === 0) return;

    this.isSyncing = true;
    console.log(`🔄 Syncing ${toSync.length} items...`);

    let successCount = 0;
    let failedCount = 0;

    for (const item of toSync) {
      try {
        const handler = this.syncHandlers[item.action];
        if (handler) {
          await handler(item.data);
          await this.removePending(item.id);
          successCount++;
          console.log("✅ Synced item:", item.id);
        } else {
          // ✅ Belum ada handler terdaftar buat action ini (misal: app baru
          // di-reload dan Attendance.js belum sempat registerSyncHandler lagi).
          // Skip dulu, jangan dihapus/ditandai failed — coba lagi di sync berikutnya.
          console.warn(`⏭️ Belum ada syncHandler untuk action "${item.action}", skip sementara`);
        }
      } catch (error) {
        const newRetryCount = (item.retryCount || 0) + 1;
        console.error(`❌ Sync failed for item ${item.id} (percobaan ke-${newRetryCount}):`, error);

        if (newRetryCount >= MAX_RETRY) {
          // ✅ Udah nyampe batas max retry -> tandai failed permanen, JANGAN diulang otomatis lagi
          await this.updatePendingItem(item.id, {
            status: "failed",
            retryCount: newRetryCount,
            lastError: error?.message || "Unknown error",
          });
          failedCount++;
          this.notifyListeners({
            type: "sync_item_failed_permanent",
            itemId: item.id,
            error: error?.message,
          });
        } else {
          // Masih boleh dicoba lagi nanti
          await this.updatePendingItem(item.id, {
            retryCount: newRetryCount,
            lastError: error?.message || "Unknown error",
          });
        }
      }
    }

    this.isSyncing = false;

    const remaining = await this.getPendingCount();
    const failed = await this.getFailedCount();

    this.notifyListeners({
      type: "sync_complete",
      successCount,
      failedCount,
      remainingPending: remaining,
      totalFailed: failed,
    });
  }

  // ✅ BARU: Retry manual satu item yang udah 'failed' (reset retryCount-nya)
  async retryItem(id) {
    await this.updatePendingItem(id, { status: "pending", retryCount: 0, lastError: null });
    if (this.isOnline) await this.autoSync();
  }

  // ✅ BARU: Retry manual SEMUA item yang 'failed' sekaligus
  async retryAllFailed() {
    const allPending = await this.getPending();
    const failedItems = allPending.filter((item) => item.status === "failed");

    for (const item of failedItems) {
      await this.updatePendingItem(item.id, { status: "pending", retryCount: 0, lastError: null });
    }

    if (this.isOnline) await this.autoSync();
    return failedItems.length;
  }

  // ========== HELPER METHODS ==========

  async getPendingCount() {
    const pending = await this.getPending();
    // ✅ Cuma yang bener-bener masih 'pending' (nunggu sync), bukan yang udah 'failed'
    return pending.filter((item) => item.status === "pending").length;
  }

  // ✅ BARU: Hitung item yang gagal permanen (butuh perhatian guru/admin)
  async getFailedCount() {
    const pending = await this.getPending();
    return pending.filter((item) => item.status === "failed").length;
  }

  // ✅ BARU: Ambil detail semua item yang failed (buat ditampilin di UI kalau perlu)
  async getFailedItems() {
    const pending = await this.getPending();
    return pending.filter((item) => item.status === "failed");
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
