// setting/kelola-ujian/laporan-lengkap/laporanLengkapSupabase.js
// Data layer untuk sub-fitur "Laporan Lengkap" -- kompilasi PDF utuh dari
// Cover, Kata Pengantar, Daftar Isi, Pendahuluan, sampai rekap (reuse dari
// "Laporan Rekap Akhir"), dan Penutup.
//
// SENGAJA TIPIS: fitur ini bukan sumber data baru, cuma nyusun ulang data
// yang udah ada di modul lain jadi 1 dokumen resmi. Jadi cuma ada 1 fungsi
// baru di sini -- ambilProfilSekolah() -- buat Cover & Kata Pengantar.
// Semua data lain (tahun ajaran, ujian, rekap peserta/pengawas/anggaran/
// kehadiran/catatan) di-import LANGSUNG dari data layer aslinya, BUKAN
// di-re-export ulang dari sini, biar gak ada 2 sumber kebenaran:
//   - ambilDaftarTahunAjaran, cariUjian, KONFIGURASI_JENIS_UJIAN
//       -> ../pembagian-ruangan/pembagianRuanganSupabase.js
//   - ambilRekapPeserta, ambilRekapPengawas, ambilRekapAnggaran,
//     ambilKehadiran, ambilCatatanLaporan
//       -> ../dokumen-cetak/laporanRekapAkhirSupabase.js
//
// Isi teks Cover/Kata Pengantar/Pendahuluan/Penutup MURNI TEMPLATE --
// disesuaikan otomatis dari jenis ujian & tahun ajaran (aktif), TIDAK ada
// input manual/tersimpan di DB buat bagian ini (beda dari "Laporan Rekap
// Akhir" yang punya field manual kayak Evaluasi & Kendala). Makanya
// generator teks templatenya ditaruh di laporanLengkapPdf.js langsung
// (di situ dipakainya), bukan di sini.

/**
 * Key yang dibutuhkan dari tabel school_settings (key-value) untuk
 * Cover & Kata Pengantar. Sumber yang sama dipakai fitur Kartu Ujian
 * (lihat ambilMetadataKepsek di dokumen-cetak/kartuUjianSupabase.js)
 * dan Setting > Profil Sekolah.
 */
const SCHOOL_SETTINGS_KEYS = [
  "school_name",
  "npsn",
  "school_address",
  "school_level",
  "school_email",
  "school_phone",
  "school_website",
  "school_logo",
  "principal_name",
];

/**
 * Ambil profil sekolah (nama, NPSN, alamat, kepala sekolah, logo, dst)
 * buat dipakai di Cover & Kata Pengantar laporan.
 *
 * Query 1x ambil semua key sekaligus (bukan 1 query per key), lalu
 * di-mapping ke object dengan key camelCase yang lebih enak dipakai di
 * PDF generator. Key yang gak ketemu di DB di-fallback "-" (JANGAN throw
 * error di sini -- laporan tetap harus bisa di-generate walau ada 1-2
 * setting yang belum keisi, cuma bagian itu aja yang tampil "-").
 *
 * @returns {Promise<{
 *   namaSekolah: string, npsn: string, alamat: string, jenjang: string,
 *   email: string, telepon: string, website: string, logo: string|null,
 *   namaKepalaSekolah: string
 * }>}
 */
async function ambilProfilSekolah(supabase) {
  const { data, error } = await supabase
    .from("school_settings")
    .select("setting_key, setting_value")
    .in("setting_key", SCHOOL_SETTINGS_KEYS);

  if (error) throw error;

  const peta = {};
  (data || []).forEach((row) => {
    peta[row.setting_key] = row.setting_value;
  });

  return {
    namaSekolah: peta.school_name || "-",
    npsn: peta.npsn || "-",
    alamat: peta.school_address || "-",
    jenjang: peta.school_level || "SMP",
    email: peta.school_email || "-",
    telepon: peta.school_phone || "-",
    website: peta.school_website || "-",
    logo: peta.school_logo || null, // data:image/... base64, atau null kalau belum diisi
    namaKepalaSekolah: peta.principal_name || "-",
  };
}

export { ambilProfilSekolah };
