// pages/kelola-raport/NilaiRaportSiswa.js
// Halaman standalone "Nilai Raport Siswa" -- dipisah dari Setting.js
// (dulu card "kelola-raport" / "Manajemen Nilai Raport" di halaman
// Pengaturan). Sekarang diakses langsung dari Sidebar > menu utama
// buat Admin/TU (menggantikan target "Nilai Siswa" yang sebelumnya
// nyasar ke GradeMain punya Guru -- Admin/TU gak ikut campur input
// nilai harian, yang relevan buat mereka adalah kelola raport digital).
//
// Cuma wrapper tipis: load schoolConfig sendiri (logic disalin persis
// dari loadSchoolConfig() di Setting.js, karena sumbernya sama:
// tabel school_settings), lalu render RaportNilaiTab dengan props yang
// sama persis kayak commonProps yang dulu disuplai Setting.js.

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import RaportNilaiTab from "./RaportNilaiTab";

const NilaiRaportSiswa = ({ user, onShowToast, darkMode, onToggleDarkMode }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [schoolConfig, setSchoolConfig] = useState(null);

  // Sama persis dengan loadSchoolConfig() di Setting.js -- kalau logic
  // di sana berubah nanti, jangan lupa sinkronin di sini juga.
  const loadSchoolConfig = useCallback(async () => {
    try {
      setLoading(true);
      const { data: settings, error } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["school_name", "school_level"]);

      if (error) throw error;

      const config = {};
      settings?.forEach((item) => {
        config[item.setting_key] = item.setting_value;
      });

      const schoolLevel = config.school_level || "SMP";
      let grades = ["7", "8", "9"]; // Default SMP

      if (schoolLevel === "SMP" || schoolLevel === "MTs") {
        grades = ["7", "8", "9"];
      } else if (schoolLevel === "SMA" || schoolLevel === "SMK" || schoolLevel === "MA") {
        grades = ["10", "11", "12"];
      } else if (schoolLevel === "SD" || schoolLevel === "MI") {
        grades = ["1", "2", "3", "4", "5", "6"];
      }

      setSchoolConfig({
        schoolName: config.school_name || "SMP Muslimin Cililin",
        schoolLevel,
        grades,
      });
    } catch (error) {
      console.error("Error loading school config:", error);
      if (onShowToast) {
        onShowToast("Gagal memuat konfigurasi sekolah", "error");
      }
      setSchoolConfig({
        schoolName: "SMP Muslimin Cililin",
        schoolLevel: "SMP",
        grades: ["7", "8", "9"],
      });
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    if (user) {
      loadSchoolConfig();
    }
  }, [user, loadSchoolConfig]);

  const commonProps = {
    userId: user?.id,
    user,
    loading,
    setLoading,
    showToast: onShowToast,
    schoolConfig,
    refreshSchoolConfig: loadSchoolConfig,
    darkMode,
    onToggleDarkMode,
    // Dulu ini changeTab("user-management") lokal punya Setting.js.
    // Di sini halamannya udah lepas dari Setting, jadi navigate langsung
    // ke tab User Management di /settings.
    onNavigateToUserManagement: () => navigate("/settings?tab=user-management"),
  };

  return <RaportNilaiTab {...commonProps} />;
};

export default NilaiRaportSiswa;
