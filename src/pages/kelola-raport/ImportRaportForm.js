// setting/kelola-raport/ImportRaportForm.js
// Dipanggil sebagai sub-tab dari RaportNilaiTab.js (tab "Import Raport"
// di menu "Nilai Raport"), bukan halaman berdiri sendiri.
// Alur 3 step (state lokal "step"): form -> progress -> preview.
//   1. form     : pilih tahun ajaran/semester/kelas + sumber data (PDF/Excel)
//                 + upload file
//   2. progress : proses ekstraksi. Beda jalur tergantung sumber:
//                 - PDF   : upload ke Storage bucket "raport-pdf", lalu
//                           invoke Edge Function "extract-raport-pdf"
//                           (lihat supabase/functions/extract-raport-pdf/index.ts)
//                 - Excel : diparse LANGSUNG DI BROWSER pakai parseLegerExcel.js
//                           (SheetJS), gak lewat Edge Function -- data leger
//                           udah tabular jadi ga butuh OCR/text-extraction.
//                           File aslinya tetep diupload ke Storage buat arsip
//                           (source_file), tapi itu gak nge-block hasil parse.
//   3. preview  : sub-komponen PreviewImportTable di bawah, buat admin
//                 cek/koreksi sebelum simpan
//
// Simpan Import (di step preview) nge-insert ke tabel student_reports +
// student_report_grades (lihat supabase/migrations/..._create_nilai_raport.sql).
// Siswa dicocokkan ke tabel `students` by NIS -- kalau ga ketemu, tetap
// disimpan (student_id null) sebagai snapshot data dari file yang diimport.
// Bagian ini SUMBER-AGNOSTIC -- siswaList dari PDF maupun Excel punya shape
// yang sama persis, jadi handleSimpan/PreviewImportTable ga perlu tau file
// aslinya PDF atau Excel.
//
// Progress bar step 2 buat PDF ANGKA PERKIRAAN (upload=30%, extract=70%,
// done=100%), bukan progress real dari Edge Function -- Edge Function ga
// stream progress, cuma balikin hasil pas selesai. Buat Excel progress-nya
// juga cuma kosmetik (parsing di browser cepet banget, hampir instan).
//
// Catatan: kolom "Ketidakhadiran" & "Ekstra Kurikuler" yang ada di file
// leger Excel BELUM diimport (lihat komen di parseLegerExcel.js) --
// student_report_grades cuma nyimpen subject+score.
//
// BATCH IMPORT (khusus Excel, ditambahin krn ini jalur yang paling sering
// kepake -- lihat catatan di bawah): admin bisa pilih BANYAK file leger
// sekaligus (mis. leger 7A-7F semester 1 dalam 1x proses), BUKAN cuma 1
// file per proses kayak sebelumnya. Tiap file tetep 1 kelas 1 semester
// (asumsi parseLegerExcel.js gak berubah), tapi kelasnya WAJIB kebaca
// OTOMATIS dari tiap file (baris "KELAS :") -- gak ada lagi field "Kelas"
// manual buat Excel, soalnya di mode batch beda file = beda kelas, gak
// ada 1 nilai global yang masuk akal buat semuanya. Kalau kelas gagal
// kedeteksi di salah satu file, file itu DILEWATIN (bukan bikin batch
// gagal semua) dan namanya muncul di panel notice (bukan toast -- lihat
// state `notices` di bawah) -- file lain yang berhasil tetep lanjut ke
// preview.
// PDF TETAP 1 file per proses (belum diubah ke batch) -- parsing PDF-nya
// sendiri masih "BEST-EFFORT belum ditest ke file asli" (lihat
// supabase/functions/extract-raport-pdf/index.ts), jadi belum pas buat
// digeber banyak sekaligus sebelum itu diverifikasi dulu.
//
// FILE INI GABUNGAN DARI 3 FILE SEBELUMNYA (refactor -- biar gak
// berceceran, ketiganya cuma dipakai di alur Import ini doang):
//   - ImportRaportForm.js   (isi asli file ini)
//   - ImportProgress.js     -> jadi komponen internal <ImportProgress>
//   - PreviewImportTable.js -> jadi komponen internal <PreviewImportTable>
// parseLegerExcel.js SENGAJA TETAP file terpisah (logic parser murni,
// lumayan besar sendiri, dan gampang di-test/dibaca terpisah dari UI-nya).

