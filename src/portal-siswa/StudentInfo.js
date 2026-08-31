// portal-siswa/StudentInfo.js
// Halaman "Info" — 2 tampilan:
//   1. Grid card menu (Data Siswa, Jadwal Piket, dst) — tampilan awal.
//      Diubah dari list ke card grid biar lebih user-friendly buat
//      siswa/orang tua (lebih gampang dipencet, lebih jelas per-menu).
//   2. Detail 1 menu doang, fullscreen fokus ke situ, menu lain ilang,
//      ada tombol "Kembali" buat balik ke grid.
// Isi tiap menu baru di-mount (jadi baru fetch data-nya kalau ada) pas
// menunya diklik — bukan langsung semua ke-fetch pas halaman ini dibuka.
//
// CATATAN RENAME: file ini sebelumnya bernama StudentAkun.js. Diganti jadi
// StudentInfo.js biar gak rancu sama menu "Profile" di header (yang isinya
// Profil Saya/Ganti Password/Perangkat Terhubung/Mode Gelap/Keluar) — dua
// hal beda yang dulu sama-sama kesannya "akun". Import & menuConfig di
// App.js WAJIB disesuaikan, lihat catatan di bawah file ini.
import React, { useState, useEffect } from "react";
import useStudentProfile from "./useStudentProfile";
import { ProfileInfo, ChangePasswordForm } from "./StudentProfile";
import StudentPiket from "./StudentPiket";
import StudentPengumuman from "./StudentPengumuman";
import StudentSaran from "./StudentSaran";
import StudentPerangkatTerhubung from "./StudentPerangkatTerhubung";
import StudentRaport from "./StudentRaport";
import {
  IdCard,
  KeyRound,
  Smartphone,
  Users as UsersIcon,
  Bell,
  MessageSquare,
  GraduationCap,
  LayoutGrid,
  Network,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import StudentDataSiswa from "./StudentDataSiswa";
import StudentDenahDuduk from "./StudentDenahDuduk";
import StudentOrganigram from "./StudentOrganigram";

const MENUS = [
  {
    key: "data-siswa",
    title: "Data Siswa",
    subtitle: "Daftar teman sekelas",
    icon: IdCard,
    cardBgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    cardBorderClass: "border-indigo-200",
    titleColorClass: "text-indigo-900 dark:text-indigo-300",
    subtitleColorClass: "text-indigo-700/70 dark:text-indigo-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-indigo-600",
  },
  {
    key: "raport",
    title: "Nilai Raport",
    subtitle: "Riwayat nilai per semester",
    icon: GraduationCap,
    cardBgClass: "bg-rose-100 dark:bg-rose-900/30",
    cardBorderClass: "border-rose-200",
    titleColorClass: "text-rose-900 dark:text-rose-300",
    subtitleColorClass: "text-rose-700/70 dark:text-rose-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-rose-600",
  },
  {
    key: "piket",
    title: "Jadwal Piket",
    subtitle: "Lihat jadwal piket",
    icon: UsersIcon,
    cardBgClass: "bg-orange-100 dark:bg-orange-900/30",
    cardBorderClass: "border-orange-200",
    titleColorClass: "text-orange-900 dark:text-orange-300",
    subtitleColorClass: "text-orange-700/70 dark:text-orange-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-orange-600",
  },
  {
    key: "pengumuman",
    title: "Pengumuman",
    subtitle: "Info dari sekolah",
    icon: Bell,
    cardBgClass: "bg-yellow-100 dark:bg-yellow-900/30",
    cardBorderClass: "border-yellow-200",
    titleColorClass: "text-yellow-900 dark:text-yellow-300",
    subtitleColorClass: "text-yellow-700/70 dark:text-yellow-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-yellow-600",
  },
  {
    key: "saran",
    title: "Saran/Masukan",
    subtitle: "Kirim masukan ke sekolah",
    icon: MessageSquare,
    cardBgClass: "bg-green-100 dark:bg-green-900/30",
    cardBorderClass: "border-green-200",
    titleColorClass: "text-green-900 dark:text-green-300",
    subtitleColorClass: "text-green-700/70 dark:text-green-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-green-600",
  },
  {
    key: "denah-duduk",
    title: "Denah Duduk",
    subtitle: "Lihat posisi duduk kelas",
    icon: LayoutGrid,
    cardBgClass: "bg-amber-100 dark:bg-amber-900/30",
    cardBorderClass: "border-amber-200",
    titleColorClass: "text-amber-900 dark:text-amber-300",
    subtitleColorClass: "text-amber-700/70 dark:text-amber-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-amber-600",
  },
  {
    key: "organigram",
    title: "Struktur Organisasi",
    subtitle: "Bagan pengurus kelas",
    icon: Network,
    cardBgClass: "bg-sky-100 dark:bg-sky-900/30",
    cardBorderClass: "border-sky-200",
    titleColorClass: "text-sky-900 dark:text-sky-300",
    subtitleColorClass: "text-sky-700/70 dark:text-sky-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-sky-600",
  },
];

// Menu yang aksesnya dipindah ke dropdown "Profile" di header (StudentLayout.js)
// jadi gak perlu nongol lagi sebagai card di grid Info ini. Tapi metadata-nya
// (icon, warna) masih dipertahankan di sini karena detail view (renderContent)
// butuh info itu pas dibuka lewat initialMenu="devices" dari dropdown.
const HIDDEN_FROM_GRID_MENUS = [
  {
    key: "profile",
    title: "Profile Siswa",
    subtitle: "Data diri & kontak",
    icon: IdCard,
    cardBgClass: "bg-blue-100 dark:bg-blue-900/30",
    cardBorderClass: "border-blue-200",
    titleColorClass: "text-blue-900 dark:text-blue-300",
    subtitleColorClass: "text-blue-700/70 dark:text-blue-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-blue-600",
  },
  {
    key: "password",
    title: "Ganti Password",
    subtitle: "Keamanan akun",
    icon: KeyRound,
    cardBgClass: "bg-purple-100 dark:bg-purple-900/30",
    cardBorderClass: "border-purple-200",
    titleColorClass: "text-purple-900 dark:text-purple-300",
    subtitleColorClass: "text-purple-700/70 dark:text-purple-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-purple-600",
  },
  {
    key: "devices",
    title: "Perangkat Terhubung",
    subtitle: "Kelola perangkat login",
    icon: Smartphone,
    cardBgClass: "bg-cyan-100 dark:bg-cyan-900/30",
    cardBorderClass: "border-cyan-200",
    titleColorClass: "text-cyan-900 dark:text-cyan-300",
    subtitleColorClass: "text-cyan-700/70 dark:text-cyan-400/70",
    iconBgClass: "bg-white/80",
    iconColorClass: "text-cyan-600",
  },
];

const ALL_MENUS = [...MENUS, ...HIDDEN_FROM_GRID_MENUS];

export default function StudentInfo({ initialMenu } = {}) {
  const {
    student,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useStudentProfile();
  const [activeMenu, setActiveMenu] = useState(initialMenu || null);

  // Kalau StudentInfo udah ke-mount duluan (misal user baru aja di halaman
  // Info) terus onPageChange("student-lainnya", "pengumuman") dipanggil
  // lagi, initialMenu prop-nya berubah tapi useState di atas gak jalan
  // ulang. Effect ini yang jaga biar tetep ke-sync & auto-buka menunya.
  useEffect(() => {
    if (initialMenu) setActiveMenu(initialMenu);
  }, [initialMenu]);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (profileError === "NO_SESSION") {
    return (
      <div className="text-center py-20 text-sm text-theme-secondary">
        Sesi Tidak Ketemu. Silakan Login Ulang.
      </div>
    );
  }

  const renderContent = (key) => {
    switch (key) {
      case "profile":
        return <ProfileInfo student={student} onUpdated={refetchProfile} />;
      case "password":
        return <ChangePasswordForm student={student} />;
      case "data-siswa":
        return <StudentDataSiswa student={student} />;
      case "devices":
        return <StudentPerangkatTerhubung student={student} />;
      case "piket":
        return <StudentPiket student={student} />;
      case "pengumuman":
        return <StudentPengumuman student={student} />;
      case "saran":
        return <StudentSaran student={student} />;
      case "raport":
        return <StudentRaport student={student} />;
      case "denah-duduk":
        return <StudentDenahDuduk student={student} />;
      case "organigram":
        return <StudentOrganigram student={student} />;
      default:
        return null;
    }
  };

  // ---- Tampilan detail: fokus ke 1 menu doang, menu lain gak muncul ----
  if (activeMenu) {
    const menu = ALL_MENUS.find((m) => m.key === activeMenu);
    const Icon = menu.icon;

    return (
      <div className="w-full space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-1 text-base font-bold text-theme-secondary active:text-theme-secondary"
          >
            <ChevronLeft size={20} />
            Kembali
          </button>
        </div>

        <section className="w-full bg-theme-bg rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div
            className={`flex items-center gap-3 p-4 border-b border-gray-50 ${menu.cardBgClass}`}
          >
            <div className="w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <Icon size={18} className={menu.iconColorClass} />
            </div>
            <span
              className={`text-base font-extrabold uppercase tracking-wide ${menu.titleColorClass}`}
            >
              {menu.title}
            </span>
          </div>
          <div className="p-4">{renderContent(activeMenu)}</div>
        </section>
      </div>
    );
  }

  // ---- Tampilan grid: semua menu dalam bentuk card, belum ada yang dipilih ----
  return (
    <div className="grid grid-cols-2 gap-3">
      {MENUS.map(
        ({
          key,
          title,
          subtitle,
          icon: Icon,
          cardBgClass,
          cardBorderClass,
          titleColorClass,
          subtitleColorClass,
          iconBgClass,
          iconColorClass,
        }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveMenu(key)}
            className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border shadow-sm text-left active:scale-[0.98] transition-transform ${cardBgClass} ${cardBorderClass}`}
          >
            <div
              className={`w-11 h-11 ${iconBgClass} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}
            >
              <Icon size={20} className={iconColorClass} />
            </div>
            <div className="w-full">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-base font-bold leading-tight ${titleColorClass}`}>
                  {title}
                </span>
                <ChevronRight size={18} className={`shrink-0 ${titleColorClass} opacity-40`} />
              </div>
              <p className={`text-sm mt-0.5 leading-snug font-medium ${subtitleColorClass}`}>
                {subtitle}
              </p>
            </div>
          </button>
        )
      )}
    </div>
  );
}
