// BirthdayCelebration.js
// 4 komponen presentational buat fitur "kejutan ulang tahun" di dashboard
// siswa:
// - BirthdayModal            -> buat siswa yang LAGI ulang tahun hari ini
//   (confetti + kartu ucapan, nge-block layar, sekali nongol pas mount).
// - BirthdayBanner           -> banner nempel (non-blocking) buat siswa
//   yang lagi ultah, jalan BARENGAN sama BirthdayModal, keliatan seharian.
// - ClassmateBirthdayModal   -> buat temen sekelasnya, popup juga (confetti
//   sama serunya), cuma kalimatnya beda (ngajak ucapin, bukan ngucapin ke
//   diri sendiri).
// - ClassmateBirthdayBanner  -> banner nempel (non-blocking) buat temen
//   sekelas, TETEP ada berdampingan sama ClassmateBirthdayModal.
//
// Sengaja gak pake library confetti dari luar (mis. canvas-confetti) biar
// gak nambah dependency baru -- confetti-nya dibikin manual pake CSS
// @keyframes + beberapa <span> yang posisinya di-random pas render.
//
// Cara pakenya (lihat StudentDashboard.js):
//   {isMyBirthday && birthdayModalOpen && (
//     <BirthdayModal name={student.full_name} onClose={() => setBirthdayModalOpen(false)} />
//   )}
//   {isMyBirthday && <BirthdayBanner name={student.full_name} />}
//   {!isMyBirthday && classmatesBirthdayToday.length > 0 && classmateModalOpen && (
//     <ClassmateBirthdayModal names={classmatesBirthdayToday.map((c) => c.name)} onClose={...} />
//   )}
//   <ClassmateBirthdayBanner names={classmatesBirthdayToday.map((c) => c.name)} />
import React, { useMemo } from "react";
import { X } from "lucide-react";

const CONFETTI_COLORS = ["#f43f5e", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899"];
const CONFETTI_PIECE_COUNT = 40;

// Gabungin >1 nama jadi 1 kalimat enak dibaca: "Budi", "Budi & Siti",
// "Budi, Siti, dkk (5 orang)". Dipake bareng sama ClassmateBirthdayModal &
// ClassmateBirthdayBanner biar konsisten.
function joinNames(names) {
  if (!names || names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, 2).join(", ")}, dkk (${names.length} orang)`;
}

// Confetti + shell kartu popup yang dipake bareng BirthdayModal &
// ClassmateBirthdayModal -- biar 2 modal itu SAMA serunya (confetti sama
// persis), cuma konten kartunya beda-beda lewat children.
function BirthdayModalShell({ onClose, children }) {
  // useMemo biar posisi/warna confetti gak di-random ulang tiap re-render
  // (mis. pas parent state lain berubah) -- cukup sekali pas modal muncul.
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_PIECE_COUNT }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2.5}s`,
        animationDuration: `${2.5 + Math.random() * 2}s`,
        backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: `${Math.round(Math.random() * 360)}deg`,
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        @keyframes birthdayConfettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0.9; }
        }
        @keyframes birthdayPopIn {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .birthday-confetti-piece {
          position: absolute;
          top: 0;
          width: 8px;
          height: 14px;
          border-radius: 2px;
          animation-name: birthdayConfettiFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>

      {/* Layer confetti -- pointer-events-none biar gak nutupin klik ke kartu di bawahnya */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((piece, i) => (
          <span
            key={i}
            className="birthday-confetti-piece"
            style={{
              left: piece.left,
              animationDelay: piece.animationDelay,
              animationDuration: piece.animationDuration,
              backgroundColor: piece.backgroundColor,
              transform: `rotate(${piece.rotate})`,
            }}
          />
        ))}
      </div>

      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center border border-white/60 dark:border-slate-700"
        style={{ animation: "birthdayPopIn 0.35s ease-out" }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          aria-label="Tutup"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function BirthdayModal({ name, onClose }) {
  return (
    <BirthdayModalShell onClose={onClose}>
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-lg mb-4">
        <span className="text-3xl">🎂</span>
      </div>

      <p className="text-sm font-semibold text-pink-500 uppercase tracking-wide mb-1">
        Selamat Ulang Tahun
      </p>
      <h2 className="text-xl sm:text-2xl font-bold text-theme mb-2">{name || "Kamu"}! 🎉</h2>
      <p className="text-sm text-theme-secondary">
        Semoga Sehat Selalu, Makin Semangat Belajarnya, Dan Semua Cita-Citanya Tercapai. Selamat
        Ulang Tahun Dari Keluarga Besar SMP Muslimin Cililin🎈
      </p>

      <button
        onClick={onClose}
        className="mt-6 w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition"
      >
        Makasih! 🙌
      </button>
    </BirthdayModalShell>
  );
}

// Popup buat temen sekelas -- confetti & shell-nya SAMA kayak BirthdayModal
// (lewat BirthdayModalShell), cuma kalimatnya beda: ngajak ucapin ke temen,
// bukan ngucapin ke diri sendiri. Muncul BARENGAN sama
// ClassmateBirthdayBanner (banner tetep ada, gak digantiin).
export function ClassmateBirthdayModal({ names, onClose }) {
  const label = joinNames(names);

  return (
    <BirthdayModalShell onClose={onClose}>
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center shadow-lg mb-4">
        <span className="text-3xl">🎉</span>
      </div>

      <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-1">
        Hari Ini Ulang Tahun Temanmu
      </p>
      <h2 className="text-xl sm:text-2xl font-bold text-theme mb-2">{label}! 🎂</h2>
      <p className="text-sm text-theme-secondary">
        Yuk, Luangkan Waktu Sebentar Buat Ucapin Selamat Ulang Tahun Untuk {label}. Kejutan Kecil
        Dari Kamu Bakal Bikin Harinya Makin Spesial! 🎈
      </p>

      <button
        onClick={onClose}
        className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-sky-400 text-white font-semibold py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition"
      >
        Siap, Ucapin Ah! 🙌
      </button>
    </BirthdayModalShell>
  );
}

// Banner nempel (non-blocking) buat yang LAGI ultah sendiri -- barengan
// sama BirthdayModal (modal-nya cuma nongol pas awal buka/reload,
// banner ini yang nempel seharian di dashboard, sama pola-nya kayak
// ClassmateBirthdayBanner).
export function BirthdayBanner({ name }) {
  if (!name) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-white/20 flex items-center justify-center shadow-md">
        <span className="text-lg">🎂</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">Selamat Ulang Tahun, {name}! 🎉</p>
        <p className="text-sm text-white/90 truncate">Semoga Sehat & Sukses Selalu, Ya ! 🎈</p>
      </div>
    </section>
  );
}

// Banner non-blocking buat temen sekelas yang ultah -- ditaro nempel di
// dashboard (bukan modal), biar gak ngeganggu tiap kali di-reload tapi
// tetep keliatan sepanjang hari itu. TETEP ada berdampingan sama
// ClassmateBirthdayModal, bukan pengganti.
export function ClassmateBirthdayBanner({ names }) {
  if (!names || names.length === 0) return null;

  const label = joinNames(names);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-50 via-orange-50 to-yellow-50 dark:from-pink-950/30 dark:via-orange-950/20 dark:to-yellow-950/20 border border-pink-100 dark:border-pink-900/40 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-md">
        <span className="text-lg">🎂</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-theme">Hari ini ulang tahun temen kamu!</p>
        <p className="text-sm text-theme-secondary truncate">
          Yuk ucapin selamat buat <span className="font-semibold">{label}</span> 🎉
        </p>
      </div>
    </section>
  );
}
