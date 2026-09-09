// setting/kelola-raport/RekapKelulusan.js
// Tab baru khusus buat proses kelulusan kelas 9: rekap nilai semester 1-6
// per siswa, nilai per mapel bisa diedit LANGSUNG (klik, ubah, otomatis
// tersimpan ke database) -- dipakai TU pas ada siswa yang nilainya kurang
// tapi diputuskan tetap diluluskan, tinggal koreksi angkanya di sini.
//
// INPUT DARI KOSONG (bukan cuma edit): alur riil di lapangan, TU ngumpulin
// fotokopi raport kelas 9 semester 1-5 (semester 6 masih jalan), terus
// nginput manual PER SISWA PER SEMESTER -- mapel tiap semester bisa
// beda2. Makanya tabel di bawah BUKAN cuma nampilin mapel yang udah ada
// datanya: ada tombol "+ Tambah Mapel" (nambah kolom kosong buat semester
// yang lagi dipilih) dan tiap sel kosong ("--") itu TETAP BISA DIKLIK buat
// diisi nilai baru -- bukan cuma dekorasi kayak sebelumnya. Ngetik nilai
// di sel yang belum ada datanya bakal BIKIN student_reports baru
// (kalau siswa itu belum punya report utk semester ini) sekaligus
// student_report_grades-nya, pake "Tahun Ajaran" yang diisi TU di field
// deket tab semester (WAJIB diisi dulu sebelum bisa nambah data baru --
// gak bisa ditebak otomatis kalau semester itu belum ada 1 pun data).
// SENGAJA gak ada penguncian kolom yang datanya udah ada vs yang masih
// kosong (kesepakatan: gampang dipakai, tapi risikonya nilai yang ada bisa
// ketimpa kalau TU salah klik sel yang salah -- kolom "Rata-Rata" & baris
// per siswa tetap ngebantu ngecek sekilas sebelum nyimpen).
//
// BEDA PENTING dari RekapMultiSemester.js: di sana filter kelas nempel ke
// `student_reports.class_name` (kelas WAKTU raport itu dibuat -- misal 7F,
// 8F, beda tiap semester). Di sini kelas yang dipake adalah kelas SISWA
// SAAT INI (dari tabel `students.class_id`, misal "9F"), lalu histori
// nilainya ditarik pake NIS -- BUKAN class_name -- biar semester 1-4 yang
// dulu class_name-nya masih "7F"/"8F" tetep ikut ke-tarik. Kalau query di
// sini ikut-ikutan filter class_name kayak RekapMultiSemester, cuma
// semester 5 (kelas 9) yang muncul, semester 1-4 ilang -- itu bug yang
// harus dihindari. Konsekuensinya: pas BIKIN report baru dari sini,
// class_name-nya SENGAJA dikosongin (null) -- gak masuk akal make kelas
// SAAT INI (9F) buat raport semester 1 yang kelasnya dulu 7F. Kalau nama
// kelas historis itu penting, edit belakangan lewat Manajemen Nilai
// (ManajemenRaportTable.js) yang emang punya field class_name manual.
//
// PENTING: edit nilai di sini langsung UPDATE ke student_report_grades
// (data raport asli), bukan nyimpen di tabel/kolom koreksi terpisah --
// jadi begitu diedit, nilai raport aslinya ketimpa permanen. Ini keputusan
// sadar (biar simpel, sesuai requirement), bukan bug -- tapi berarti gak
// ada jejak "nilai asli vs nilai setelah dikoreksi" kalau suatu saat perlu
// diaudit balik.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { StatusBadge } from "./RaportShared";

const SEMESTER_LIST = [1, 2, 3, 4, 5, 6];

// Fallback kalau mapel belum diisi KKM-nya di halaman "KKM dan Kelulusan"
// (KelolaKKM.js) -- samain angkanya sama KKM_FALLBACK di sana.
const KKM_FALLBACK_DEFAULT = 75;

