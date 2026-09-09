// system/debugLog.js
// Util logging buat checker & monitoring dashboard -- console.log/warn
// dari sini CUMA muncul kalau debug mode dinyalain, biar console browser
// guru/staf yang make Monitor Sistem sehari-hari gak numpuk log internal
// yang gak ada gunanya buat mereka.
//
// Cara nyalain/matiin dari browser console (persist lewat reload lewat
// localStorage, GAK perlu rebuild/deploy ulang):
//   window.__setMonitorDebug(true)    -> nyalain, refresh halaman
//   window.__setMonitorDebug(false)   -> matiin lagi (ini default-nya)
//
// PENTING: console.error TETEP selalu tampil apa adanya (gak lewat util
// ini sama sekali) -- error beneran harus selalu kelihatan di production,
// jangan sampe ke-gate di balik flag debug juga.

const DEBUG_KEY = "monitor_sistem_debug";

export function isDebugEnabled() {
  try {
    return localStorage.getItem(DEBUG_KEY) === "true";
  } catch {
    // localStorage bisa gak available (mode private/incognito ketat, SSR,
    // dll) -- default-nya anggep debug OFF, jangan sampe malah nge-crash.
    return false;
  }
}

export function debugLog(...args) {
  if (isDebugEnabled()) {
    console.log(...args);
  }
}

export function debugWarn(...args) {
  if (isDebugEnabled()) {
    console.warn(...args);
  }
}

// Expose toggle ke window biar gampang dipanggil dari DevTools console
// kapan aja butuh debug, tanpa perlu edit kode atau rebuild sama sekali.
if (typeof window !== "undefined") {
  window.__setMonitorDebug = (enabled) => {
    try {
      localStorage.setItem(DEBUG_KEY, enabled ? "true" : "false");
      // eslint-disable-next-line no-console
      console.log(
        `[Monitor Sistem] Debug logging ${enabled ? "ON" : "OFF"} — refresh halaman biar kerasa efeknya di semua komponen.`
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Monitor Sistem] Gagal set debug flag:", e);
    }
  };
}
