// setting/kelola-ujian/exportSemuaKelolaUjian.js
// Orkestrasi fitur "Export Semua (PDF)" -- tombol di JenisUjianMenuTab.js
// yang bikin admin bisa centang beberapa/semua dokumen PDF dari seluruh
// sub-fitur Manajemen Ujian, lalu di-download sekaligus dalam satu aksi.
//
// PRINSIP UTAMA: setiap item di sini SELALU query ulang dari database
// (bukan reuse state layar tab lain), supaya hasilnya konsisten nggak
// peduli tab mana yang lagi/pernah dibuka. Satu pengecualian yang perlu
// dicatat: "Daftar Peserta & Ruangan" sumbernya ambilPembagianTersimpan()
// (tabel peserta_ujian) -- ini SUDAH DISIMPAN, jadi kalau admin baru ubah
// quota manual di Pembagian Ruangan tapi BELUM klik "Simpan ke Database",
// perubahan itu TIDAK ikut kepakai di sini (ini disengaja/dikonfirmasi,
// beda dengan tombol export di dalam tab Pembagian Ruangan sendiri yang
// mengikuti state layar).
//
// Item yang datanya "banyak baris" (Kartu Peserta per ruangan, Daftar
// Hadir & Berita Acara per sesi) akan menghasilkan LEBIH DARI SATU file
// PDF -- itu normal, bukan bug. Ada jeda kecil (tundaMs) di antara setiap
// doc.save() supaya browser nggak nge-block "multiple downloads".

