// portal-siswa/StudentPortal.js
// ========================================================================
// Orkestrator portal siswa. Nyimpen state halaman aktif (currentPage),
// render StudentLayout (header + sidebar + bottom nav), dan tampilin
// halaman yang sesuai di dalamnya. Dipanggil dari App.js sebagai
// pengganti pemanggilan StudentLayout langsung.
//
// UPDATE: onPageChange sekarang bisa nerima parameter ke-2 (menu key)
// khusus buat halaman "student-lainnya" (StudentInfo, dulu namanya
// StudentAkun — di-rename biar gak rancu sama menu "Profile" di header).
// Ini dipakai sama dropdown Profile di header (StudentLayout.js) biar pas
// diklik langsung nyemplung ke detail "Profile", bukan nyangkut di grid
// menu Info dulu. Pemanggilan biasa kayak onPageChange("student-jadwal")
// tetep jalan normal karena parameter ke-2-nya optional.
// ========================================================================
import { useState } from "react";
import StudentLayout from "./StudentLayout";
import StudentDashboard from "./StudentDashboard";
import StudentJadwal from "./StudentJadwal";
import StudentPresensi from "./StudentPresensi";
import StudentInfo from "./StudentInfo";
import BelajarMain from "./belajar/BelajarMain";

export default function StudentPortal({ user, onShowToast, darkMode, onLogout }) {
  const [currentPage, setCurrentPage] = useState("student-dashboard");
  // Menu StudentInfo yang harus langsung kebuka (mis. "profile"). null =
  // tampilan grid biasa. Direset ke null tiap kali pindah ke halaman lain
  // biar gak "nyangkut" kalau nanti balik lagi ke Info lewat sidebar/nav.
  const [infoMenu, setInfoMenu] = useState(null);

  const handlePageChange = (page, menu = null) => {
    setCurrentPage(page);
    setInfoMenu(page === "student-lainnya" ? menu : null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "student-dashboard":
        return (
          <StudentDashboard
            currentUser={user}
            onShowToast={onShowToast}
            onPageChange={handlePageChange}
          />
        );
      case "student-jadwal":
        return <StudentJadwal currentUser={user} onShowToast={onShowToast} />;
      case "student-presensi":
        return <StudentPresensi currentUser={user} onShowToast={onShowToast} />;
      case "student-belajar":
        return <BelajarMain currentUser={user} />;
      case "student-lainnya":
        return <StudentInfo initialMenu={infoMenu} />;
      default:
        return (
          <StudentDashboard
            currentUser={user}
            onShowToast={onShowToast}
            onPageChange={handlePageChange}
          />
        );
    }
  };

  return (
    <StudentLayout
      currentPage={currentPage}
      onPageChange={handlePageChange}
      currentUser={user}
      onLogout={onLogout}
    >
      {renderPage()}
    </StudentLayout>
  );
}
