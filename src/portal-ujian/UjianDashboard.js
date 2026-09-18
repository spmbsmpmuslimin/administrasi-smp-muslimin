// portal-ujian/UjianDashboard.js
// ========================================================================
// Halaman pertama yang dilihat guru panitia pas buka Portal Ujian. Kartu
// jenis ujian (PSAS/PSAT/PSAJ) -- perilaku klik-nya PERSIS SAMA seperti
// semula (onPilihJenisUjian(jenis) -> buka grid sub-fitur lengkap lewat
// JenisUjianMenuTab, gak ada deep-link/shortcut apa pun).
//
// TAMBAHAN -- panel "Panduan: Apa yang perlu dilakukan?" di atas kartu
// jenis ujian: cuma INFORMASI urutan kerja panitia ujian (dari pilih
// jenis ujian sampai isi laporan rekap akhir), bukan navigasi. Bisa
// dilipat/dibuka (showPanduan) biar gak makan tempat buat guru yang udah
// hafal alurnya. State-nya lokal ke komponen ini aja -- reset ke
// "terbuka" tiap kali portal dibuka ulang, gak disimpan ke mana pun.
// ========================================================================
import { useState } from "react";
import {
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Compass,
  CalendarClock,
  IdCard,
  FileBarChart2,
  ClipboardCheck,
} from "lucide-react";

// Urutan kerja panitia ujian dari awal sampai selesai. Judul & deskripsi
// sengaja nyebut nama sub-fitur PERSIS SAMA seperti di SUB_FITUR
// JenisUjianMenuTab.js, biar guru gampang nyocokin panduan ini sama
// kartu yang bakal ditemuin pas masuk ke ruang kerja.
const LANGKAH_PANDUAN = [
  {
    title: "Pilih jenis ujian",
    desc: "Klik salah satu kartu jenis ujian (PSAS/PSAT/PSAJ) di bawah buat masuk ke ruang kerjanya.",
    icon: FileText,
  },
  {
    title: "Cek Jadwal, Peserta & Pembagian Ruangan",
    desc: "Lihat jadwal sesi & pembagian ruangan buat tau kamu ngawas kapan dan di ruangan mana.",
    icon: CalendarClock,
  },
  {
    title: "Cetak Kartu Ujian",
    desc: "Cetak kartu peserta & kartu pengawas yang dibutuhkan pas hari pelaksanaan.",
    icon: IdCard,
  },
  {
    title: "Isi Presensi & Berita Acara",
    desc: "Pas hari H, cetak formulir Presensi & Berita Acara, lalu isi dan tanda tangan manual di ruangan.",
    icon: FileBarChart2,
  },
  {
    title: "Lengkapi Laporan Rekap Akhir",
    desc: "Kalau diminta, isi catatan kehadiran & evaluasi di Laporan Rekap Akhir setelah ujian selesai.",
    icon: ClipboardCheck,
  },
];

export default function UjianDashboard({
  namaGuru,
  jenisUjianAktif,
  onPilihJenisUjian,
}) {
  const [showPanduan, setShowPanduan] = useState(true);

  if (!jenisUjianAktif?.length) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-amber-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-6 h-6 text-amber-500" />
        </div>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
          Belum ada tugas panitia aktif
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Portal ini akan aktif otomatis saat kamu terdaftar sebagai panitia
          dan periode ujian sedang berlangsung.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Selamat datang, {namaGuru}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kamu terdaftar sebagai panitia untuk:
        </p>
      </div>

      {/* ====== PANDUAN: APA YANG PERLU DILAKUKAN? ====== */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPanduan((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-4 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center shrink-0">
              <Compass size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Panduan: Apa yang perlu dilakukan?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Urutan langkah kerja panitia ujian dari awal sampai selesai
              </p>
            </div>
          </div>
          {showPanduan ? (
            <ChevronUp size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
          ) : (
            <ChevronDown size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
          )}
        </button>

        {showPanduan && (
          <div className="px-4 pb-4">
            {LANGKAH_PANDUAN.map((langkah, idx) => {
              const Icon = langkah.icon;
              const isLast = idx === LANGKAH_PANDUAN.length - 1;
              return (
                <div key={langkah.title} className="flex items-start gap-3">
                  {/* Nomor urut + garis penghubung ala timeline */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 bg-amber-100 dark:bg-amber-900/40 my-1" />
                    )}
                  </div>
                  <div className={isLast ? "pb-0.5" : "pb-4"}>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                      <Icon size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
                      {langkah.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {langkah.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== KARTU JENIS UJIAN -- ORIGINAL, TIDAK BERUBAH ====== */}
      <div className="grid gap-3 sm:grid-cols-2">
        {jenisUjianAktif.map((jenis) => (
          <button
            key={jenis}
            onClick={() => onPilihJenisUjian(jenis)}
            className="group flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800
              shadow-sm hover:shadow-md hover:border-amber-200 dark:hover:border-amber-900 transition-all p-4 text-left"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <FileText size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                {jenis}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Buka ruang kerja ujian
              </p>
            </div>
            <ChevronRight
              size={18}
              className="text-gray-300 dark:text-gray-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
