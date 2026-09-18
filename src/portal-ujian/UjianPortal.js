// portal-ujian/UjianPortal.js
// ========================================================================
// Orkestrator Portal Panitia Ujian. Pola sama persis kayak
// StudentPortal.js: nyimpen state halaman aktif (currentPage), render
// UjianLayout (header + sidebar + bottom nav), dan tampilin halaman yang
// sesuai di dalamnya. Dipanggil dari menuConfig.js sebagai component
// untuk route "/portal-ujian".
//
// jenisUjianAktif diambil dari view v_panitia_ujian_aktif (join
// ujian_kepanitiaan + ujian, status aktif di keduanya).
// ========================================================================
import { useState, useEffect } from "react";
import UjianLayout from "./UjianLayout";
import UjianDashboard from "./UjianDashboard";
import { getJenisUjianAktif } from "./portalUjianSupabase";

// Reuse komponen yang SUDAH ADA di Kelola Ujian admin/TU — tidak ada
// perubahan logic/skema. Sesuaikan path import ini kalau lokasi asli beda.
import JenisUjianMenuTab from "../setting/kelola-ujian/JenisUjianMenuTab";
import LaporanRekapAkhirTab from "../setting/kelola-ujian/dokumen-cetak/LaporanRekapAkhirTab";

export default function UjianPortal({ user, onShowToast, darkMode, onLogout }) {
  const [currentPage, setCurrentPage] = useState("ujian-dashboard");
  const [selectedJenisUjian, setSelectedJenisUjian] = useState(null);
  const [jenisUjianAktif, setJenisUjianAktif] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function muatData() {
      setLoading(true);
      const hasil = await getJenisUjianAktif(user?.id);
      if (!cancelled) {
        setJenisUjianAktif(hasil.map((h) => h.jenis));
        setLoading(false);
      }
    }

    muatData();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handlePilihJenisUjian = (jenis) => {
    setSelectedJenisUjian(jenis);
    setCurrentPage("ujian-jenis");
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
          Memuat data panitia...
        </div>
      );
    }

    switch (currentPage) {
      case "ujian-dashboard":
        return (
          <UjianDashboard
            namaGuru={user?.full_name}
            jenisUjianAktif={jenisUjianAktif}
            onPilihJenisUjian={handlePilihJenisUjian}
          />
        );

      case "ujian-jenis":
        // Komponen ini sama persis dengan yang dipakai admin/TU — grid 5
        // sub-fitur (Pembagian Ruangan, Kepanitiaan & Regulasi, Kartu
        // Ujian, Jadwal & Pengawas, Presensi/Berita Acara/Laporan). Tidak
        // ada filter jabatan: semua panitia dapat akses yang sama.
        return (
          <JenisUjianMenuTab
            jenisUjian={selectedJenisUjian ?? jenisUjianAktif[0]}
            onShowToast={onShowToast}
          />
        );

      case "ujian-laporan":
        // Reuse langsung LaporanRekapAkhirTab yang sama persis dipakai
        // admin/TU (via JenisUjianMenuTab) -- di situ udah ada alur
        // lengkapnya: rekap peserta/pengawas/anggaran otomatis, input
        // manual kehadiran & catatan evaluasi, baru tombol generate PDF.
        // onBack diarahkan balik ke Dashboard portal ini (bukan
        // setActiveSubFitur seperti versi admin, karena di sini gak ada
        // grid sub-fitur pembungkusnya).
        return (
          <LaporanRekapAkhirTab
            jenisUjian={selectedJenisUjian ?? jenisUjianAktif[0]}
            showToast={onShowToast}
            onBack={() => setCurrentPage("ujian-dashboard")}
          />
        );

      default:
        return (
          <UjianDashboard
            namaGuru={user?.full_name}
            jenisUjianAktif={jenisUjianAktif}
            onPilihJenisUjian={handlePilihJenisUjian}
          />
        );
    }
  };

  return (
    <UjianLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      currentUser={user}
      onLogout={onLogout}
    >
      {renderPage()}
    </UjianLayout>
  );
}