import {
  cariUjian,
  ambilPembagianTersimpan,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagian-ruangan/pembagianRuanganSupabase";
import { ambilRuanganUjian, ambilJadwalSesi } from "./jadwal-pengawas/jadwalPengawasSupabase";
import {
  ambilPesertaRuangan,
  ambilJadwalPengawasPerGuru,
  ambilMetadataKepsek,
} from "./dokumen-cetak/kartuUjianSupabase";
import {
  ambilRekapPeserta,
  ambilRekapPengawas,
  ambilRekapAnggaran,
  ambilKehadiran,
  ambilCatatanLaporan,
} from "./dokumen-cetak/laporanRekapAkhirSupabase";
import { exportDaftarPesertaUjianPdf } from "./pembagian-ruangan/daftarPesertaPdfExport";
import { generateKartuPesertaPdf, generateKartuPengawasPdf } from "./dokumen-cetak/kartuUjianPdf";
import {
  generateDaftarHadirPdf,
  generateBeritaAcaraPdf,
} from "./dokumen-cetak/presensiBeritaAcaraPdf";
import { generateLaporanLengkapPdf } from "./laporan-lengkap/laporanLengkapPdf";
import { ambilProfilSekolah } from "./laporan-lengkap/laporanLengkapSupabase";
import { generatePetunjukPenggunaanPdf } from "./petunjuk-penggunaan/petunjukPenggunaanPdf";

// Daftar & urutan item yang muncul di checklist "Export Semua". Urutan di
// sini SENGAJA dipakai juga sebagai urutan eksekusi (dari atas ke bawah),
// biar file yang lebih "penting"/ringan duluan (Daftar Peserta) keluar
// lebih dulu daripada yang berpotensi banyak file (Kartu Peserta, Daftar
// Hadir, Berita Acara).
export const OPSI_EXPORT_SEMUA = [
  {
    id: "daftar-peserta",
    label: "Daftar Peserta & Ruangan",
    deskripsi: "1 file PDF, dari data pembagian ruangan yang sudah tersimpan",
  },
  {
    id: "kartu-peserta",
    label: "Kartu Peserta Ujian",
    deskripsi: "1 file PDF per ruangan",
  },
  {
    id: "kartu-pengawas",
    label: "Kartu Pengawas",
    deskripsi: "1 file PDF, semua guru yang bertugas",
  },
  {
    id: "daftar-hadir",
    label: "Daftar Hadir",
    deskripsi: "1 file PDF per sesi ujian",
  },
  {
    id: "berita-acara",
    label: "Berita Acara",
    deskripsi: "1 file PDF per sesi ujian",
  },
  {
    id: "laporan-rekap",
    label: "Laporan Lengkap",
    deskripsi: "1 file PDF, Sampul-Kata Pengantar-Daftar Isi-Pendahuluan-rekap-Penutup",
  },
  {
    id: "petunjuk",
    label: "Petunjuk & Penggunaan Aplikasi",
    deskripsi: "1 file PDF, panduan statis",
  },
];

function tunda(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cari record `ujian` untuk jenis + tahun ajaran terpilih. Dipakai duluan
 * sebelum buka panel checklist, supaya kalau ujiannya belum pernah
 * diproses sama sekali (belum ada record `ujian`), admin langsung dikasih
 * tahu -- bukan malah nyoba export satu-satu dan gagal semua.
 */
export async function cariUjianUntukExport(supabase, jenisUjian, academicYearId) {
  return cariUjian(supabase, jenisUjian, academicYearId);
}

/**
 * Jalankan export untuk satu item checklist. Melempar Error kalau
 * datanya kosong/belum ada -- biar pemanggil (jalankanExportSemua) yang
 * mutusin mau skip & lanjut ke item berikutnya atau berhenti.
 *
 * @param {Object} ctx
 * @param {import("@supabase/supabase-js").SupabaseClient} ctx.supabase
 * @param {string} ctx.itemId - salah satu id di OPSI_EXPORT_SEMUA
 * @param {string} ctx.jenisUjian
 * @param {string} ctx.ujianId
 * @param {string} ctx.tahunAjaran - label, mis. "2026/2027"
 * @returns {Promise<number>} jumlah file PDF yang berhasil di-download
 */
async function jalankanSatuItem({ supabase, itemId, jenisUjian, ujianId, tahunAjaran }) {
  switch (itemId) {
    case "daftar-peserta": {
      const semuaRuangan = await ambilPembagianTersimpan(supabase, ujianId);
      if (semuaRuangan.length === 0) {
        throw new Error(
          "Belum ada data pembagian ruangan yang tersimpan (proses & simpan dulu di Pembagian Ruangan)"
        );
      }
      await exportDaftarPesertaUjianPdf({ semuaRuangan, jenisUjian, tahunAjaran });
      return 1;
    }

    case "kartu-peserta": {
      const daftarRuangan = await ambilRuanganUjian(supabase, ujianId);
      if (daftarRuangan.length === 0) {
        throw new Error("Belum ada ruangan (proses & simpan dulu di Pembagian Ruangan)");
      }
      const kepsek = await ambilMetadataKepsek(supabase);
      let jumlahFile = 0;
      for (const r of daftarRuangan) {
        const daftarPeserta = await ambilPesertaRuangan(supabase, ujianId, r.nomor_ruangan);
        if (daftarPeserta.length === 0) continue;
        generateKartuPesertaPdf({
          daftarPeserta,
          jenisUjian,
          tahunAjaran,
          nomorRuangan: r.nomor_ruangan,
          kepsek,
        });
        jumlahFile += 1;
        await tunda(250);
      }
      if (jumlahFile === 0) throw new Error("Belum ada peserta di ruangan manapun");
      return jumlahFile;
    }

    case "kartu-pengawas": {
      const daftarGuruJadwal = await ambilJadwalPengawasPerGuru(supabase, ujianId);
      if (daftarGuruJadwal.length === 0) {
        throw new Error("Belum ada guru yang bertugas mengawas");
      }
      const kepsek = await ambilMetadataKepsek(supabase);
      generateKartuPengawasPdf({ daftarGuruJadwal, jenisUjian, tahunAjaran, kepsek });
      return 1;
    }

    case "daftar-hadir":
    case "berita-acara": {
      const [daftarJadwal, daftarRuangan] = await Promise.all([
        ambilJadwalSesi(supabase, ujianId),
        ambilRuanganUjian(supabase, ujianId),
      ]);
      if (daftarJadwal.length === 0) throw new Error("Belum ada jadwal sesi ujian");
      if (daftarRuangan.length === 0) {
        throw new Error("Belum ada ruangan (proses & simpan dulu di Pembagian Ruangan)");
      }

      // Data peserta per ruangan SAMA untuk semua sesi (nggak berubah per
      // jadwal), jadi cukup diambil sekali lalu dipakai ulang tiap sesi --
      // hemat query dibanding ambil ulang per (sesi x ruangan).
      const daftarRuanganData = [];
      for (const r of daftarRuangan) {
        const daftarPeserta = await ambilPesertaRuangan(supabase, ujianId, r.nomor_ruangan);
        daftarRuanganData.push({ nomor_ruangan: r.nomor_ruangan, daftarPeserta });
      }

      const generator = itemId === "daftar-hadir" ? generateDaftarHadirPdf : generateBeritaAcaraPdf;
      let jumlahFile = 0;
      for (const jadwal of daftarJadwal) {
        generator({ daftarRuanganData, jadwal, jenisUjian, tahunAjaran });
        jumlahFile += 1;
        await tunda(250);
      }
      return jumlahFile;
    }

    case "laporan-rekap": {
      const [
        profilSekolah,
        rekapPeserta,
        rekapPengawas,
        rekapAnggaran,
        kehadiran,
        catatanTersimpan,
      ] = await Promise.all([
        ambilProfilSekolah(supabase),
        ambilRekapPeserta(supabase, ujianId),
        ambilRekapPengawas(supabase, ujianId),
        ambilRekapAnggaran(supabase, ujianId),
        ambilKehadiran(supabase, ujianId),
        ambilCatatanLaporan(supabase, ujianId),
      ]);
      generateLaporanLengkapPdf({
        jenisUjian,
        tahunAjaran,
        profilSekolah,
        rekapPeserta,
        kehadiran,
        rekapPengawas,
        rekapAnggaran,
        catatan: {
          keterangan_nilai: catatanTersimpan?.keterangan_nilai || "",
          evaluasi_kendala: catatanTersimpan?.evaluasi_kendala || "",
          kesimpulan_saran: catatanTersimpan?.kesimpulan_saran || "",
        },
      });
      return 1;
    }

    case "petunjuk": {
      generatePetunjukPenggunaanPdf({});
      return 1;
    }

    default:
      throw new Error(`Item export tidak dikenal: ${itemId}`);
  }
}

/**
 * Jalankan export untuk semua item yang dicentang, satu per satu
 * (berurutan, BUKAN paralel -- supaya download-nya nggak numpuk semua di
 * saat bersamaan). Item yang gagal (mis. datanya belum ada) di-skip dan
 * lanjut ke item berikutnya, BUKAN menghentikan seluruh proses.
 *
 * @param {Object} params
 * @param {import("@supabase/supabase-js").SupabaseClient} params.supabase
 * @param {string} params.jenisUjian
 * @param {string} params.ujianId
 * @param {string} params.tahunAjaran
 * @param {string[]} params.itemIdTerpilih - subset id dari OPSI_EXPORT_SEMUA
 * @param {(itemId: string, status: "loading"|"done"|"error", info?: string) => void} [params.onProgress]
 * @returns {Promise<{berhasil: string[], gagal: {id: string, pesan: string}[], totalFile: number}>}
 */
export async function jalankanExportSemua({
  supabase,
  jenisUjian,
  ujianId,
  tahunAjaran,
  itemIdTerpilih,
  onProgress,
}) {
  const urutan = OPSI_EXPORT_SEMUA.map((o) => o.id).filter((id) => itemIdTerpilih.includes(id));

  const hasil = { berhasil: [], gagal: [], totalFile: 0 };

  for (const itemId of urutan) {
    onProgress?.(itemId, "loading");
    try {
      const jumlahFile = await jalankanSatuItem({
        supabase,
        itemId,
        jenisUjian,
        ujianId,
        tahunAjaran,
      });
      hasil.berhasil.push(itemId);
      hasil.totalFile += jumlahFile;
      onProgress?.(itemId, "done", `${jumlahFile} file`);
    } catch (err) {
      hasil.gagal.push({ id: itemId, pesan: err.message });
      onProgress?.(itemId, "error", err.message);
    }
    await tunda(300);
  }

  return hasil;
}

export { KONFIGURASI_JENIS_UJIAN };