import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { StatusBadge, RaportTable, useAcademicYears } from "./RaportShared";
import { parseLegerExcel } from "./parseLegerExcel";

const EXCEL_EXTENSIONS = [".xlsx", ".xls"];

// Sama persis kayak yang dipake di StudentRaport.js -- SENGAJA didup,
// bukan di-share dari util bersama, biar dua file ini gampang dibaca
// sendiri-sendiri (dan repo ini emang belum punya folder util bersama).
// Kalau nanti nambah kasus format NIS baru, benerin di DUA tempat ini.
function normalizeNis(nis) {
  return (nis || "").replace(/\D/g, "");
}

function nisVariants(nis) {
  const raw = (nis || "").trim();
  if (!raw) return [];
  const digitsOnly = normalizeNis(raw);
  const variants = new Set([raw]);
  if (digitsOnly) variants.add(digitsOnly);
  if (digitsOnly.length === 9) {
    variants.add(
      `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 4)}.${digitsOnly.slice(4, 6)}.${digitsOnly.slice(6, 9)}`,
    );
  }
  return Array.from(variants);
}

// ============================================================
// ImportProgress (sebelumnya ImportProgress.js)
// Ditampilin selagi proses extract berjalan (step "progress", antara klik
// "Extract & Preview" dan hasilnya siap ditampilin di PreviewImportTable
// di bawah). Murni presentational -- percent & log dikontrol dari
// ImportRaportForm (nanti idealnya di-update dari progress event / polling
// status extract di backend).
// ============================================================

