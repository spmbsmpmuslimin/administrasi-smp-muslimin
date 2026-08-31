// utils/deviceInfo.js
//
// Kenapa file ini ada:
// Browser JS TIDAK PUNYA akses langsung ke merek/model HP asli (beda
// sama aplikasi native yang bisa baca Build.MANUFACTURER / Build.MODEL
// di Android, atau UIDevice di iOS). Yang bisa kita lakuin cuma "nebak"
// dari signal yang browser kasih:
//
// 1. User-Agent Client Hints (navigator.userAgentData) — cuma didukung
//    Chrome/Edge/Opera (Chromium) di Android & desktop, DAN cuma jalan
//    di HTTPS. Ini kasih model HP asli (misal "LM-V600") tapi TIDAK
//    kasih nama brand (Samsung/LG/dst) — brand-nya harus kita tebak
//    sendiri dari kode model (lihat MODEL_BRAND_PREFIXES).
// 2. Kalau Client Hints gak ada (Safari, Firefox, browser Android non-
//    Chromium, atau situs masih HTTP), fallback total ke parsing
//    User-Agent string biasa -> cuma dapet nama OS + nama browser,
//    BUKAN brand/model device asli.
//
// PENTING: di iPhone/iPad, SEMUA browser (termasuk Chrome for iOS)
// akan SELALU jatuh ke opsi 2, karena Apple sengaja gak nyediain Client
// Hints model di WebKit demi privasi. Jadi utk device Apple, hasilnya
// bakal "Apple" / "iOS" — bukan "iPhone X" spesifik kayak di app native.

const MODEL_BRAND_PREFIXES = [
  [/^SM-/i, "Samsung"],
  [/^LM-|^LG-/i, "LGE"],
  [/^Redmi|^Mi \d|^M20|^POCO/i, "Xiaomi"],
  [/^CPH/i, "OPPO"],
  [/^V\d{4}/i, "vivo"],
  [/^ASUS/i, "Asus"],
  [/^ONEPLUS|^GM\d/i, "OnePlus"],
  [/^Pixel/i, "Google"],
  [/^RMX/i, "Realme"],
  [/^Infinix/i, "Infinix"],
  [/^TECNO/i, "Tecno"],
  [/^HUAWEI|^ALP-|^ANE-/i, "Huawei"],
];

function guessBrandFromModel(model) {
  if (!model) return null;
  for (const [regex, brand] of MODEL_BRAND_PREFIXES) {
    if (regex.test(model)) return brand;
  }
  return null;
}

function parseUserAgentFallback() {
  const ua = navigator.userAgent || "";

  let platform = "Unknown";
  if (/iPhone|iPad|iPod/i.test(ua)) platform = "iOS";
  else if (/Android/i.test(ua)) platform = "Android";
  else if (/Mac OS X/i.test(ua)) platform = "macOS";
  else if (/Windows/i.test(ua)) platform = "Windows";
  else if (/Linux/i.test(ua)) platform = "Linux";

  let browser = "Browser";
  if (/EdgA|Edge|Edg\//i.test(ua)) browser = "Edge";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/CriOS/i.test(ua)) browser = "Chrome (iOS)";
  else if (/FxiOS/i.test(ua)) browser = "Firefox (iOS)";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  const brand = platform === "iOS" ? "Apple" : platform;

  return { brand, model: browser, platform, browser };
}

/**
 * Deteksi info device sebaik mungkin. Selalu return object dengan
 * bentuk yang sama ({ brand, model, platform, browser }), tapi isinya
 * bisa "kasar" tergantung browser/OS (lihat catatan di atas file ini).
 */
export async function detectDeviceInfo() {
  try {
    if (
      navigator.userAgentData &&
      navigator.userAgentData.getHighEntropyValues
    ) {
      const high = await navigator.userAgentData.getHighEntropyValues([
        "model",
        "platform",
        "platformVersion",
      ]);

      const platform =
        high.platform || navigator.userAgentData.platform || "Unknown";
      const model = high.model || "";

      if (model) {
        // Ada model asli (biasanya Android + Chromium) -> tebak brand-nya
        const brand = guessBrandFromModel(model) || platform;
        return { brand, model, platform, browser: null };
      }

      // Client Hints ada tapi model kosong (biasa kejadian di desktop)
      const fallback = parseUserAgentFallback();
      return { ...fallback, platform, brand: fallback.brand };
    }
  } catch (err) {
    console.error(
      "[deviceInfo] Client Hints gagal, fallback ke User-Agent:",
      err,
    );
  }

  return parseUserAgentFallback();
}

const DEVICE_ID_KEY = "student_device_id";
const DEVICE_ID_COOKIE_MAX_AGE_DAYS = 3650; // ~10 tahun, biar device "diinget" lama

function setCookie(name, value, days) {
  try {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(
      value,
    )}; path=/; max-age=${maxAge}; SameSite=Lax`;
    return true;
  } catch (err) {
    console.error("[deviceInfo] Gagal set cookie:", err);
    return false;
  }
}

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch (err) {
    console.error("[deviceInfo] Gagal baca cookie:", err);
    return null;
  }
}

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback super jarang kepake (browser sangat lama)
  return "dev-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

/**
 * ID unik per-device yang disimpen permanen (localStorage + cookie,
 * pola sama kayak studentSession.js) — dipakai buat nandain "ini device
 * yang mana" biar konsisten walau siswa logout/login berkali-kali di
 * HP yang sama. ID ini sengaja gak ikut kehapus pas clearStudentSession(),
 * karena dia nandain device-nya, bukan sesi login-nya.
 */
export function getOrCreateDeviceId() {
  let id = null;

  try {
    id = localStorage.getItem(DEVICE_ID_KEY);
  } catch (err) {
    console.error("[deviceInfo] localStorage.getItem gagal:", err);
  }

  if (!id) {
    id = getCookie(DEVICE_ID_KEY);
  }

  if (!id) {
    id = generateId();
  }

  try {
    localStorage.setItem(DEVICE_ID_KEY, id);
  } catch (err) {
    console.error("[deviceInfo] localStorage.setItem gagal:", err);
  }
  setCookie(DEVICE_ID_KEY, id, DEVICE_ID_COOKIE_MAX_AGE_DAYS);

  return id;
}
