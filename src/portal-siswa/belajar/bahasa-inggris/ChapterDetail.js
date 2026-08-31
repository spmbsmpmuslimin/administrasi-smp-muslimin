// src/students/belajar/bahasa-inggris/ChapterDetail.js
// ========================================================================
// ChapterDetail KHUSUS mapel Bahasa Inggris. PLACEHOLDER SEMENTARA.
//
// Versi aslinya nanti bakal reuse struktur tab Theory/Examples/Practice/
// Quiz yang udah ada di EasyMateri.js, tapi:
// - Tanpa toolbar "Mode Presentasi" / Fullscreen (itu punya guru)
// - Submit kuis nyimpen hasil ke Supabase (progress_siswa), bukan cuma
//   useState lokal yang ilang pas refresh
// - Penilaian jawaban dicek server-side, bukan dicocokin ke kunci jawaban
//   yang nempel di bundle frontend
// ========================================================================
import React from "react";
import { ArrowLeft, Construction } from "lucide-react";
import { chapterData } from "./data/chapterData";

export default function ChapterDetail({
  mapel,
  chapterNum,
  currentUser,
  onBack,
}) {
  const chapter = chapterData.find((c) => c.num === chapterNum);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-indigo-600 font-semibold mb-4 hover:gap-3 transition-all">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Chapter
      </button>

      <div className="bg-theme-bg rounded-2xl shadow-xl p-8 text-center">
        <h2 className="text-xl font-bold text-theme mb-1">
          {chapter
            ? `${chapter.title}: ${chapter.subtitle}`
            : `Chapter ${chapterNum}`}
        </h2>
        <div className="flex items-center justify-center gap-2 text-gray-400 mt-4">
          <Construction className="w-4 h-4" />
          <p className="text-sm">
            Tab Theory / Examples / Practice / Quiz-nya nyusul, lagi dipindah
            dari EasyMateri.js.
          </p>
        </div>
      </div>
    </div>
  );
}
