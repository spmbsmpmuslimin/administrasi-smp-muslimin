// src/utils/escapeHtml.js
// Utility kecil buat escape karakter HTML sebelum data (biasanya dari
// Supabase / input user) di-taro langsung ke dalam template literal HTML
// yang nantinya di-set jadi innerHTML atau diproses html2pdf/html2canvas.
//
// KENAPA PERLU INI:
// Kalau field kayak nama, alamat, dll di-inject mentah-mentah ke HTML
// string (`<td>${student.alamat}</td>`), dan kebetulan isi field itu ada
// karakter HTML (misal ada tag <script> atau <img onerror=...> yang
// kesenggol pas copy-paste data dari sumber lain), itu bisa ke-eksekusi
// pas HTML-nya dirender ke DOM (innerHTML) atau dip-parse html2pdf.
// Ini pola stored XSS klasik. Escape dulu = aman, karena karakter
// berbahaya (< > & " ') diubah jadi entity HTML biasa, jadi cuma keliatan
// sebagai teks, bukan dieksekusi sebagai tag/atribut.
//
// Cara pakai (contoh di StudentList.js -- formulir PDF pendaftaran):
//   import { escapeHtml } from "../utils/escapeHtml";
//   const formHTML = `<td>${escapeHtml(student.nama_lengkap)}</td>`;
//
// CATATAN: Ini BUKAN buat sanitasi HTML yang emang sengaja diinput
// (misal dari rich text editor) -- itu beda kasus, butuh library kayak
// DOMPurify yang bisa whitelist tag tertentu. escapeHtml ini khusus buat
// data yang SEHARUSNYA plain text (nama, alamat, no HP, dll), bukan HTML.

/**
 * Escape karakter spesial HTML dalam sebuah string, biar aman
 * di-taro di dalam template literal HTML tanpa risiko HTML/script
 * ikut ke-eksekusi.
 *
 * @param {string|number|null|undefined} value - nilai yang mau di-escape.
 *   Non-string (number, null, undefined) otomatis di-convert ke string
 *   kosong atau string angka, biar aman dipanggil langsung ke field
 *   apapun tanpa perlu cek tipe dulu di tempat pemanggilan.
 * @returns {string} versi aman buat disisipkan ke HTML
 *
 * @example
 * escapeHtml('<script>alert(1)</script>') // "&lt;script&gt;alert(1)&lt;/script&gt;"
 * escapeHtml('Budi & Ani')                // "Budi &amp; Ani"
 * escapeHtml(null)                        // ""
 * escapeHtml(undefined)                   // ""
 * escapeHtml(123)                         // "123"
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";

  const str = String(value);

  return str
    .replace(/&/g, "&amp;") // HARUS PALING PERTAMA, biar & hasil replace lain gak ke-escape lagi
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
