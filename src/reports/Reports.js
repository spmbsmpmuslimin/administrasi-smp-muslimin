import React from "react";
import AdminReports from "./AdminReports";
import HomeroomTeacherReports from "./HomeroomTeacherReports";
import TeacherReports from "./TeacherReports";
import BKReports from "./BKReports";

const Reports = ({ user, onShowToast }) => {
  // Validasi user dan role
  if (!user || !user.role) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md dark:shadow-gray-900/50 text-center max-w-md w-full transition-colors">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            Akses Ditolak
          </h2>
          <p className="text-slate-600 dark:text-gray-300 mb-4 md:mb-6">
            Anda tidak memiliki akses ke halaman laporan.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-3 md:px-8 md:py-3 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors w-full md:w-auto min-h-[44px] touch-manipulation"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // Render untuk Admin
  if (user.role === "admin") {
    return <AdminReports user={user} onShowToast={onShowToast} />;
  }

  // Render untuk Guru BK/BP/Konselor
  if (
    user.role === "counselor" ||
    user.role === "bk" ||
    user.role === "bp" ||
    user.role === "guru_bk"
  ) {
    return <BKReports user={user} onShowToast={onShowToast} />;
  }

  // Render untuk Teacher
  if (user.role === "teacher") {
    // Cek apakah teacher ini juga wali kelas
    const isHomeroomTeacher = user.homeroom_class_id && user.homeroom_class_id.trim() !== "";

    if (isHomeroomTeacher) {
      return <HomeroomTeacherReports user={user} onShowToast={onShowToast} />;
    } else {
      return <TeacherReports user={user} onShowToast={onShowToast} />;
    }
  }

  // Render untuk Student
  if (user.role === "student") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md dark:shadow-gray-900/50 text-center max-w-md w-full transition-colors">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📚</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            Laporan Akademik
          </h2>
          <p className="text-slate-600 dark:text-gray-300 mb-4 md:mb-6">
            Halaman laporan untuk siswa sedang dalam pengembangan.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4 md:mb-6">
            <p className="text-sm md:text-base text-yellow-700 dark:text-yellow-300">
              Fitur ini akan segera hadir. Anda dapat melihat nilai dan laporan melalui menu rapor.
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-3 md:px-8 md:py-3 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors w-full md:w-auto min-h-[44px] touch-manipulation"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // Render untuk Parent/Wali
  if (user.role === "parent") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md dark:shadow-gray-900/50 text-center max-w-md w-full transition-colors">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👨‍👩‍👧‍👦</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            Laporan Anak
          </h2>
          <p className="text-slate-600 dark:text-gray-300 mb-4 md:mb-6">
            Halaman laporan untuk orang tua/wali sedang dalam pengembangan.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 md:mb-6">
            <p className="text-sm md:text-base text-blue-700 dark:text-blue-300">
              Anda akan dapat memantau perkembangan akademik dan perilaku anak Anda di sini.
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-3 md:px-8 md:py-3 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors w-full md:w-auto min-h-[44px] touch-manipulation"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // Fallback untuk role yang tidak dikenali
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md dark:shadow-gray-900/50 text-center max-w-md w-full transition-colors">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">❓</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
          Role Tidak Dikenali
        </h2>
        <p className="text-slate-600 dark:text-gray-300 mb-2 md:mb-3">
          Role "<span className="font-semibold">{user.role}</span>" tidak valid atau belum didukung.
        </p>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
          <p className="text-sm md:text-base text-red-700 dark:text-red-300">
            Role yang didukung: admin, teacher, counselor/bk/bp/guru_bk, student, parent
          </p>
        </div>
        <p className="text-sm md:text-base text-slate-500 dark:text-gray-400 mb-4 md:mb-6">
          Hubungi administrator untuk bantuan.
        </p>
        <button
          onClick={() => window.history.back()}
          className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-3 md:px-8 md:py-3 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors w-full md:w-auto min-h-[44px] touch-manipulation"
        >
          Kembali
        </button>
      </div>
    </div>
  );
};

export default Reports;
