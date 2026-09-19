// setting/kelola-ujian/jadwal-pengawas/jadwalPengawasCetak.js
// Pembangun data TUNGGAL buat tab "Jadwal Pengawas" (versi lihat/cetak).
// Preview di layar, export Excel, dan export PDF semuanya baca hasil
// bangunDataJadwalPengawas() ini, jadi isinya dijamin sama di ketiganya.
//
// Format tabel mengikuti Jadwal_Pengawas_PSAS.xlsx:
//   Hari/Tanggal | Waktu | Jam ke | Mata Pelajaran | R. 1 ... R. n
// lalu di HALAMAN 2 tabel Daftar Kode Pengawas: No | Nama Pengawas | Kode.
// Isi sel ruangan = KODE pengawas (bukan nama lengkap), kode-nya dijelasin
// di tabel Daftar Kode di bawah.

import { kelompokkanJadwalPerHari, mataPelajaranUntukRuangan } from "./jadwalPengawasSupabase";

const NAMA_PANJANG_UJIAN = {
  PSAS: "Penilaian Sumatif Akhir Semester",
  PSAT: "Penilaian Sumatif Akhir Tahun",
  PSAJ: "Penilaian Sumatif Akhir Jenjang",
};

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** "2026-12-07" -> "Senin, 07-12-2026" (parsing manual, anti geser timezone). */
export function formatHariTanggal(tanggal) {
  if (!tanggal) return "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const namaHari = NAMA_HARI[new Date(tahun, bulan - 1, hari).getDay()];
  return `${namaHari}, ${String(hari).padStart(2, "0")}-${String(bulan).padStart(2, "0")}-${tahun}`;
}

/** "07:30:00" / "07:30" -> "07.30" */
export function formatJam(waktu) {
  if (!waktu) return "";
  const [jam, menit] = String(waktu).split(":");
  return `${jam.padStart(2, "0")}.${(menit || "00").padStart(2, "0")}`;
}

/**
 * Mapel 1 sesi buat kolom "Mata Pelajaran". Normalnya 1 teks. Kalau ada
 * override kelas 8/9 yang beda (mis. kelas 9 cuma 11 mapel), tiap versi
 * ditulis lengkap dengan jenjangnya: "PABP (7,8) / Bahasa Jawa (9)".
 */
function labelMapel(jadwal, grades) {
  const kelompok = mataPelajaranUntukRuangan(jadwal, grades);
  if (kelompok.length <= 1) return kelompok[0]?.mapel || jadwal.mata_pelajaran || "";
  return kelompok.map((k) => `${k.mapel} (${k.jenjang.join(",")})`).join(" / ");
}

/**
 * @param {object} p
 * @param {string} p.jenisUjian        - "PSAS" | "PSAT" | "PSAJ"
 * @param {object} p.tahunAjaran       - baris academic_years terpilih (year, semester)
 * @param {Array}  p.daftarJadwal      - dari ambilJadwalSesi()
 * @param {Array}  p.daftarRuangan     - dari ambilRuanganUjian()
 * @param {Array}  p.daftarGuru        - dari ambilDaftarGuru() (id, full_name, kode_pengawas)
 * @param {object} p.rekapPerJadwal    - { [jadwalId]: { [nomor_ruangan]: [{guru_id, nama}] } }
 * @param {string[]} [p.grades]        - jenjang peserta ujian ini
 */
export function bangunDataJadwalPengawas({
  jenisUjian,
  tahunAjaran,
  daftarJadwal,
  daftarRuangan,
  daftarGuru,
  rekapPerJadwal,
  grades = ["7", "8", "9"],
}) {
  const nomorRuangan = daftarRuangan.map((r) => r.nomor_ruangan).sort((a, b) => a - b);
  const kodePerGuru = new Map(daftarGuru.map((g) => [g.id, g.kode_pengawas]));

  const baris = [];
  kelompokkanJadwalPerHari(daftarJadwal).forEach((hari) => {
    hari.sesi.forEach((sesi, idx) => {
      const perRuangan = rekapPerJadwal?.[sesi.id] || {};
      baris.push({
        // Label hari cuma di sesi pertama; spanHari = berapa baris digabung.
        tanggalLabel: idx === 0 ? formatHariTanggal(hari.tanggal) : "",
        spanHari: idx === 0 ? hari.sesi.length : 0,
        waktu:
          sesi.waktu_mulai || sesi.waktu_selesai
            ? `${formatJam(sesi.waktu_mulai)}-${formatJam(sesi.waktu_selesai)}`
            : "-",
        jamKe: sesi.sesi_ke,
        mapel: labelMapel(sesi, grades),
        // "?" = guru masih ditugaskan tapi kodenya sudah dihapus dari Daftar Pengawas.
        kodePerRuangan: nomorRuangan.map((no) =>
          (perRuangan[no] || []).map((p) => kodePerGuru.get(p.guru_id) || "?").join(", ")
        ),
      });
    });
  });

  const semesterLabel =
    tahunAjaran?.semester === 1 || tahunAjaran?.semester === "1" ? "GANJIL" : "GENAP";
  const labelTA =
    tahunAjaran?.year ||
    tahunAjaran?.tahun_ajaran ||
    tahunAjaran?.name ||
    tahunAjaran?.label ||
    tahunAjaran?.nama ||
    "";
  const namaUjian = (NAMA_PANJANG_UJIAN[jenisUjian] || jenisUjian).toUpperCase();

  return {
    judul: [
      "SMP MUSLIMIN CILILIN",
      // PSAS: "...AKHIR SEMESTER GANJIL TAHUN AJARAN 2026/2027" (sesuai contoh).
      `${namaUjian}${jenisUjian === "PSAS" ? ` ${semesterLabel}` : ""} TAHUN AJARAN ${labelTA}`.trim(),
      "JADWAL PENGAWAS",
    ],
    namaFile: `Jadwal_Pengawas_${jenisUjian}`,
    nomorRuangan,
    baris,
    daftarKode: daftarGuru.map((g, i) => ({
      no: i + 1,
      nama: g.full_name,
      kode: g.kode_pengawas,
    })),
  };
}
