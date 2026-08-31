//[file name]: HomeVisitDetail.js
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

// ⚠️ ASUMSI PATH: sesuaikan kalau lokasi supabaseClient beda
import { supabase } from "../../supabaseClient";

// ============================================================
// Modal Detail Home Visit (READ-ONLY).
// Nampilin 1 record `homevisits` secara lengkap, plus data siswa
// dari `student_profile_details` (ditarik ulang berdasarkan
// `item.student_id`, sama seperti di HomeVisitModal.js).
//
// ❌ Tidak ada form, tidak ada submit, tidak nulis apapun ke Supabase.
// ❌ Tidak ada konsep "Petugas" (sesuai keputusan proyek).
// TODO: checklist tindak lanjut (tabel `tindaklanjut_homevisits`)
// belum diikutsertakan di sini, nyusul di iterasi berikutnya.
// ============================================================

const HomeVisitDetail = ({ isOpen, item, onClose, darkMode = false }) => {
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ---------- Tarik detail siswa dari `student_profile_details` tiap kali modal dibuka ----------
  useEffect(() => {
    if (!isOpen || !item?.student_id) {
      setStudentProfile(null);
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    supabase
      .from("student_profile_details")
      .select("*")
      .eq("student_id", item.student_id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setStudentProfile(error ? null : data);
        setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, item?.student_id]);

  if (!isOpen || !item) return null;

  // ---------- Style helpers (sama seperti HomeVisitModal.js) ----------
  const cardBg = darkMode ? "bg-gray-800 border-theme" : "bg-theme-bg border-theme";
  const sectionTitle = `text-base font-semibold mb-3 pb-2 border-b ${
    darkMode ? "border-theme text-gray-200" : "border-theme text-theme-secondary"
  }`;

  // ---------- Baris label:value (styling identik dengan card detail siswa di HomeVisitModal.js) ----------
  const Row = ({ label, value }) => (
    <div className="flex text-sm">
      <span className={`w-56 flex-shrink-0 ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}>
        {label}
      </span>
      <span className={`mr-2 flex-shrink-0 ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}>
        :
      </span>
      <span
        className={`font-semibold ${
          value
            ? darkMode
              ? "text-gray-200"
              : "text-theme-secondary"
            : darkMode
              ? "text-theme-secondary"
              : "text-gray-400"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );

  const jk =
    studentProfile?.jenis_kelamin === "L"
      ? "Laki-laki"
      : studentProfile?.jenis_kelamin === "P"
        ? "Perempuan"
        : studentProfile?.jenis_kelamin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-4xl max-h-[92vh] rounded-xl shadow-xl flex flex-col ${cardBg}`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b flex-shrink-0 ${
            darkMode ? "border-theme" : "border-theme"
          }`}
        >
          <h3 className="font-bold text-xl sm:text-2xl">Detail Home Visit</h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-theme-surface text-theme-secondary"
            }`}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-7">
          {/* Section: Data Siswa */}
          <div>
            <p className={sectionTitle}>Data Siswa</p>
            {loadingProfile ? (
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}>
                Memuat data siswa...
              </p>
            ) : (
              <div className="space-y-1.5">
                <Row label="Nama Siswa" value={item.nama_siswa} />
                <Row label="NIS" value={item.nis} />
                <Row label="Kelas" value={item.kelas} />
                <Row
                  label="Tempat, Tanggal Lahir"
                  value={[studentProfile?.tempat_lahir, studentProfile?.tanggal_lahir]
                    .filter(Boolean)
                    .join(", ")}
                />
                <Row label="Jenis Kelamin" value={jk} />
                <Row label="Sekolah Asal" value={studentProfile?.sekolah_asal} />
                <Row label="Nama Ayah" value={studentProfile?.nama_ayah} />
                <Row label="Nama Ibu" value={studentProfile?.nama_ibu} />
                <Row label="No HP Orangtua" value={studentProfile?.no_hp_ortu} />
                <Row label="Alamat" value={studentProfile?.alamat} />
              </div>
            )}
          </div>

          {/* Section: Data Kunjungan & Permasalahan */}
          <div>
            <p className={sectionTitle}>Data Kunjungan & Permasalahan</p>
            <div className="space-y-1.5">
              <Row label="Tanggal Kunjungan" value={item.tanggal_kunjungan} />
              <Row label="Jenis Kunjungan" value={item.jenis_kunjungan} />
              <Row label="Kategori Permasalahan" value={item.kategori_permasalahan} />
              <Row label="Status" value={item.status} />
              <Row label="Alasan Kunjungan" value={item.alasan} />
            </div>
          </div>

          {/* Section: Hasil Kunjungan (tanpa Alamat Kunjungan, sudah ada di Data Siswa) */}
          <div>
            <p className={sectionTitle}>Hasil Kunjungan</p>
            <div className="space-y-1.5">
              <Row label="Nama Pihak yang Ditemui" value={item.nama_pihak_ditemui} />
              <Row label="Hubungan dengan Siswa" value={item.hubungan_pihak_ditemui} />
              <Row label="Kondisi & Informasi" value={item.hasil_kondisi_info} />
              <Row label="Hasil Diskusi" value={item.hasil_diskusi} />
            </div>
          </div>

          {/* Section: Metadata */}
          <div>
            <p className={sectionTitle}>Metadata</p>
            <div className="space-y-1.5">
              <Row label="Dibuat" value={item.created_at} />
              <Row label="Diperbarui" value={item.updated_at} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 px-6 py-5 border-t flex-shrink-0 ${
            darkMode ? "border-theme" : "border-theme"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-3 rounded-lg font-medium text-base transition-colors ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                : "bg-theme-surface hover:bg-gray-200 text-theme-secondary"
            }`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeVisitDetail;
