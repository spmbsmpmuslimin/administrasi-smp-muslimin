// utils/studentSession.js
//
// Kenapa file ini ada:
// Beberapa browser (terutama Firefox mode Strict/Private, dan beberapa
// browser HP) bisa memblokir atau gak nge-persist localStorage, terutama
// kalau situs diakses lewat HTTP + IP lokal (bukan HTTPS + domain asli).
// Kalau itu kejadian, localStorage.setItem() bisa diem-diem gagal atau
// datanya ilang abis reload, tanpa error yang keliatan jelas ke user.
//
// Solusinya: setiap nyimpen/baca sesi siswa, kita SELALU coba localStorage
// DAN cookie sekaligus. Kalau salah satu gagal, yang lain jadi fallback.
// Semua fungsi juga dibungkus try/catch + console.error, biar kalau nanti
// masih ada masalah, gampang ketauan dari console.

const SESSION_KEY = "student_session";
const COOKIE_MAX_AGE_DAYS = 7;

function setCookie(name, value, days) {
  try {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(
      value,
    )}; path=/; max-age=${maxAge}; SameSite=Lax`;
    return true;
  } catch (err) {
    console.error("[studentSession] Gagal set cookie:", err);
    return false;
  }
}

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch (err) {
    console.error("[studentSession] Gagal baca cookie:", err);
    return null;
  }
}

function deleteCookie(name) {
  try {
    document.cookie = `${name}=; path=/; max-age=0`;
  } catch (err) {
    console.error("[studentSession] Gagal hapus cookie:", err);
  }
}

/**
 * Simpan sesi siswa. Return true kalau minimal salah satu (localStorage
 * atau cookie) berhasil kesimpen. Return false kalau dua-duanya gagal
 * total (browser super ketat/diblokir semua) — di sini baru worth
 * ditampilin error ke user.
 */
export function saveStudentSession(data) {
  const json = JSON.stringify(data);
  let localOk = false;

  try {
    localStorage.setItem(SESSION_KEY, json);
    localOk = true;
  } catch (err) {
    console.error(
      "[studentSession] localStorage.setItem gagal (kemungkinan diblokir browser):",
      err,
    );
  }

  const cookieOk = setCookie(SESSION_KEY, json, COOKIE_MAX_AGE_DAYS);

  if (!localOk && !cookieOk) {
    console.error(
      "[studentSession] GAGAL TOTAL simpan sesi — localStorage & cookie sama-sama diblokir browser ini.",
    );
  }

  return localOk || cookieOk;
}

/**
 * Baca sesi siswa. Coba localStorage dulu, kalau kosong/gagal baru
 * fallback ke cookie. Return object session, atau null kalau gak ada
 * sama sekali / datanya corrupt.
 */
export function getStudentSession() {
  let raw = null;

  try {
    raw = localStorage.getItem(SESSION_KEY);
  } catch (err) {
    console.error("[studentSession] localStorage.getItem gagal:", err);
  }

  if (!raw) {
    raw = getCookie(SESSION_KEY);
  }

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("[studentSession] Gagal parse session, data corrupt:", err);
    clearStudentSession();
    return null;
  }
}

/** Hapus sesi siswa dari localStorage DAN cookie. */
export function clearStudentSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error("[studentSession] localStorage.removeItem gagal:", err);
  }
  deleteCookie(SESSION_KEY);
}
