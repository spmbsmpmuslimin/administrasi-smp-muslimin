// setting/kelola-ujian/laporanRekapAkhirSupabase.js
// Data layer untuk sub-fitur "Laporan Rekap Akhir" -- kumpulan rekap dari
// sub-fitur lain (Jadwal & Pembagian Ruangan, Peserta & Pengawas) plus 1
// tabel baru khusus laporan ini:
//
// rekap_kehadiran_ujian -- input manual TU/panitia setelah ujian selesai,
//   berdasarkan Daftar Hadir kertas yang sudah ditandatangani (lihat
//   PresensiBeritaAcaraTab.js -- itu presensi kertas, bukan digital,
//   makanya di sini baru direkap manual per ruangan, total utk seluruh
//   periode ujian).
//
// CATATAN (revisi): tabel "laporan_rekap_ujian" (dulu nyimpen catatan
// naratif singleton: keterangan nilai, evaluasi & kendala, kesimpulan &
// saran) SUDAH TIDAK DIPAKAI lagi dari sisi app -- fitur input-nya dicabut
// karena dianggap gak kepake. Fungsi ambilCatatanLaporan/simpanCatatanLaporan
// juga sudah dihapus dari file ini. Tabelnya sendiri belum di-drop dari DB
// (di luar cakupan revisi ini).
//
// Lihat migration: laporan-rekap-akhir_migration.sql

import { ambilPembagianTersimpan } from "../pembagian-ruangan/pembagianRuanganSupabase";
import { ambilJadwalSesi, ambilPengawasUntukJadwal } from "../jadwal-pengawas/jadwalPengawasSupabase";

/**
 * Rekap peserta & ruangan -- total siswa per ruangan + total keseluruhan.
 * Reuse data dari sub-fitur "Peserta & Pengawas".
 */
async function ambilRekapPeserta(supabase, ujianId) {
  const perRuangan = await ambilPembagianTersimpan(supabase, ujianId);
  const totalPeserta = perRuangan.reduce((sum, r) => sum + r.siswa.length, 0);
  return {
    jumlahRuangan: perRuangan.length,
    totalPeserta,
    perRuangan: perRuangan.map((r) => ({
      nomor_ruangan: r.nomor_ruangan,
      jumlah_siswa: r.siswa.length,
    })),
  };
}

/**
 * Rekap pengawas -- daftar guru yang bertugas selama ujian beserta
 * jumlah sesi jaga masing-masing. Loop semua sesi jadwal karena
 * ambilPengawasUntukJadwal cuma per 1 sesi.
 */
async function ambilRekapPengawas(supabase, ujianId) {
  const daftarJadwal = await ambilJadwalSesi(supabase, ujianId);
  const perGuru = {};

  for (const jadwal of daftarJadwal) {
    const pengawas = await ambilPengawasUntukJadwal(supabase, jadwal.id);
    for (const p of pengawas) {
      if (!perGuru[p.guru_id]) {
        perGuru[p.guru_id] = { guru_id: p.guru_id, nama: p.nama, jumlahSesiJaga: 0 };
      }
      perGuru[p.guru_id].jumlahSesiJaga += 1;
    }
  }

  const daftarPengawas = Object.values(perGuru).sort((a, b) => a.nama.localeCompare(b.nama));
  return {
    jumlahSesi: daftarJadwal.length,
    jumlahPengawas: daftarPengawas.length,
    daftarPengawas,
  };
}

/**
 * Ambil rekap kehadiran manual (kalau sudah pernah diisi) untuk 1 ujian.
 */
async function ambilKehadiran(supabase, ujianId) {
  const { data, error } = await supabase
    .from("rekap_kehadiran_ujian")
    .select("*")
    .eq("ujian_id", ujianId)
    .order("nomor_ruangan", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Simpan/update rekap kehadiran 1 ruangan (upsert berdasarkan
 * ujian_id + nomor_ruangan).
 */
async function simpanKehadiran(supabase, ujianId, nomorRuangan, perubahan) {
  const { data, error } = await supabase
    .from("rekap_kehadiran_ujian")
    .upsert(
      {
        ujian_id: ujianId,
        nomor_ruangan: nomorRuangan,
        jumlah_hadir: perubahan.jumlah_hadir ?? 0,
        jumlah_tidak_hadir: perubahan.jumlah_tidak_hadir ?? 0,
        keterangan: perubahan.keterangan || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ujian_id,nomor_ruangan" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export {
  ambilRekapPeserta,
  ambilRekapPengawas,
  ambilKehadiran,
  simpanKehadiran,
};
