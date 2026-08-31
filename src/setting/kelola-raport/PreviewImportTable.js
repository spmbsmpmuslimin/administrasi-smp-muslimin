// setting/kelola-raport/PreviewImportTable.js
// Dipakai di ImportRaportForm.js setelah extract PDF selesai (lihat
// ImportProgress.js untuk step sebelumnya). Nampilin hasil extract per
// siswa dengan StatusBadge (Valid/Perlu Diperiksa/Gagal Dibaca), bisa
// expand row buat cek & koreksi nilai lewat RaportTable (mode editable)
// sebelum admin klik "Simpan Import".
//
// Data belum disimpan ke database di titik ini -- itu ditegaskan juga di
// dokumentasi bag. 4 & 10: admin WAJIB cek preview dulu sebelum data masuk
// ke tabel student_reports/student_report_grades.
//
// siswaList shape: [{ id, name, nis, status: "valid"|"warning"|"failed", grades: [{subject, score}] }]

import React, { useState } from "react";
import { ChevronDown, ChevronUp, X, Eye, EyeOff } from "lucide-react";
import StatusBadge from "./StatusBadge";
import RaportTable from "./RaportTable";

const PreviewImportTable = ({
  siswaList = [],
  onUpdateSiswa,
  onRemoveSiswa,
  onSimpan,
  onBatal,
}) => {
  const [expandedId, setExpandedId] = useState(null);
  // Default cuma nampilin siswa yang bermasalah -- kalau siswa banyak
  // (mis. batch import beberapa kelas) dan yang bermasalah cuma segelintir,
  // admin ga perlu scroll nyari di antara puluhan baris "valid" yang emang
  // ga butuh dicek. Toggle ini buat expand lihat semua siswa kalau perlu
  // (mis. mau spot-check nilai yang valid juga sebelum simpan).
  const [showAll, setShowAll] = useState(false);

  // "Bermasalah" = status non-"valid" ATAU ada issues[] nempel (mis. kasus
  // "NIS kelihatan kayak NISN" -- itu dari parseLegerExcel cuma nambahin
  // ke issues[], status-nya sendiri bisa aja tetep "valid" karena nilai2
  // udah lengkap & konsisten, cuma NIS-nya yang perlu dicek manual). Kalau
  // cuma ngecek status doang, siswa kayak gini ga ke-sort/ke-filter dengan
  // benar walau ada teks kuning "perlu dicek" di bawah namanya.
  const isBermasalah = (s) => s.status !== "valid" || s.issues?.length > 0;

  const jumlahValid = siswaList.filter((s) => !isBermasalah(s)).length;
  const jumlahBermasalah = siswaList.length - jumlahValid;

  // Siswa bermasalah selalu naik ke atas -- independen dari toggle showAll
  // di atas, biar begitu di-expand ke "semua siswa" pun yang perlu dicek
  // tetep ga ketimbun di tengah/bawah daftar panjang. Sort stabil (JS Array
  // .sort udah spec-compliant stable dari ES2019) jadi urutan asli dalam
  // masing2 grup (bermasalah / valid) ga keacak.
  const sortedSiswaList = [...siswaList].sort((a, b) => {
    const aBermasalah = isBermasalah(a) ? 0 : 1;
    const bBermasalah = isBermasalah(b) ? 0 : 1;
    return aBermasalah - bBermasalah;
  });

  const visibleSiswaList =
    showAll || jumlahBermasalah === 0
      ? sortedSiswaList
      : sortedSiswaList.filter(isBermasalah);

  const handleChangeScore = (siswaId, subject, newScore) => {
    const siswa = siswaList.find((s) => s.id === siswaId);
    if (!siswa) return;
    const updatedGrades = siswa.grades.map((g) =>
      g.subject === subject ? { ...g, score: newScore } : g,
    );
    onUpdateSiswa?.(siswaId, { grades: updatedGrades });
  };

  // Konfirmasi dulu sebelum beneran dibuang dari preview -- klik tombol X
  // gak bisa di-undo di UI ini (kalau kepencet gak sengaja, mesti ulang
  // dari upload PDF lagi buat munculin siswa itu ke daftar preview).
  const handleClickRemove = (siswa) => {
    if (
      window.confirm(
        `Buang "${siswa.name}" dari daftar import ini? Siswa ini TIDAK akan disimpan.`,
      )
    ) {
      onRemoveSiswa?.(siswa.id);
    }
  };

  // Sama kayak handleClickRemove, tapi dampaknya lebih gede -- "Batal" itu
  // buang SELURUH batch preview (semua siswa dari semua file leger yang
  // udah di-extract), bukan cuma 1 siswa. Balik ke step upload = harus
  // upload ulang semua file dari awal. Wajib konfirmasi biar ga kepencet
  // ga sengaja.
  const handleClickBatal = () => {
    if (
      window.confirm(
        "Batalkan import ini? Semua data yang sudah di-extract akan hilang dan Anda perlu upload ulang.",
      )
    ) {
      onBatal?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-gray-600 dark:text-gray-300">
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {siswaList.length}
          </span>{" "}
          siswa terdeteksi —{" "}
          <span className="text-emerald-600 dark:text-emerald-400">
            {jumlahValid} valid
          </span>
          {jumlahBermasalah > 0 && (
            <>
              {", "}
              <span className="text-amber-600 dark:text-amber-400">
                {jumlahBermasalah} perlu diperiksa
              </span>
            </>
          )}
        </p>
        {/* Cuma muncul kalau ada campuran valid & bermasalah -- kalau
            semuanya bermasalah atau semuanya valid, toggle ini gak
            ngapa2in (visibleSiswaList udah otomatis nampilin semua). */}
        {jumlahBermasalah > 0 && jumlahValid > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            {showAll ? (
              <>
                <EyeOff size={14} /> Sembunyikan yang valid
              </>
            ) : (
              <>
                <Eye size={14} /> Tampilkan semua ({siswaList.length})
              </>
            )}
          </button>
        )}
      </div>

      <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {visibleSiswaList.map((siswa) => {
          const isExpanded = expandedId === siswa.id;
          return (
            <div key={siswa.id}>
              <div className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : siswa.id)}
                  className="flex-1 flex items-center justify-between gap-3 min-w-0 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-gray-400 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {siswa.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {siswa.nis}
                        {/* Muncul pas batch import (banyak file/kelas
                            sekaligus) -- biar admin masih bisa bedain
                            siswa ini dari kelas mana di daftar campuran. */}
                        {siswa.kelas ? ` · Kelas ${siswa.kelas}` : ""}
                      </p>
                      {/* Alasan spesifik kenapa status-nya "Perlu Diperiksa"
                          -- sebelumnya cuma ada badge tanpa penjelasan,
                          admin harus nebak sendiri padahal nilai yang
                          kelihatan di preview sama aja kayak siswa lain.
                          issues[] datang dari parseLegerExcel.js /
                          extract-raport-pdf. */}
                      {siswa.issues?.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          {siswa.issues.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge type="import" status={siswa.status} />
                </button>
                <button
                  type="button"
                  onClick={() => handleClickRemove(siswa)}
                  title="Buang siswa ini dari daftar import (mis. sudah pernah diimport sebelumnya)"
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50/50 dark:bg-gray-800/30">
                  <RaportTable
                    grades={siswa.grades}
                    editable
                    onChangeScore={(subject, newScore) =>
                      handleChangeScore(siswa.id, subject, newScore)
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleClickBatal}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
          Batal
        </button>
        <button
          onClick={() => onSimpan?.(siswaList)}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors active:scale-95">
          Simpan Import
        </button>
      </div>
    </div>
  );
};

export default PreviewImportTable;