// percent: number (0-100)
// statusText: string -- ringkasan status saat ini, mis. "Membaca 24 dari 36 siswa..."
// log: string[] -- opsional, baris log tambahan (mis. peringatan per siswa)
const ImportProgress = ({ percent = 0, statusText = "Memproses...", log = [] }) => {
  return (
    <div className="py-8 space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{statusText}</span>
      </div>

      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full bg-teal-600 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{percent}%</p>

      {log.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 max-h-32 overflow-y-auto">
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PreviewImportTable (sebelumnya PreviewImportTable.js)
// Ditampilin di step "preview" setelah extract PDF/Excel selesai (lihat
// ImportProgress di atas untuk step sebelumnya). Nampilin hasil extract
// per siswa dengan StatusBadge (Valid/Perlu Diperiksa/Gagal Dibaca), bisa
// expand row buat cek & koreksi nilai lewat RaportTable (mode editable)
// sebelum admin klik "Simpan Import".
//
// Data belum disimpan ke database di titik ini -- itu ditegaskan juga di
// dokumentasi bag. 4 & 10: admin WAJIB cek preview dulu sebelum data masuk
// ke tabel student_reports/student_report_grades.
//
// siswaList shape: [{ id, name, nis, status: "valid"|"warning"|"failed", grades: [{subject, score}] }]
// ============================================================

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

// ============================================================
// ImportRaportForm (komponen utama, di-export default)
// ============================================================

const ImportRaportForm = ({ showToast, onImportSelesai }) => {
  const [step, setStep] = useState("form"); // "form" | "progress" | "preview"
  const [sumber, setSumber] = useState("excel"); // "pdf" | "excel"
  const [tahunAjaran, setTahunAjaran] = useState("");
  const [semester, setSemester] = useState("");
  // Kelas diisi manual (teks bebas), BUKAN dropdown -- tabel `classes` cuma
  // nyimpen kondisi kelas SEKARANG (id ditimpa ulang tiap Transisi Tahun
  // Ajaran), jadi gak reliable buat raport arsip lama. Admin tinggal ketik
  // sesuai yang tertulis di file raport, mis. "7F". Lihat RaportShared.js.
  // Khusus Excel: kalau field ini dikosongin, bakal di-autofill dari nilai
  // "Kelas" yang kebaca di file leger-nya (lihat handleUpload).
  const [kelas, setKelas] = useState("");
  const [file, setFile] = useState(null); // dipakai khusus sumber PDF (single file)
  const [files, setFiles] = useState([]); // dipakai khusus sumber Excel (batch, bisa banyak)
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [siswaList, setSiswaList] = useState([]);
  const [storagePath, setStoragePath] = useState(null);
  // Pesan penting hasil proses import (file dilewati, baris perlu
  // diperiksa, dugaan NISN, dst) -- SENGAJA bukan showToast, soalnya toast
  // ilang sendiri sebelum admin sempat baca lengkap (terutama kalau
  // pesannya panjang / banyak sekaligus pas batch import). Ini nempel di
  // layar sampai admin tutup sendiri per pesan, atau direset pas mulai
  // import baru.
  const [notices, setNotices] = useState([]); // [{ id, type: "warning"|"error", message }]

  const addNotice = (type, message) =>
    setNotices((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        message,
      },
    ]);
  const dismissNotice = (id) =>
    setNotices((prev) => prev.filter((n) => n.id !== id));

  // Ganti sumber -> file yang udah dipilih (kalau ada) kemungkinan besar
  // gak nyambung lagi sama accept filter yang baru, jadi reset.
  const handleGantiSumber = (next) => {
    setSumber(next);
    setFile(null);
    setFiles([]);
  };

  const { years: academicYearsList, loading: loadingYears } =
    useAcademicYears(showToast);

  const handleUploadPdf = async () => {
    setProgress(10);
    setStatusText("Mengupload PDF...");

    // 1. Upload PDF ke Storage bucket "raport-pdf"
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tahunAjaran}/${semester}/${kelas}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("raport-pdf")
      .upload(path, file, { contentType: "application/pdf" });

    if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

    setStoragePath(path);
    setProgress(40);
    setStatusText(`Mengekstrak data raport kelas ${kelas}...`);

    // 2. Invoke Edge Function buat extract & parse teks PDF
    const { data, error: fnError } = await supabase.functions.invoke(
      "extract-raport-pdf",
      { body: { path } },
    );

    if (fnError) throw new Error(`Extract gagal: ${fnError.message}`);
    if (data?.error) throw new Error(data.error);

    setProgress(100);
    setStatusText("Selesai");
    // Tag tiap siswa dengan kelas (dari field form, PDF masih 1 file = 1
    // kelas manual) & sourceFile -- bentuknya disamain sama hasil batch
    // Excel di bawah, biar handleSimpan gak perlu tau siswa ini asalnya
    // dari PDF atau Excel.
    setSiswaList(
      (data.siswaList || []).map((s) => ({ ...s, kelas, sourceFile: path })),
    );
  };

  // Batch: proses banyak file leger sekaligus (mis. 7A-7F semester 1 dalam
  // 1x jalan), satu-satu berurutan (bukan Promise.all -- biar statusText
  // per-file kebaca jelas & gak nge-burst request storage bersamaan).
  // Kelas WAJIB kebaca otomatis dari tiap file -- gak ada override manual
  // global lagi (lihat catatan panjang di atas). File yang kelasnya gagal
  // kedeteksi, gagal diparse sama sekali (format ga cocok), ATAU kelasnya
  // udah kebaca dari file lain SEBELUMNYA di batch yang sama, DILEWATIN
  // -- gak bikin file lain di batch ikut gagal -- dan dikumpulin buat
  // dilaporin di akhir lewat showToast. Deteksi kelas dobel DALAM BATCH ini
  // ditambahin gara2 kasus nyata: file yang sama (atau isinya sama) kepilih
  // 2x pas milih banyak file sekaligus -> siswa yang sama numpuk 2x di
  // `combined` -> pas Simpan, SELURUH batch ketolak DB gara2 unique
  // constraint, dengan pesan generik yang gak jelas apa akar masalahnya.
  // Sekarang dicegat dari sini, per-file, sebelum sempat nyampe ke DB.
  const handleUploadExcel = async () => {
    const total = files.length;
    let combined = [];
    let allWarnings = [];
    const skipped = []; // [{ fileName, reason }]
    // Lacak kelas yang UDAH ketemu di batch ini (normalized: trim + upper +
    // rapatin spasi ganda, biar "7F" / " 7f " / "7  F" dianggep sama) --
    // dipakein buat nyegah 1 kelas keimport dobel dalam 1x proses batch
    // (mis. file yang sama kepilih 2x, atau ada 2 file beda nama tapi
    // isinya kelas yang sama). Kalau ini kelewat, DB bakal nolak SEMUA
    // insert di step Simpan (bukan cuma yang dobel) gara2 unique constraint
    // (student_nis, class_name, academic_year, semester) -- errornya jadi
    // generik & baru ketauan di ujung proses, padahal akar masalahnya
    // sesimpel salah pilih file. Dicegat di sini biar ketauan dari awal,
    // per-file, dengan pesan yang jelas nyebut file mana yang jadi
    // sumber pertamanya.
    const seenKelas = new Map(); // kelas ternormalisasi -> nama file pertama

    for (let i = 0; i < total; i++) {
      const f = files[i];
      setStatusText(`Membaca file ${i + 1} dari ${total}: ${f.name}...`);
      setProgress(Math.round((i / total) * 70));

      let parsed;
      try {
        parsed = await parseLegerExcel(f);
      } catch (err) {
        skipped.push({ fileName: f.name, reason: err.message });
        continue;
      }

      const { siswaList: parsedSiswa, detectedKelas, warnings } = parsed;

      if (!detectedKelas) {
        skipped.push({
          fileName: f.name,
          reason:
            'Kelas gak kebaca otomatis dari file ini (cek baris "KELAS :" di leger-nya).',
        });
        continue;
      }

      const normalizedKelas = detectedKelas
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");
      if (seenKelas.has(normalizedKelas)) {
        skipped.push({
          fileName: f.name,
          reason: `Kelas "${detectedKelas}" sudah kebaca dari file "${seenKelas.get(normalizedKelas)}" di batch ini -- dilewati biar gak keimport dobel (mis. file yang sama kepilih 2x).`,
        });
        continue;
      }
      seenKelas.set(normalizedKelas, f.name);

      // Upload file asli ke Storage buat arsip/source_file per file --
      // sama kayak flow PDF, kalau gagal upload tetep lanjut (data hasil
      // parse udah ada di tangan, jangan sampai gagal cuma gara2 arsip).
      setStatusText(`Mengarsipkan ${f.name}...`);
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${tahunAjaran}/${semester}/${detectedKelas}/${Date.now()}_${i}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("raport-pdf")
        .upload(path, f, {
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      if (uploadError) console.error(uploadError);

      combined = combined.concat(
        parsedSiswa.map((s) => ({
          ...s,
          // Prefix id pakai kode kelas biar gak tabrakan antar file kalau
          // ada 2 siswa dari kelas beda yang kebetulan sama-sama NIS
          // kosong (fallback id-nya "row-N", N bisa sama di file lain).
          id: `${detectedKelas}-${s.id}`,
          kelas: detectedKelas,
          sourceFile: uploadError ? null : path,
        })),
      );
      allWarnings = allWarnings.concat(
        warnings.map((w) => `[${detectedKelas}] ${w}`),
      );
      setProgress(Math.round(((i + 1) / total) * 70));
    }

    // Jaring pengaman TERAKHIR: dedup berdasarkan `id` (kelas+NIS) di
    // SELURUH `combined` gabungan, TERLEPAS dari sumbernya dari file mana.
    // Beda sama pengecekan "kelas dobel" di atas (yang cuma nyegat kalau 2
    // FILE BEDA punya kelas yang sama) -- ini nyegat kasus siswa yang
    // ke-tulis 2x DI DALAM 1 file yang sama (mis. baris ke-copy paste
    // dobel gak sengaja pas admin sekolah nyusun legernya). Tanpa ini,
    // baris kembar tetep lolos ke database & bikin SELURUH batch ketolak
    // constraint (student_nis, class_name, academic_year, semester),
    // walau kelasnya sendiri cuma dari 1 file.
    const seenSiswaId = new Set();
    const dedupedCombined = [];
    const duplicateSiswa = [];
    for (const s of combined) {
      if (seenSiswaId.has(s.id)) {
        duplicateSiswa.push(s);
        continue;
      }
      seenSiswaId.add(s.id);
      dedupedCombined.push(s);
    }
    combined = dedupedCombined;
    if (duplicateSiswa.length > 0) {
      addNotice(
        "warning",
        `${duplicateSiswa.length} baris siswa terdeteksi dobel persis (NIS & kelas sama) dan otomatis di-skip -- cek file aslinya, kemungkinan ada baris ke-copy dobel: ${duplicateSiswa.map((s) => `${s.name} (${s.nis})`).join(", ")}.`,
      );
    }

    if (combined.length === 0) {
      throw new Error(
        `Semua file gagal diproses:\n${skipped
          .map((s) => `- ${s.fileName}: ${s.reason}`)
          .join("\n")}`,
      );
    }

    if (skipped.length > 0) {
      skipped.forEach((s) =>
        addNotice("warning", `File "${s.fileName}" dilewati — ${s.reason}`),
      );
    }
    if (allWarnings.length > 0) {
      // Detail spesifik (siapa & kenapa) udah nempel langsung di tiap baris
      // siswa di preview (lihat siswa.issues, ditandain dgn teks kuning di
      // bawah nama + border kuning di kolom nilai yang kosong) -- notice
      // ini cuma pengingat singkat buat scroll & cek, BUKAN daftar lengkap
      // lagi (dulu di sini cuma angka doang tanpa nama, gak jelas mana yang
      // dicek).
      addNotice(
        "warning",
        `${allWarnings.length} baris perlu diperiksa manual. Lihat teks kuning di bawah nama tiap siswa di daftar bawah buat tau siapa & kenapa (mis. nilai kosong, atau NIS tidak terbaca).`,
      );
    }

    // FIX 30 Agustus 2026: NIS di tabel `students` itu NIS LOKAL sekolah
    // (pola "25.26.07.079", 9 digit tahunajaran.tahunajaran.kelas.urutan).
    // Kolom di leger Excel judulnya "NISN" (lihat komen di atas), yang
    // kalau kebaca APA ADANYA itu NOMOR INDUK SISWA NASIONAL (10 digit,
    // mis. "3137255819") -- ID BEDA SAMA SEKALI, gak bisa saling diturunin.
    // Kalau ini kejadian, siswa gak akan pernah kesambung ke akunnya
    // (student_id bakal null selamanya) walau raportnya di-publish. Ini
    // ketauan dari kasus nyata: leger semester 1 kepake NISN, leger
    // semester 2 kepake NIS lokal, buat siswa yang sama. Warning ini
    // heuristik doang (nebak dari panjang digit), BUKAN validasi pasti --
    // tetep bisa di-skip admin kalau emang false positive.
    const looksLikeNisn = combined.filter((s) => {
      const digits = (s.nis || "").replace(/\D/g, "");
      return digits.length === 10;
    });
    if (looksLikeNisn.length > 0) {
      addNotice(
        "warning",
        `${looksLikeNisn.length} siswa NIS-nya 10 digit polos — kemungkinan itu NISN (nomor nasional), BUKAN NIS lokal sekolah (polanya "25.26.07.079"). Kalau bener, siswa-siswa ini gak akan kesambung ke akunnya sendiri walau raport-nya dipublish. Cek dulu kolom di file leger sebelum lanjut simpan.`,
      );
    }

    setProgress(100);
    setStatusText("Selesai");
    setSiswaList(combined);
  };

  const handleUpload = async () => {
    const fileLabel = sumber === "pdf" ? "file PDF" : "file Excel";
    const fileMissing = sumber === "pdf" ? !file : files.length === 0;
    if (
      !tahunAjaran ||
      !semester ||
      fileMissing ||
      (sumber === "pdf" && !kelas)
    ) {
      showToast?.(
        `Lengkapi tahun ajaran, semester${sumber === "pdf" ? ", kelas," : ""} dan ${fileLabel} dulu`,
        "error",
      );
      return;
    }

    setStep("progress");
    setNotices([]); // mulai proses baru -- buang pesan dari proses sebelumnya

    try {
      if (sumber === "pdf") {
        await handleUploadPdf();
      } else {
        await handleUploadExcel();
      }
      setStep("preview");
    } catch (err) {
      console.error(err);
      addNotice("error", err.message || `Gagal memproses ${fileLabel}`);
      showToast?.(err.message || `Gagal memproses ${fileLabel}`, "error");
      setStep("form");
    }
  };

  const handleUpdateSiswa = (id, updates) => {
    setSiswaList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  // Buang 1 siswa dari daftar preview SEBELUM disimpan -- dipakai kalau
  // ternyata ada siswa yang udah pernah diimport sebelumnya (bakal nabrak
  // unique constraint & bikin SELURUH batch insert gagal, bukan cuma
  // siswa itu doang -- lihat catatan di handleSimpan). Cukup filter state
  // lokal, gak nyentuh database sama sekali.
  const handleRemoveSiswa = (id) => {
    setSiswaList((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSimpan = async (finalList) => {
    try {
      // 0. Cek calon duplikat: nama yang SAMA persis dengan raport yang
      // SUDAH ADA di tahun ajaran & semester ini, tapi NIS-nya BEDA.
      // Ini penyebab kasus kayak "ADRIANSYAH RAMADANI" ke-import dobel --
      // NIS di file semester 2 beda format sama NIS di semester 1 (satu
      // "3137255819", satu lagi "25.26.07.203"), jadi dianggep 2 siswa
      // beda padahal orangnya sama (unique constraint di DB cuma ngecek
      // NIS yang PERSIS SAMA, jadi ga kesentuh). Ini WARNING aja yang bisa
      // di-skip admin (bukan block keras) -- soalnya bisa aja emang 2
      // siswa beda kebetulan namanya sama.
      const { data: existingSameSemester, error: checkError } = await supabase
        .from("student_reports")
        .select("student_name, student_nis")
        .eq("academic_year", tahunAjaran)
        .eq("semester", Number(semester));
      if (checkError) throw checkError;

      const normName = (n) =>
        (n || "").trim().toUpperCase().replace(/\s+/g, " ");
      const potentialDup = finalList.filter((s) => {
        const nameUp = normName(s.name);
        return (existingSameSemester || []).some(
          (e) => normName(e.student_name) === nameUp && e.student_nis !== s.nis,
        );
      });

      if (potentialDup.length > 0) {
        const daftar = potentialDup
          .map((s) => `- ${s.name} (NIS di file ini: ${s.nis || "(kosong)"})`)
          .join("\n");
        const lanjut = window.confirm(
          `${potentialDup.length} siswa punya nama sama dengan raport yang UDAH ADA di ${tahunAjaran} semester ${semester}, tapi NIS-nya BEDA -- kemungkinan siswa yang sama tapi NIS-nya beda format/salah baca, dan bakal ke-import sebagai baris DUPLIKAT kalau dilanjut:\n\n${daftar}\n\nSaran: cek dulu NIS aslinya di tab Manajemen Nilai. Tetap lanjut simpan?`,
        );
        if (!lanjut) {
          showToast?.("Import dibatalkan", "info");
          return;
        }
      }

      // 1. Cocokkan NIS ke tabel `students` (kalau ada) -- best-effort, kalau
      //    ga ketemu tetap disimpan dengan student_id null (snapshot dari PDF).
      //    FIX 30 Agustus 2026: sebelumnya cocokin exact-string doang, jadi
      //    kalau NIS di file leger formatnya beda (dotted vs digit polos --
      //    liat catatan di atas soal kasus Adriansyah), student_id KETINGGALAN
      //    null, dan raportnya jadi gak pernah muncul di halaman siswa
      //    walau udah dipublish (liat StudentRaport.js). Sekarang nyoba
      //    beberapa kandidat format NIS dulu buat query-nya, terus final
      //    matching-nya pakai NIS yang dinormalisasi (angka doang) biar
      //    "25.26.07.203" ketemu sama "252607203".
      const nisList = finalList.map((s) => s.nis).filter(Boolean);
      const allVariants = Array.from(
        new Set(nisList.flatMap((n) => nisVariants(n))),
      );
      const { data: matchedStudents } = await supabase
        .from("students")
        .select("id, nis")
        .in("nis", allVariants.length > 0 ? allVariants : nisList);

      const normalizedToStudentId = new Map(
        (matchedStudents || []).map((s) => [normalizeNis(s.nis), s.id]),
      );
      const nisToStudentId = new Map(
        finalList.map((s) => [
          s.nis,
          normalizedToStudentId.get(normalizeNis(s.nis)),
        ]),
      );

      // 2. Insert ke student_reports
      // class_name & source_file diambil PER SISWA (s.kelas / s.sourceFile,
      // ditandain pas proses extract/parse -- lihat handleUploadPdf &
      // handleUploadExcel) -- BUKAN dari field form global `kelas`/
      // `storagePath` lagi, soalnya satu batch sekarang bisa nyampur
      // banyak kelas & banyak file arsip sekaligus (import banyak leger
      // sekaligus). Fallback ke `kelas`/`storagePath` form tetep dijaga
      // buat jaga-jaga kalau ada siswa yang somehow gak ke-tag (harusnya
      // gak kejadian di alur normal).
      const reportsPayload = finalList.map((s) => ({
        student_id: nisToStudentId.get(s.nis) || null,
        student_name: s.name,
        student_nis: s.nis,
        class_name: s.kelas || kelas,
        academic_year: tahunAjaran,
        semester: Number(semester),
        status: "draft",
        source_file: s.sourceFile || storagePath,
      }));

      const { data: insertedReports, error: insertError } = await supabase
        .from("student_reports")
        .insert(reportsPayload)
        .select("id, student_nis");

      if (insertError) {
        // Kemungkinan besar kena unique constraint (duplikat import)
        throw new Error(
          insertError.message.includes("duplicate")
            ? "Sebagian siswa sudah pernah diimport untuk semester & tahun ajaran ini."
            : insertError.message,
        );
      }

      // 3. Insert nilai per mapel, di-map balik ke report_id masing-masing siswa
      const nisToReportId = new Map(
        insertedReports.map((r) => [r.student_nis, r.id]),
      );
      const gradesPayload = finalList.flatMap((s) =>
        s.grades.map((g) => ({
          report_id: nisToReportId.get(s.nis),
          subject: g.subject,
          score: g.score,
        })),
      );

      const { error: gradesError } = await supabase
        .from("student_report_grades")
        .insert(gradesPayload);
      if (gradesError) throw new Error(gradesError.message);

      showToast?.(`${finalList.length} raport berhasil diimport`, "success");
      onImportSelesai?.();
    } catch (err) {
      console.error(err);
      // Dulu cuma lewat showToast (ilang sendiri sebelum sempat kebaca
      // lengkap, apalagi kalau pesannya panjang) -- sekarang nempel juga di
      // noticePanel (sama kayak warning hasil parse) biar admin bisa baca
      // & tutup sendiri kalau udah selesai nindaklanjutin.
      const message = err.message || "Gagal menyimpan data raport";
      addNotice("error", message);
      showToast?.(message, "error");
    }
  };

  const handleBatal = () => {
    setStep("form");
    setSiswaList([]);
    setFile(null);
    setFiles([]);
    setNotices([]);
  };

  if (step === "progress") {
    return <ImportProgress percent={progress} statusText={statusText} />;
  }

  // Panel notice -- nempel di layar (gak kayak showToast yang ilang
  // sendiri), tiap pesan bisa ditutup satu-satu pas admin udah selesai
  // baca/nindaklanjutin. Dipasang di atas step "preview" (hasil proses
  // import) MAUPUN "form" (kalau gagal total & balik ke form).
  const noticePanel = notices.length > 0 && (
    <div className="space-y-2">
      {notices.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm ${
            n.type === "error"
              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
          }`}>
          <span className="flex-1 whitespace-pre-line">{n.message}</span>
          <button
            type="button"
            onClick={() => dismissNotice(n.id)}
            title="Tutup pesan ini"
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );

  if (step === "preview") {
    return (
      <div className="space-y-4">
        {noticePanel}
        {/* Banner konfirmasi tahun ajaran & semester -- ditambahin gara2
            kasus nyata: field `tahunAjaran`/`semester` GAK di-reset abis
            Simpan sukses (lihat handleSimpan/handleBatal), jadi kalau admin
            lanjut import batch berikutnya tanpa sadar dropdown-nya masih
            nyangkut dari sesi sebelumnya, data bisa numpuk ke semester yang
            SALAH. Constraint DB nolak kalau kebetulan combo NIS+kelas+tahun
            ajaran+semester-nya udah ada, tapi kalau semesternya kosong/beda
            & belum ada datanya, DB gak akan protes -- makanya perlu
            dikonfirmasi visual di sini SEBELUM klik "Simpan Import", bukan
            cuma mengandalkan error dari DB pas kepentok.
            Sengaja bukan checkbox/dropdown lagi di sini (biar preview tetep
            fokus ke data siswa) -- kalau ternyata SALAH, tinggal klik
            "Batal" & balik ke form buat benerin tahun ajaran/semesternya. */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-sm text-teal-800 dark:text-teal-300">
          <span>
            Data di bawah akan disimpan ke{" "}
            <span className="font-semibold">
              Tahun Ajaran {tahunAjaran || "(belum dipilih)"}
            </span>
            , Semester{" "}
            <span className="font-semibold">
              {semester === "1"
                ? "1 (Ganjil)"
                : semester === "2"
                  ? "2 (Genap)"
                  : "(belum dipilih)"}
            </span>
            . Salah pilih? Klik "Batal" di bawah, lalu perbaiki di form.
          </span>
        </div>
        <PreviewImportTable
          siswaList={siswaList}
          onUpdateSiswa={handleUpdateSiswa}
          onRemoveSiswa={handleRemoveSiswa}
          onSimpan={handleSimpan}
          onBatal={handleBatal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {noticePanel}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Sumber Data
        </label>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => handleGantiSumber("excel")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              sumber === "excel"
                ? "bg-teal-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}>
            File Excel (Leger)
          </button>
          <button
            type="button"
            onClick={() => handleGantiSumber("pdf")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${
              sumber === "pdf"
                ? "bg-teal-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}>
            File PDF
          </button>
        </div>
        {sumber === "excel" && (
          <p className="text-xs text-gray-400 mt-1.5">
            Format leger: kolom NO, NAMA SISWA, NISN, lalu nilai per mapel,
            dengan blok "KETERANGAN MAPEL" di bagian bawah. Bisa pilih BANYAK
            file leger sekaligus (mis. 7A-7F semester ini barengan) -- kelas
            tiap file dibaca otomatis, jadi gak perlu diisi manual satu-satu.
          </p>
        )}
      </div>

      <div
        className={`grid grid-cols-1 ${sumber === "pdf" ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Tahun Ajaran
          </label>
          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            disabled={loadingYears}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 disabled:opacity-60">
            <option value="">
              {loadingYears ? "Memuat..." : "Pilih tahun ajaran"}
            </option>
            {academicYearsList.map((ta) => (
              <option key={ta} value={ta}>
                {ta}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Semester
          </label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
            <option value="">Pilih semester</option>
            <option value="1">Semester 1 (Ganjil)</option>
            <option value="2">Semester 2 (Genap)</option>
          </select>
        </div>

        {/* Kelas cuma buat PDF (masih 1 file = 1 kelas, diisi manual).
            Buat Excel udah gak ada field ini lagi -- kelas dibaca otomatis
            per file di handleUploadExcel, soalnya 1 batch bisa nyampur
            banyak kelas sekaligus, gak ada 1 nilai global yang cocok. */}
        {sumber === "pdf" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Kelas
            </label>
            <input
              type="text"
              value={kelas}
              onChange={(e) => setKelas(e.target.value.toUpperCase())}
              placeholder="Contoh: 7F"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
            />
            <p className="text-xs text-gray-400 mt-1">
              Isi sesuai kelas yang tertulis di PDF raport saat itu.
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {sumber === "pdf"
            ? "File PDF Raport (satu kelas)"
            : "File Excel Leger (bisa pilih banyak kelas sekaligus)"}
        </label>
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-10 cursor-pointer hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
          <UploadCloud className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          {sumber === "pdf" ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {file ? (
                <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <FileText size={16} /> {file.name}
                </span>
              ) : (
                "Klik untuk upload PDF, atau drag & drop"
              )}
            </span>
          ) : files.length > 0 ? (
            <div className="w-full px-6 text-sm text-gray-700 dark:text-gray-200 space-y-1">
              <p className="font-medium text-center mb-2">
                {files.length} file dipilih
              </p>
              <ul className="max-h-32 overflow-y-auto space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 truncate">
                    <FileText size={14} className="shrink-0 text-gray-400" />
                    <span className="truncate">{f.name}</span>
                  </li>
                ))}
              </ul>
              <p className="text-center text-xs text-gray-400 pt-1">
                Klik untuk ganti pilihan file
              </p>
            </div>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Klik untuk upload Excel (.xlsx/.xls), bisa pilih banyak file
              sekaligus, atau drag & drop
            </span>
          )}
          <input
            type="file"
            multiple={sumber === "excel"}
            accept={
              sumber === "pdf" ? "application/pdf" : EXCEL_EXTENSIONS.join(",")
            }
            className="hidden"
            onChange={(e) => {
              if (sumber === "pdf") {
                setFile(e.target.files?.[0] || null);
              } else {
                setFiles(Array.from(e.target.files || []));
              }
            }}
          />
        </label>
      </div>

      <button
        onClick={handleUpload}
        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors active:scale-95">
        Extract & Preview
      </button>
    </div>
  );
};

export default ImportRaportForm;
