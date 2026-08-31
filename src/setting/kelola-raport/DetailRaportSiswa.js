// setting/kelola-raport/DetailRaportSiswa.js
// Dipanggil dari ManajemenRaportTable.js pas admin klik satu baris siswa.
// Nampilin detail satu raport (bukan hasil extract mentah kayak
// PreviewImportTable.js, ini data yang UDAH tersimpan di database) --
// bisa edit nilai lewat RaportTable, dan toggle status Draft <-> Published
// lewat StatusBadge + tombol publish.
//
// onSave & onTogglePublish dikasih dari ManajemenRaportTable.js dan udah
// nyambung ke Supabase beneran (update student_report_grades /
// student_reports) -- komponen ini sendiri ga tau soal Supabase, cuma
// manggil prop & nunggu hasilnya.
//
// Dokumentasi terkait bag. 7: status Draft belum bisa dilihat siswa di
// Portal Siswa, status Published baru muncul di sana.
//
// siswa shape: { id, name, nis, kelas, tahunAjaran, semester, status: "draft"|"published", grades: [{subject, score}] }

import React, { useState } from "react";
import { ArrowLeft, Save, Globe, FileEdit } from "lucide-react";
import StatusBadge from "./StatusBadge";
import RaportTable from "./RaportTable";

const DetailRaportSiswa = ({ siswa, onBack, onSave, onTogglePublish }) => {
  const [grades, setGrades] = useState(siswa?.grades || []);
  const [isDirty, setIsDirty] = useState(false);

  if (!siswa) return null;

  const handleChangeScore = (subject, newScore) => {
    setGrades((prev) => prev.map((g) => (g.subject === subject ? { ...g, score: newScore } : g)));
    setIsDirty(true);
  };

  const handleSave = async () => {
    const success = await onSave?.(siswa.id, grades);
    if (success) setIsDirty(false);
    // Toast sukses/gagal udah ditangani parent (ManajemenRaportTable.js),
    // biar single source of truth soal hasil save yang sebenernya.
  };

  const handleTogglePublish = () => {
    const next = siswa.status === "published" ? "draft" : "published";
    onTogglePublish?.(siswa.id, next);
  };

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft size={16} />
        Kembali ke daftar
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{siswa.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {siswa.nis} · Kelas {siswa.kelas} · {siswa.tahunAjaran} · Semester {siswa.semester}
          </p>
        </div>
        <StatusBadge type="publish" status={siswa.status} />
      </div>

      <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
        <RaportTable grades={grades} editable onChangeScore={handleChangeScore} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors active:scale-95"
        >
          <Save size={16} />
          Simpan Perubahan
        </button>

        <button
          onClick={handleTogglePublish}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors active:scale-95"
        >
          {siswa.status === "published" ? (
            <>
              <FileEdit size={16} />
              Set ke Draft
            </>
          ) : (
            <>
              <Globe size={16} />
              Publish
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DetailRaportSiswa;