// Bobot Nilai Akhir kelulusan = (BOBOT_NR x rata-rata NR) + (BOBOT_NASAJ x NASAJ)
// PLACEHOLDER SEMENTARA -- diambil dari salah satu varian umum yang dipakai
// sekolah lain (referensi dokumen MKKS SMP Kab. Sragen: 50:50 / 60:40 / 70:30
// NR:NASAJ, sesuai Permendikbudristek No. 21/2022). Belum dikonfirmasi ke
// sekolah ini persisnya berapa -- gampang diganti, tinggal ubah 2 angka ini.
const BOBOT_NR = 0.6;
const BOBOT_NASAJ = 0.4;

const RekapKelulusan = ({ showToast }) => {
  const [kelasList, setKelasList] = useState([]);
  const [kelas, setKelas] = useState("");
  const [semester, setSemester] = useState(1);
  const [isLoadingKelas, setIsLoadingKelas] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState([]); // [{ nis, studentId, name, gradesBySemester: { [sem]: [{id, subject, score}] }, reportMetaBySemester: { [sem]: {id, academicYear} } }]
  const [savingId, setSavingId] = useState(null); // grade id ATAU cellKey (nis-subject) yg lagi proses simpan

  // Kolom mapel "virtual" yang ditambahin manual oleh TU buat semester yang
  // lagi dipilih (belum tentu ada datanya di database sama sekali) --
  // digabung ke union mapel di `subjects` di bawah. Direset tiap ganti
  // kelas (sesi input baru).
  const [manualSubjectsBySemester, setManualSubjectsBySemester] = useState({});
  const [inputMapelBaru, setInputMapelBaru] = useState("");

  // Tahun ajaran yang dipakai TU buat BIKIN data baru (bukan buat filter)
  // di semester yang lagi dipilih -- WAJIB diisi dulu sebelum bisa nambah
  // nilai baru ke semester yang belum ada 1 pun datanya. Kalau semester itu
  // udah ada datanya, di-prefill otomatis dari data yang ada (lihat effect
  // di bawah fetchData).
  const [academicYearInputBySemester, setAcademicYearInputBySemester] = useState({});

  // NASAJ (Nilai Ujian Sekolah) per siswa -- SEMENTARA cuma disimpen di
  // memori browser (state), BUKAN ke database, karena belum ada tabel
  // buat nyimpen NASAJ permanen. Ke-reset kalau ganti kelas / refresh
  // halaman. { [nis]: number }
  const [nasajByNis, setNasajByNis] = useState({});

  // KKM per mapel & batas minimum Nilai Akhir -- diisi TU di tab "KKM dan
  // Kelulusan" (KelolaKKM.js), dipake di sini buat nentuin status
  // Lulus/Tidak Lulus. Fetch sekali di awal, independen dari pilihan
  // kelas (settingan ini global, bukan per-kelas).
  const [kkmMap, setKkmMap] = useState({}); // { [mataPelajaran]: number }
  const [nilaiAkhirMinimum, setNilaiAkhirMinimum] = useState(null);

  useEffect(() => {
    const fetchKriteriaKelulusan = async () => {
      try {
        const [{ data: kkmRows, error: kkmErr }, { data: configRow, error: configErr }] =
          await Promise.all([
            supabase.from("kkm_mapel").select("mata_pelajaran, kkm"),
            supabase
              .from("kelulusan_config")
              .select("nilai_akhir_minimum")
              .eq("id", 1)
              .maybeSingle(),
          ]);
        if (kkmErr) throw kkmErr;
        if (configErr) throw configErr;

        const map = {};
        (kkmRows || []).forEach((r) => {
          map[r.mata_pelajaran] = Number(r.kkm);
        });
        setKkmMap(map);
        setNilaiAkhirMinimum(configRow ? Number(configRow.nilai_akhir_minimum) : null);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat kriteria kelulusan (KKM/batas Nilai Akhir)", "error");
      }
    };
    fetchKriteriaKelulusan();
  }, [showToast]);

  // Daftar kelas 9 yang aktif SEKARANG (bukan dari histori raport)
  useEffect(() => {
    const fetchKelasList = async () => {
      setIsLoadingKelas(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("class_id")
          .eq("is_active", true)
          .ilike("class_id", "9%");
        if (error) throw error;
        const unique = Array.from(new Set((data || []).map((d) => d.class_id))).sort();
        setKelasList(unique);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat daftar kelas 9", "error");
      } finally {
        setIsLoadingKelas(false);
      }
    };
    fetchKelasList();
  }, [showToast]);

  const fetchData = useCallback(async () => {
    setNasajByNis({}); // ganti kelas -> NASAJ in-memory yang lama gak relevan lagi
    setManualSubjectsBySemester({}); // sesi input mapel baru direset per kelas
    setAcademicYearInputBySemester({});
    if (!kelas) {
      setStudents([]);
      return;
    }
    setIsLoading(true);
    try {
      // 1. Roster kelas 9 SAAT INI
      const { data: roster, error: rosterErr } = await supabase
        .from("students")
        .select("id, nis, full_name")
        .eq("class_id", kelas)
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (rosterErr) throw rosterErr;

      const nisList = (roster || []).map((r) => r.nis);
      if (nisList.length === 0) {
        setStudents([]);
        return;
      }

      // 2. SEMUA histori nilai NIS-NIS itu, semester 1-6, TANPA filter
      // class_name -- sengaja, lihat catatan di atas file. `id` &
      // `academic_year` diambil juga (bukan cuma dulu student_nis/semester)
      // -- dibutuhin buat nentuin report_id yang mau di-UPDATE nilainya,
      // dan buat prefill "Tahun Ajaran" pas mau nambah data baru.
      const { data: reports, error: reportsErr } = await supabase
        .from("student_reports")
        .select(
          "id, student_nis, semester, academic_year, student_report_grades(id, subject, score)"
        )
        .in("student_nis", nisList);
      if (reportsErr) throw reportsErr;

      const merged = roster.map((s) => {
        const gradesBySemester = {};
        const reportMetaBySemester = {};
        (reports || [])
          .filter((r) => r.student_nis === s.nis)
          .forEach((r) => {
            gradesBySemester[r.semester] = r.student_report_grades || [];
            reportMetaBySemester[r.semester] = {
              id: r.id,
              academicYear: r.academic_year,
            };
          });
        return {
          nis: s.nis,
          studentId: s.id,
          name: s.full_name,
          gradesBySemester,
          reportMetaBySemester,
        };
      });
      setStudents(merged);

      // Prefill "Tahun Ajaran" tiap semester dari data yang UDAH ADA (siswa
      // pertama yang ketemu aja per semester -- asumsi 1 kelas 1 semester
      // = 1 tahun ajaran yang sama utk semua siswanya).
      const prefill = {};
      SEMESTER_LIST.forEach((sem) => {
        const withData = merged.find((s) => s.reportMetaBySemester[sem]);
        if (withData) prefill[sem] = withData.reportMetaBySemester[sem].academicYear;
      });
      setAcademicYearInputBySemester(prefill);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data kelulusan", "error");
    } finally {
      setIsLoading(false);
    }
  }, [kelas, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Daftar mapel yang muncul di semester yang lagi dipilih -- gabungan dari
  // mapel yang UDAH ADA datanya + mapel yang baru ditambah manual lewat
  // "+ Tambah Mapel" (belum tentu ada nilainya sama sekali).
  const subjects = useMemo(() => {
    const set = new Set(manualSubjectsBySemester[semester] || []);
    students.forEach((s) =>
      (s.gradesBySemester[semester] || []).forEach((g) => set.add(g.subject))
    );
    return Array.from(set).sort();
  }, [students, semester, manualSubjectsBySemester]);

  // Daftar mapel lintas SEMUA semester (1-6), dipake buat tabel NR di bawah --
  // beda dari `subjects` di atas yang cuma mapel di semester yang lagi aktif
  const allSubjectsAcrossSemesters = useMemo(() => {
    const set = new Set();
    students.forEach((s) =>
      SEMESTER_LIST.forEach((sem) =>
        (s.gradesBySemester[sem] || []).forEach((g) => set.add(g.subject))
      )
    );
    return Array.from(set).sort();
  }, [students]);

  // NR (Nilai Rapor) per mapel = rata-rata nilai mapel itu dari semester
  // 1-6 yang ADA datanya (sesuai Permendikbudristek No. 21/2022 -- NR
  // dihitung per mapel, bukan digabung rata-rata semua mapel dulu). Ini
  // baru komponen NR-nya doang; NASAJ (Nilai Ujian Sekolah) dan bobot
  // gabungannya (Nilai Ijazah = bobot NR + bobot NASAJ) BELUM ADA di
  // sistem, nunggu kepastian dari sekolah.
  const computeNRPerMapel = (gradesBySemester, subject) => {
    const scores = SEMESTER_LIST.map((sem) =>
      (gradesBySemester[sem] || []).find((g) => g.subject === subject)
    )
      .filter((g) => g && g.score !== null && g.score !== undefined)
      .map((g) => g.score);
    if (scores.length === 0) return null;
    const sum = scores.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / scores.length) * 100) / 100; // 2 desimal, sesuai contoh Permendikbudristek
  };

  // Rata-rata dari SEMUA NR per mapel (bukan rata-rata semester) -- ini
  // gambaran umum NR siswa lintas mapel, TETAP BUKAN Nilai Ijazah final
  // (belum digabung NASAJ + bobot).
  const computeNRRataRataKeseluruhan = (gradesBySemester) => {
    const nrList = allSubjectsAcrossSemesters
      .map((subj) => computeNRPerMapel(gradesBySemester, subj))
      .filter((nr) => nr !== null);
    if (nrList.length === 0) return null;
    const sum = nrList.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / nrList.length) * 100) / 100;
  };

  // Rata-rata SEMUA mapel di 1 semester tertentu (dipake buat tabel
  // ringkasan "per semester", beda dari NR yang per-mapel di atas)
  const computeRataRataSemester = (gradesBySemester, sem) => computeRataRata(gradesBySemester[sem]);

  // Rata-rata dari rata-rata tiap semester (S1-S6) yang ADA datanya --
  // ini "NR keseluruhan" versi sederhana (bukan per-mapel), dipake
  // sebagai komponen NR di rumus Nilai Akhir.
  const computeRataRataSemesterKeseluruhan = (gradesBySemester) => {
    const semesterAverages = SEMESTER_LIST.map((sem) =>
      computeRataRataSemester(gradesBySemester, sem)
    ).filter((avg) => avg !== null);
    if (semesterAverages.length === 0) return null;
    const sum = semesterAverages.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / semesterAverages.length) * 100) / 100;
  };

  // Nilai Akhir = (BOBOT_NR x rata-rata rapor) + (BOBOT_NASAJ x NASAJ)
  // Kalau NASAJ belum diisi TU buat siswa itu, belum bisa dihitung --
  // balikin null (ditampilin "—"), BUKAN dianggap 0, biar gak salah baca
  // seolah-olah siswa itu nilai ujiannya 0.
  const computeNilaiAkhir = (gradesBySemester, nasaj) => {
    const rataRataRapor = computeRataRataSemesterKeseluruhan(gradesBySemester);
    if (rataRataRapor === null || nasaj === undefined || nasaj === null || nasaj === "")
      return null;
    const nasajNum = Number(nasaj);
    if (Number.isNaN(nasajNum)) return null;
    return Math.round((BOBOT_NR * rataRataRapor + BOBOT_NASAJ * nasajNum) * 100) / 100;
  };

  // Status kelulusan = gabungan AND dari 2 syarat:
  //   1. NR tiap mapel harus di atas KKM mapel itu (dari kkmMap, fallback
  //      KKM_FALLBACK_DEFAULT kalau mapelnya belum diisi KKM-nya)
  //   2. Nilai Akhir harus di atas batas minimum (nilaiAkhirMinimum)
  // Mapel yang datanya belum lengkap (NR null, belum semua semester
  // terisi) TIDAK digugurkan sebagai "gagal KKM" -- itu beda kasus sama
  // "gagal", makanya statusnya "belum_lengkap" bukan "tidak_lulus", biar
  // TU gak salah baca data kosong sebagai siswa gagal.
  const computeStatusKelulusan = (gradesBySemester, nasaj) => {
    const alasanGagal = [];
    const alasanBelumLengkap = [];

    allSubjectsAcrossSemesters.forEach((subj) => {
      const nr = computeNRPerMapel(gradesBySemester, subj);
      if (nr === null) {
        alasanBelumLengkap.push(`Nilai ${subj} belum lengkap`);
        return;
      }
      const kkm = kkmMap[subj] ?? KKM_FALLBACK_DEFAULT;
      if (nr < kkm) alasanGagal.push(`${subj}: ${nr} (KKM ${kkm})`);
    });

    const nilaiAkhir = computeNilaiAkhir(gradesBySemester, nasaj);
    if (nilaiAkhir === null) {
      alasanBelumLengkap.push("NASAJ belum diisi");
    } else if (nilaiAkhirMinimum !== null && nilaiAkhir < nilaiAkhirMinimum) {
      alasanGagal.push(`Nilai Akhir ${nilaiAkhir} di bawah batas minimum ${nilaiAkhirMinimum}`);
    }

    if (alasanGagal.length > 0) return { status: "tidak_lulus", alasan: alasanGagal };
    if (alasanBelumLengkap.length > 0)
      return { status: "belum_lengkap", alasan: alasanBelumLengkap };
    return { status: "lulus", alasan: [] };
  };

  const handleScoreEdit = async (studentNis, gradeId, rawValue) => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return;
    const newScore = Number(trimmed);
    if (Number.isNaN(newScore)) {
      showToast?.("Nilai harus berupa angka", "error");
      return;
    }

    setSavingId(gradeId);
    try {
      const { error } = await supabase
        .from("student_report_grades")
        .update({ score: newScore })
        .eq("id", gradeId);
      if (error) throw error;

      setStudents((prev) =>
        prev.map((s) => {
          if (s.nis !== studentNis) return s;
          return {
            ...s,
            gradesBySemester: {
              ...s.gradesBySemester,
              [semester]: (s.gradesBySemester[semester] || []).map((g) =>
                g.id === gradeId ? { ...g, score: newScore } : g
              ),
            },
          };
        })
      );
      showToast?.("Nilai tersimpan", "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal nyimpen nilai", "error");
    } finally {
      setSavingId(null);
    }
  };

  // Beda sama handleScoreEdit di atas (yang UPDATE grade yang UDAH ADA):
  // ini dipanggil kalau sel yang diklik BELUM PUNYA nilai sama sekali --
  // bisa karena mapelnya baru ditambah manual ("+ Tambah Mapel"), atau
  // siswa itu belum punya student_reports SAMA SEKALI di semester ini
  // (siswa baru mulai diinput dari fotokopi raport). Kedua kasus itu
  // ditangani sekaligus di sini.
  const handleScoreCreate = async (student, subject, rawValue) => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return;
    const newScore = Number(trimmed);
    if (Number.isNaN(newScore)) {
      showToast?.("Nilai harus berupa angka", "error");
      return;
    }

    const tahunAjaranSemesterIni = academicYearInputBySemester[semester];
    if (!tahunAjaranSemesterIni) {
      showToast?.(
        `Isi dulu "Tahun Ajaran" buat Semester ${semester} di bagian atas -- baru bisa nambah nilai baru`,
        "error"
      );
      return;
    }

    const cellKey = `${student.nis}-${subject}`;
    setSavingId(cellKey);
    try {
      // Report utk siswa ini di semester ini mungkin udah ada (dari mapel
      // lain yang udah diisi duluan) -- kalau udah ada, tinggal numpang
      // insert grade baru ke report_id yang sama, JANGAN bikin
      // student_reports baru lagi (bakal keganjel unique constraint
      // student_nis+semester kalau ada, dan konsepnya emang harusnya 1
      // report per siswa per semester, banyak grade).
      let reportId = student.reportMetaBySemester[semester]?.id;
      if (!reportId) {
        const { data: inserted, error: insertReportErr } = await supabase
          .from("student_reports")
          .insert({
            student_id: student.studentId,
            student_name: student.name,
            student_nis: student.nis,
            class_name: null, // lihat catatan header file soal ini
            academic_year: tahunAjaranSemesterIni,
            semester,
            status: "draft",
            source_file: null, // input manual -- gak ada file sumbernya
          })
          .select("id")
          .single();
        if (insertReportErr) throw insertReportErr;
        reportId = inserted.id;
      }

      const { data: insertedGrade, error: gradeErr } = await supabase
        .from("student_report_grades")
        .insert({ report_id: reportId, subject, score: newScore })
        .select("id, subject, score")
        .single();
      if (gradeErr) throw gradeErr;

      setStudents((prev) =>
        prev.map((s) => {
          if (s.nis !== student.nis) return s;
          return {
            ...s,
            gradesBySemester: {
              ...s.gradesBySemester,
              [semester]: [...(s.gradesBySemester[semester] || []), insertedGrade],
            },
            reportMetaBySemester: {
              ...s.reportMetaBySemester,
              [semester]: { id: reportId, academicYear: tahunAjaranSemesterIni },
            },
          };
        })
      );
      showToast?.("Nilai baru tersimpan", "success");
    } catch (err) {
      console.error(err);
      showToast?.(err.message || "Gagal menyimpan nilai baru", "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleTambahMapel = () => {
    const nama = inputMapelBaru.trim();
    if (!nama) return;
    setManualSubjectsBySemester((prev) => {
      const current = prev[semester] || [];
      if (current.includes(nama)) return prev; // udah ada, gak usah dobel
      return { ...prev, [semester]: [...current, nama] };
    });
    setInputMapelBaru("");
  };

  const computeRataRata = (grades) => {
    if (!grades || grades.length === 0) return null;
    const sum = grades.reduce((acc, g) => acc + (g.score ?? 0), 0);
    return Math.round((sum / grades.length) * 10) / 10;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Kelas 9
          </label>
          <select
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            disabled={isLoadingKelas}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 disabled:opacity-60"
          >
            <option value="">Pilih kelas...</option>
            {kelasList.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Semester
          </label>
          <div className="flex gap-1">
            {SEMESTER_LIST.map((sem) => (
              <button
                key={sem}
                onClick={() => setSemester(sem)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  semester === sem
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {sem}
              </button>
            ))}
          </div>
        </div>

        {kelas && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Tahun Ajaran (Semester {semester})
              </label>
              <input
                type="text"
                value={academicYearInputBySemester[semester] || ""}
                onChange={(e) =>
                  setAcademicYearInputBySemester((prev) => ({
                    ...prev,
                    [semester]: e.target.value,
                  }))
                }
                placeholder="Contoh: 2023/2024"
                className="px-3 py-2 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
              />
              <p className="text-xs text-gray-400 mt-1">
                Wajib diisi buat nambah nilai baru di semester ini.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Tambah Mapel
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={inputMapelBaru}
                  onChange={(e) => setInputMapelBaru(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTambahMapel();
                  }}
                  placeholder="Nama mapel"
                  className="px-3 py-2 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={handleTambahMapel}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50"
                >
                  + Tambah
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {!kelas ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Pilih kelas dulu</p>
          <p className="text-sm mt-1">Rekap nilai kelulusan ditampilkan per kelas 9.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Belum ada siswa di kelas ini
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-2.5 font-medium sticky left-0 bg-gray-50 dark:bg-gray-800/50">
                  Siswa
                </th>
                {subjects.map((subj) => (
                  <th key={subj} className="px-3 py-2.5 font-medium text-center whitespace-nowrap">
                    {subj}
                  </th>
                ))}
                <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">Rata-Rata</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const grades = s.gradesBySemester[semester] || [];
                const rataRata = computeRataRata(grades);
                return (
                  <tr key={s.nis} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{s.nis}</p>
                    </td>
                    {subjects.map((subj) => {
                      const grade = grades.find((g) => g.subject === subj);
                      if (!grade) {
                        // Belum ada nilainya -- BUKAN berarti gak bisa diisi.
                        // Sel ini tetap editable (lihat komen header file
                        // soal keputusan ini), ngetik nilai di sini bakal
                        // manggil handleScoreCreate (bikin student_reports +
                        // student_report_grades baru kalau belum ada).
                        const cellKey = `${s.nis}-${subj}`;
                        return (
                          <td key={subj} className="px-2 py-1.5 text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue=""
                              placeholder="--"
                              disabled={savingId === cellKey}
                              onBlur={(e) => {
                                if (e.target.value.trim() === "") return;
                                handleScoreCreate(s, subj, e.target.value);
                              }}
                              className="w-16 text-center px-1.5 py-1 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                            />
                          </td>
                        );
                      }
                      return (
                        <td key={subj} className="px-2 py-1.5 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            defaultValue={grade.score ?? ""}
                            disabled={savingId === grade.id}
                            onBlur={(e) => {
                              if (e.target.value.trim() === String(grade.score ?? "")) return;
                              handleScoreEdit(s.nis, grade.id, e.target.value);
                            }}
                            className="w-16 text-center px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-200">
                      {rataRata ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* NR (Nilai Rapor) per mapel -- lintas semester 1-6, dasar Nilai Ijazah */}
      {students.length > 0 && (
        <div>
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              NR (Nilai Rapor) per Mata Pelajaran
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Rata-rata tiap mapel dari semester 1-6 yang sudah ada nilainya (Permendikbudristek No.
              21/2022). Ini baru komponen NR -- belum digabung NASAJ (Nilai Ujian Sekolah), fitur
              itu belum dibangun.
            </p>
          </div>
          <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2.5 font-medium sticky left-0 bg-gray-50 dark:bg-gray-800/50">
                    Siswa
                  </th>
                  {allSubjectsAcrossSemesters.map((subj) => (
                    <th
                      key={subj}
                      className="px-3 py-2.5 font-medium text-center whitespace-nowrap"
                    >
                      {subj}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap bg-teal-50 dark:bg-teal-900/20">
                    Rata-Rata NR
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.nis} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{s.nis}</p>
                    </td>
                    {allSubjectsAcrossSemesters.map((subj) => {
                      const nr = computeNRPerMapel(s.gradesBySemester, subj);
                      return (
                        <td
                          key={subj}
                          className="px-3 py-2.5 text-center text-gray-700 dark:text-gray-200"
                        >
                          {nr ?? "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-bold text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-900/10">
                      {computeNRRataRataKeseluruhan(s.gradesBySemester) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ringkasan Nilai Akhir Kelulusan -- per semester (1 angka, rata-rata
          semua mapel), Rata-rata gabungan, NASAJ (input manual, belum
          tersimpan ke DB), dan Nilai Akhir hasil rumus berbobot */}
      {students.length > 0 && (
        <div>
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Ringkasan Nilai Akhir Kelulusan
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Nilai Akhir = ({BOBOT_NR * 100}% × Rata-rata Rapor) + ({BOBOT_NASAJ * 100}% × NASAJ).
              Bobot ini masih PLACEHOLDER (belum dikonfirmasi ke sekolah), dan kolom NASAJ belum
              tersimpan permanen ke database -- isi ulang tiap buka halaman ini.
            </p>
          </div>
          <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2.5 font-medium sticky left-0 bg-gray-50 dark:bg-gray-800/50">
                    Siswa
                  </th>
                  {SEMESTER_LIST.map((sem) => (
                    <th key={sem} className="px-3 py-2.5 font-medium text-center whitespace-nowrap">
                      Semester {sem}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">
                    Rata-rata
                  </th>
                  <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">NASAJ</th>
                  <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap bg-teal-50 dark:bg-teal-900/20">
                    Nilai Akhir
                  </th>
                  <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const rataRataRapor = computeRataRataSemesterKeseluruhan(s.gradesBySemester);
                  const nasaj = nasajByNis[s.nis] ?? "";
                  const nilaiAkhir = computeNilaiAkhir(s.gradesBySemester, nasaj);
                  const { status, alasan } = computeStatusKelulusan(s.gradesBySemester, nasaj);
                  return (
                    <tr key={s.nis} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{s.nis}</p>
                      </td>
                      {SEMESTER_LIST.map((sem) => {
                        const avg = computeRataRataSemester(s.gradesBySemester, sem);
                        return (
                          <td
                            key={sem}
                            className="px-3 py-2.5 text-center text-gray-700 dark:text-gray-200"
                          >
                            {avg ?? "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-200">
                        {rataRataRapor ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="isi NASAJ"
                          value={nasaj}
                          onChange={(e) =>
                            setNasajByNis((prev) => ({
                              ...prev,
                              [s.nis]: e.target.value,
                            }))
                          }
                          className="w-20 text-center px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-900/10">
                        {nilaiAkhir ?? "—"}
                      </td>
                      <td
                        className="px-3 py-2.5 text-center"
                        title={alasan.join(" · ") || undefined}
                      >
                        <StatusBadge type="kelulusan" status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapKelulusan;
