// src/students/belajar/bahasa-inggris/ChapterList.js
// ========================================================================
// Level 2 fitur Belajar, khusus Bahasa Inggris: daftar chapter.
// Datanya dari ./data/chapterData.js (pindahan dari EasyMateri.js punya
// guru). Chapter yang belum punya soal kuis (belum ada di
// quizQuestionsMap) otomatis ditandain "Segera Hadir" & gak bisa diklik —
// jadi kalau nanti nambah soal Chapter 3 misalnya, chapter itu otomatis
// aktif sendiri, gak perlu ubah logic di sini.
//
// TODO nanti (belum di file ini):
// - Badge "Lagi dipelajari minggu ini" berdasar unit yang lagi diajar
// - Indikator progress siswa per chapter (skor kuis, status selesai)
// ========================================================================
import React from "react";
import { ArrowLeft, Lock, ChevronRight } from "lucide-react";
import { chapterData, quizQuestionsMap } from "./data/chapterData";

export default function ChapterList({
  mapel,
  currentUser,
  onSelectChapter,
  onBack,
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-indigo-600 font-semibold mb-4 hover:gap-3 transition-all">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Pilih Mapel
      </button>

      {/* Header mapel */}
      <div className="bg-theme-bg rounded-2xl shadow-xl p-5 sm:p-6 mb-5 flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mapel.gradient} flex items-center justify-center shadow-md text-3xl shrink-0`}>
          <span>{mapel.icon}</span>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme">
            {mapel.nama}
          </h1>
          <p className="text-sm text-theme-secondary">
            Pilih Chapter Yang Mau Kamu Pelajari
          </p>
        </div>
      </div>

      {/* Daftar chapter */}
      <div className="space-y-3">
        {chapterData.map((chapter) => {
          const isAvailable = Boolean(quizQuestionsMap[chapter.num]);

          return (
            <div
              key={chapter.num}
              onClick={() => isAvailable && onSelectChapter(chapter.num)}
              className={`
                relative overflow-hidden rounded-2xl border border-black/5 shadow-sm
                bg-theme-bg p-4 sm:p-5
                flex items-center gap-4
                transition duration-200
                ${
                  isAvailable
                    ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                    : "opacity-60 cursor-not-allowed"
                }
              `}>
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${chapter.colors.gradient} flex items-center justify-center shadow-md text-2xl shrink-0`}>
                <span>{chapter.icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-theme text-sm sm:text-base">
                    {chapter.title}: {chapter.subtitle}
                  </h3>
                  {!isAvailable && (
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-gray-400 bg-theme-surface px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      Segera Hadir
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-theme-secondary mt-1 line-clamp-2">
                  {chapter.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {chapter.topics.map((topic) => (
                    <span
                      key={topic}
                      className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-theme-surface ${chapter.colors.text}`}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {isAvailable && (
                <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
