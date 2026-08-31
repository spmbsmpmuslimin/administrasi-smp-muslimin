// setting/kelola-raport/ManajemenRaportTable.js
// Dipanggil sebagai sub-tab dari RaportNilaiTab.js (tab "Manajemen Nilai"
// di menu "Nilai Raport"), bukan halaman berdiri sendiri.
// Dua view lokal (state "view"): "list" (fetch dari tabel student_reports,
// filter lewat SemesterFilterBar.js) dan "detail" (DetailRaportSiswa.js,
// muncul pas admin klik satu baris).
//
// Fetch pakai nested select `student_report_grades(subject, score)` --
// ini jalan otomatis karena foreign key report_id di student_report_grades
// (lihat supabase/migrations/..._create_nilai_raport.sql). Filter masih
// dieksekusi di query builder Supabase langsung (bukan di client), jadi
// aman walau datanya udah banyak.
//
// Publish massal: checkbox per baris + "Pilih Semua" di header tabel, lalu
// action bar (jumlah terpilih + tombol Hapus/Draft/Publish) muncul DI ATAS,
// nempel persis di bawah filter bar -- sebelumnya publish cuma bisa 1-1
// lewat DetailRaportSiswa.js (tombolnya di bawah tiap halaman detail, jadi
// harus buka & scroll satu-satu kalau mau publish banyak siswa sekaligus).
// Publish 1 siswa dari halaman detail (handleTogglePublish) TETAP ada dan
// gak berubah -- ini cuma nambahin jalur pintas buat publish banyak
// sekaligus dari halaman list.
//
// Hapus raport: dibutuhin buat beresin kasus salah import -- mis. NIS di
// file semester 2 formatnya beda sama semester 1 (satu "3137255819", satu
// lagi "25.26.07.203") sehingga sistem nganggep itu 2 siswa beda dan
// ke-import DOBEL, padahal orangnya sama. Bisa dihapus satu-satu (icon
// tempat sampah per baris) atau massal (tombol "Hapus Terpilih" di action
// bar), TERMASUK yang statusnya udah "published" (dikasih warning ekstra
// di konfirmasinya). Lihat juga pre-check di ImportRaportForm.js
// (handleSimpan) yang nyoba nyegah kasus kayak gini kejadian lagi dari
// awal, bukan cuma beresin setelah kejadian.

import React, { useCallback, useEffect, useState } from "react";
import {
  ListChecks,
  Loader2,
  ChevronRight,
  Check,
  Trash2,
  Link2,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import SemesterFilterBar from "./SemesterFilterBar";
import StatusBadge from "./StatusBadge";
import DetailRaportSiswa from "./DetailRaportSiswa";
import { useAcademicYears, useReportedClasses } from "./useAcademicOptions";

// Sama persis kayak yang dipake di StudentRaport.js & ImportRaportForm.js --
// SENGAJA didup, bukan di-share dari util bersama (repo ini belum punya
// folder util bersama). Kalau nambah kasus format NIS baru, benerin di
// TIGA tempat ini.
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

const ManajemenRaportTable = ({ showToast }) => {
  const [view, setView] = useState("list"); // "list" | "detail"
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [raportList, setRaportList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkingId, setLinkingId] = useState(null); // id raport yang lagi diproses "Coba Hubungkan"
  const [isBulkLinking, setIsBulkLinking] = useState(false);
  const [filter, setFilter] = useState({
    tahunAjaran: "",
    semester: "",
    kelas: "",
    search: "",
  });
  // id-id student_reports yang lagi dicentang di daftar -- direset tiap
  // kali filter berubah / list di-refetch, biar ga kebawa nyentang ke
  // baris yang beda pas admin ganti filter.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const { years: tahunAjaranOptions } = useAcademicYears(showToast);
  // Kelas di sini = kode yang SUDAH PERNAH diimport (student_reports.class_name),
  // bukan dari tabel `classes` -- lihat catatan di useAcademicOptions.js.
  const { classes: kelasOptions } = useReportedClasses(
    filter.tahunAjaran,
    showToast,
  );

  const fetchRaportList = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("student_reports")
        .select(
          "id, student_id, student_name, student_nis, class_name, academic_year, semester, status, student_report_grades(subject, score)",
        )
        .order("student_name", { ascending: true });

      if (filter.tahunAjaran)
        query = query.eq("academic_year", filter.tahunAjaran);
      if (filter.semester)
        query = query.eq("semester", Number(filter.semester));
      if (filter.kelas) query = query.eq("class_name", filter.kelas);
      if (filter.search)
        query = query.ilike("student_name", `%${filter.search}%`);

      const { data, error } = await query;
      if (error) throw error;

      setRaportList(
        (data || []).map((r) => ({
          id: r.id,
          // null berarti pas import NIS di file gak ketemu persis di tabel
          // `students` -- raport ini GAK BAKAL muncul di halaman siswa
          // manapun (walau statusnya published) sampai ini kesambung.
          // Lihat badge "Belum terhubung" di bawah & catatan di
          // ImportRaportForm.js / StudentRaport.js soal kenapa ini bisa
          // kejadian (format NIS beda antar file).
          studentId: r.student_id,
          name: r.student_name,
          nis: r.student_nis,
          kelas: r.class_name,
          tahunAjaran: r.academic_year,
          semester: r.semester,
          status: r.status,
          grades: r.student_report_grades || [],
        })),
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data raport", "error");
    } finally {
      setIsLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    fetchRaportList();
  }, [fetchRaportList]);

  const isAllSelected =
    raportList.length > 0 && selectedIds.size === raportList.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    setSelectedIds(
      isAllSelected ? new Set() : new Set(raportList.map((r) => r.id)),
    );
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveGrades = async (id, grades) => {
    try {
      const { error } = await supabase.from("student_report_grades").upsert(
        grades.map((g) => ({
          report_id: id,
          subject: g.subject,
          score: g.score,
        })),
        { onConflict: "report_id,subject" },
      );
      if (error) throw error;

      setRaportList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, grades } : r)),
      );
      setSelectedSiswa((prev) =>
        prev && prev.id === id ? { ...prev, grades } : prev,
      );
      showToast?.("Nilai raport tersimpan", "success");
      return true;
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan nilai", "error");
      return false;
    }
  };

  const handleTogglePublish = async (id, nextStatus) => {
    // FIX 30 Agustus 2026: warning kalau admin publish raport yang belum
    // kesambung ke akun siswa (student_id null) -- soalnya statusnya bisa
    // aja "published" tapi TETEP gak akan pernah muncul di halaman siswa
    // manapun (lihat StudentRaport.js), dan sebelumnya admin baru ketauan
    // dari laporan siswa. Sekarang diingetin dari awal.
    if (nextStatus === "published") {
      const target = raportList.find((r) => r.id === id);
      if (target && !target.studentId) {
        const lanjut = window.confirm(
          `Raport "${target?.name}" ini BELUM TERHUBUNG ke akun siswa manapun (lihat badge ⚠️). Kalau dipublish sekarang, statusnya bakal "published" tapi TETEP GAK BAKAL MUNCUL di halaman siswa sampai dihubungkan dulu (pakai tombol "Coba Hubungkan").\n\nTetap lanjut publish?`,
        );
        if (!lanjut) return;
      }
    }

    try {
      const { error } = await supabase
        .from("student_reports")
        .update({ status: nextStatus })
        .eq("id", id);
      if (error) throw error;

      setRaportList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)),
      );
      setSelectedSiswa((prev) =>
        prev && prev.id === id ? { ...prev, status: nextStatus } : prev,
      );
      showToast?.(
        nextStatus === "published"
          ? "Raport dipublish, sudah bisa dilihat siswa"
          : "Raport diset ke Draft",
        "success",
      );
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mengubah status publish", "error");
    }
  };

  // Sama kayak handleTogglePublish tapi buat banyak siswa terpilih
  // sekaligus (1 query update pakai .in(), bukan loop 1-1 per siswa).
  const handleBulkTogglePublish = async (nextStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const label = nextStatus === "published" ? "publish" : "set ke Draft";

    // Sama kayak di handleTogglePublish -- cek dulu ada berapa raport
    // terpilih yang belum kesambung ke akun siswa sebelum publish massal.
    let confirmMsg = `${nextStatus === "published" ? "Publish" : "Set ke Draft"} ${ids.length} raport terpilih?`;
    if (nextStatus === "published") {
      const unlinkedCount = raportList.filter(
        (r) => ids.includes(r.id) && !r.studentId,
      ).length;
      if (unlinkedCount > 0) {
        confirmMsg = `${unlinkedCount} dari ${ids.length} raport terpilih BELUM TERHUBUNG ke akun siswa manapun. Raport itu bakal berstatus "published" tapi TETEP GAK MUNCUL di halaman siswa sampai dihubungkan (pakai "Coba Hubungkan" / "Hubungkan Semua").\n\n${confirmMsg}`;
      }
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsBulkSaving(true);
    try {
      const { error } = await supabase
        .from("student_reports")
        .update({ status: nextStatus })
        .in("id", ids);
      if (error) throw error;

      setRaportList((prev) =>
        prev.map((r) =>
          ids.includes(r.id) ? { ...r, status: nextStatus } : r,
        ),
      );
      setSelectedIds(new Set());
      showToast?.(`${ids.length} raport berhasil di-${label}`, "success");
    } catch (err) {
      console.error(err);
      showToast?.(`Gagal ${label} raport terpilih`, "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Hapus permanen dari student_reports (+ student_report_grades-nya).
  // Dipakai buat beresin kasus salah import (mis. duplikat gara2 NIS beda
  // format antar semester) -- termasuk raport yang statusnya udah
  // "published", makanya konfirmasinya dibedain/diperkeras kalau ada yang
  // udah published biar ga kepencet ga sengaja.
  const deleteReports = async (ids) => {
    // Grades dihapus manual dulu (bukan andelin ON DELETE CASCADE di FK --
    // gak ada jaminan itu di-set di migration-nya) baru rownya sendiri.
    const { error: gradesError } = await supabase
      .from("student_report_grades")
      .delete()
      .in("report_id", ids);
    if (gradesError) throw gradesError;

    const { error: reportsError } = await supabase
      .from("student_reports")
      .delete()
      .in("id", ids);
    if (reportsError) throw reportsError;
  };

  // Nyoba nyambungin ulang raport yang student_id-nya null ke tabel
  // `students`, pake logic normalisasi NIS yang sama kayak ImportRaportForm.js
  // -- buat data LAMA yang keburu keimport SEBELUM fix normalisasi NIS ada.
  // Ini gak nyentuh/nghapus data raport sama sekali, cuma nyambungin ID.
  //
  // PENTING (ketauan 30 Agustus 2026 dari kasus Adriansyah): NIS di tabel
  // `students` itu NIS LOKAL sekolah, formatnya "25.26.07.079" (9 digit,
  // pola tahunajaran.tahunajaran.kelas.urutan) -- BEDA SAMA SEKALI dari
  // NISN (Nomor Induk Siswa Nasional, 10 digit, mis. "3137255819") yang
  // kadang justru itu yang kebaca dari kolom "NISN" di file leger Excel
  // (lihat komen di ImportRaportForm.js). Dua ID ini diterbitin instansi
  // beda dan TIDAK BISA saling diturunin lewat manipulasi string (nambah/
  // hapus titik dll) -- kalau raport-nya nyimpen NISN padahal `students`
  // cuma punya NIS lokal, auto-match APAPUN gak akan pernah nemu, dan
  // satu-satunya jalan adalah cocokin manual (nama / NIS lokal yang bener).
  // Bagian auto-match TANPA nanya apa-apa ke admin (deterministik, aman
  // buat dipanggil banyak sekali sekaligus di handleBulkTryLink). Kasus
  // yang butuh keputusan manusia (NISN vs NIS lokal / nama ganda) TETAP
  // gak ke-handle di sini -- itu cuma ada di alur single handleTryLink.
  const findAutoMatch = async (r) => {
    const variants = nisVariants(r.nis);
    if (variants.length > 0) {
      const { data: candidates, error: findError } = await supabase
        .from("students")
        .select("id, nis")
        .in("nis", variants);
      if (findError) throw findError;
      if ((candidates || []).length > 0) return candidates[0];
    }

    const targetDigits = normalizeNis(r.nis);
    if (targetDigits) {
      const { data: allStudents, error: allErr } = await supabase
        .from("students")
        .select("id, nis");
      if (allErr) throw allErr;
      const found = (allStudents || []).find(
        (s) => normalizeNis(s.nis) === targetDigits,
      );
      if (found) return found;
    }
    return null;
  };

  const handleTryLink = async (r) => {
    setLinkingId(r.id);
    try {
      const match = await findAutoMatch(r);
      let finalMatch = match;

      // Terakhir, coba cari by nama (full_name) -- buat kasus kayak NISN
      // vs NIS lokal ini, di mana angkanya emang gak akan pernah nyambung
      // otomatis. Kalau ketemu PERSIS 1 kandidat, konfirmasi dulu ke admin
      // sebelum link (jangan asal nebak kalau ada >1 nama mirip).
      if (!finalMatch && r.name) {
        const { data: byName, error: nameErr } = await supabase
          .from("students")
          .select("id, nis, full_name")
          .ilike("full_name", `%${r.name.trim()}%`);
        if (nameErr) throw nameErr;

        if ((byName || []).length === 1) {
          const candidate = byName[0];
          const confirmed = window.confirm(
            `NIS "${r.nis}" di raport ini kemungkinan NISN (bukan NIS lokal), jadi gak bisa auto-match.\n\nKetemu 1 akun dengan nama mirip: "${candidate.full_name}" (NIS lokal: ${candidate.nis}).\n\nHubungkan raport ini ke akun tersebut?`,
          );
          if (confirmed) finalMatch = candidate;
        } else if ((byName || []).length > 1) {
          showToast?.(
            `Ada ${byName.length} akun siswa dengan nama mirip "${r.name}" -- gak bisa auto-pilih. Masukkan NIS lokal yang benar secara manual.`,
            "warning",
          );
        }
      }

      // Fallback paling akhir: minta admin ketik NIS LOKAL yang benar
      // secara manual (dicek sendiri di tabel Siswa).
      if (!finalMatch) {
        const manualNis = window.prompt(
          `Gak ketemu otomatis buat "${r.name}" (NIS di raport: ${r.nis}).\n\nKalau NIS di raport ini emang NISN (bukan NIS lokal sekolah), ketik NIS LOKAL yang benar di sini (cek di tabel Siswa, formatnya kayak "25.26.07.079"). Kosongkan/Batal buat skip.`,
          "",
        );
        if (!manualNis || !manualNis.trim()) {
          showToast?.("Dibatalkan, gak ada yang dihubungkan", "info");
          return;
        }
        const { data: manualMatch, error: manualErr } = await supabase
          .from("students")
          .select("id, nis")
          .eq("nis", manualNis.trim())
          .maybeSingle();
        if (manualErr) throw manualErr;
        if (!manualMatch) {
          showToast?.(
            `NIS "${manualNis.trim()}" juga gak ketemu di tabel Siswa. Cek lagi ejaannya.`,
            "error",
          );
          return;
        }
        finalMatch = manualMatch;
      }

      const { error: updateError } = await supabase
        .from("student_reports")
        .update({ student_id: finalMatch.id })
        .eq("id", r.id);
      if (updateError) throw updateError;

      setRaportList((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, studentId: finalMatch.id } : x,
        ),
      );
      showToast?.(
        `Berhasil dihubungkan ke akun siswa (NIS: ${finalMatch.nis})`,
        "success",
      );
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mencoba menghubungkan raport", "error");
    } finally {
      setLinkingId(null);
    }
  };

  // Versi bulk dari handleTryLink -- JALAN OTOMATIS ke semua baris yang
  // ada di daftar (raportList, ngikut filter aktif) dan student_id-nya
  // masih null, TANPA nanya-nanya satu-satu (biar gak muncul puluhan
  // window.confirm/prompt beruntun). Yang butuh keputusan manusia (nama
  // ganda, atau angkanya emang NISN bukan NIS lokal) SENGAJA di-skip di
  // sini dan tetep harus diselesein manual satu-satu lewat "Coba
  // Hubungkan" per baris -- makanya di akhir dikasih ringkasan berapa
  // yang berhasil vs berapa yang masih nyangkut.
  const handleBulkTryLink = async () => {
    const unlinked = raportList.filter((r) => !r.studentId);
    if (unlinked.length === 0) {
      showToast?.(
        "Semua raport di daftar ini udah terhubung ke akun siswa",
        "info",
      );
      return;
    }
    if (
      !window.confirm(
        `Coba hubungkan otomatis ${unlinked.length} raport yang belum terhubung? Yang gak ketemu otomatis (mis. kasus NISN vs NIS lokal) tetep perlu dihubungkan manual satu-satu setelah ini.`,
      )
    ) {
      return;
    }

    setIsBulkLinking(true);
    const linkedUpdates = [];
    let updateFailCount = 0;
    try {
      for (const r of unlinked) {
        try {
          const match = await findAutoMatch(r);
          // DEBUG SEMENTARA 30 Agustus 2026: bulk-link 0/76 tanpa error apa
          // pun di console -- nge-log tiap baris biar ketauan match-nya
          // ketemu apa nggak, dan (yang paling dicurigai) nge-log updateError
          // yang SEBELUMNYA didiemin total (dicek doang lewat `if
          // (!updateError)`, gak pernah di-console.error apalagi ditampilin
          // ke admin). Hapus block console.log ini kalau udah ketemu akar
          // masalahnya.
          console.log("[bulkLink]", {
            reportId: r.id,
            nisReport: r.nis,
            matchFound: !!match,
            matchedStudentId: match?.id,
            matchedStudentNis: match?.nis,
          });
          if (match) {
            const { error: updateError } = await supabase
              .from("student_reports")
              .update({ student_id: match.id })
              .eq("id", r.id);
            if (!updateError) {
              linkedUpdates.push({ id: r.id, studentId: match.id });
            } else {
              updateFailCount += 1;
              console.error(
                `[bulkLink] UPDATE GAGAL buat raport ${r.id} (mau di-set ke student_id ${match.id}):`,
                updateError,
              );
            }
          }
        } catch (innerErr) {
          console.error(`Gagal auto-link raport ${r.id}:`, innerErr);
        }
      }
      if (updateFailCount > 0) {
        showToast?.(
          `${updateFailCount} raport ketemu kandidatnya tapi GAGAL disimpan (lihat console) -- kemungkinan besar dibatasi izin akses (RLS Supabase).`,
          "error",
        );
      }

      if (linkedUpdates.length > 0) {
        setRaportList((prev) =>
          prev.map((x) => {
            const found = linkedUpdates.find((l) => l.id === x.id);
            return found ? { ...x, studentId: found.studentId } : x;
          }),
        );
      }

      const remaining = unlinked.length - linkedUpdates.length;
      showToast?.(
        `${linkedUpdates.length} raport berhasil dihubungkan otomatis.` +
          (remaining > 0
            ? ` ${remaining} sisanya masih perlu dihubungkan manual satu-satu (kemungkinan besar kasus NISN vs NIS lokal) -- klik "Coba Hubungkan" di baris masing-masing.`
            : ""),
        linkedUpdates.length > 0 ? "success" : "warning",
      );
    } finally {
      setIsBulkLinking(false);
    }
  };

  const handleDeleteOne = async (r) => {
    const warnPublished =
      r.status === "published"
        ? "\n\nRaport ini SUDAH DIPUBLISH dan mungkin udah dilihat siswa."
        : "";
    if (
      !window.confirm(
        `Hapus permanen raport "${r.name}" (${r.tahunAjaran} semester ${r.semester})? Nilai-nilainya ikut kehapus, dan ini gak bisa di-undo.${warnPublished}`,
      )
    ) {
      return;
    }
    try {
      await deleteReports([r.id]);
      setRaportList((prev) => prev.filter((x) => x.id !== r.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(r.id);
        return next;
      });
      showToast?.(`Raport "${r.name}" berhasil dihapus`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus raport", "error");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const selectedRows = raportList.filter((r) => selectedIds.has(r.id));
    const publishedCount = selectedRows.filter(
      (r) => r.status === "published",
    ).length;
    const warnPublished =
      publishedCount > 0
        ? `\n\n${publishedCount} DI ANTARANYA SUDAH DIPUBLISH dan mungkin udah dilihat siswa.`
        : "";

    if (
      !window.confirm(
        `Hapus permanen ${ids.length} raport terpilih? Nilai-nilainya ikut kehapus, dan ini gak bisa di-undo.${warnPublished}`,
      )
    ) {
      return;
    }

    setIsBulkSaving(true);
    try {
      await deleteReports(ids);
      setRaportList((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelectedIds(new Set());
      showToast?.(`${ids.length} raport berhasil dihapus`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus raport terpilih", "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  if (view === "detail" && selectedSiswa) {
    return (
      <DetailRaportSiswa
        siswa={selectedSiswa}
        showToast={showToast}
        onBack={() => setView("list")}
        onSave={handleSaveGrades}
        onTogglePublish={handleTogglePublish}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SemesterFilterBar
        tahunAjaranOptions={tahunAjaranOptions}
        kelasOptions={kelasOptions}
        value={filter}
        onChange={(partial) =>
          setFilter((prev) => ({
            ...prev,
            ...partial,
            // Kelas lama gak relevan lagi kalau tahun ajarannya diganti
            // (kode rombel didaur ulang tiap tahun, lihat useAcademicOptions.js)
            ...(partial.tahunAjaran !== undefined &&
            partial.tahunAjaran !== prev.tahunAjaran
              ? { kelas: "" }
              : {}),
          }))
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data raport...</span>
        </div>
      ) : raportList.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Belum ada data
          </p>
          <p className="text-sm mt-1">
            Ga ada raport yang cocok sama filter ini.
          </p>
        </div>
      ) : (
        <>
          {/* Action bar publish massal -- selalu di atas tabel (bukan di
              bawah), jadi keliatan tanpa scroll begitu ada siswa yang
              dicentang. */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <label className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
              />
              {selectedIds.size > 0 ? (
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {selectedIds.size} dipilih
                </span>
              ) : (
                "Pilih Semua"
              )}
            </label>

            <div className="flex items-center gap-2">
              {raportList.some((r) => !r.studentId) && (
                <button
                  onClick={handleBulkTryLink}
                  disabled={isBulkLinking}
                  title="Nyoba nyambungin otomatis semua raport di daftar ini yang belum terhubung ke akun siswa. Yang gak ketemu otomatis tetep perlu dihubungkan manual satu-satu."
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {isBulkLinking ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Link2 size={14} />
                  )}
                  Hubungkan Semua (
                  {raportList.filter((r) => !r.studentId).length})
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || isBulkSaving}
                className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                Hapus Terpilih
              </button>
              <button
                onClick={() => handleBulkTogglePublish("draft")}
                disabled={selectedIds.size === 0 || isBulkSaving}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                Set ke Draft
              </button>
              <button
                onClick={() => handleBulkTogglePublish("published")}
                disabled={selectedIds.size === 0 || isBulkSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100">
                {isBulkSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Publish Terpilih
              </button>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {raportList.map((r) => (
              <div
                key={r.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleSelectOne(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 shrink-0 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedSiswa(r);
                    setView("detail");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSiswa(r);
                      setView("detail");
                    }
                  }}
                  className="flex-1 flex items-center justify-between gap-3 min-w-0 text-left cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {r.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {r.nis} · Kelas {r.kelas} · {r.tahunAjaran} · Semester{" "}
                      {r.semester}
                    </p>
                    {!r.studentId && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p
                          className="text-xs font-medium text-amber-600 dark:text-amber-400"
                          title="NIS di file ini gak ketemu persis di tabel akun siswa saat diimport -- raport ini gak akan muncul di halaman siswa manapun sampai NIS-nya dibenerin.">
                          ⚠️ Belum terhubung ke akun siswa
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTryLink(r);
                          }}
                          disabled={linkingId === r.id}
                          className="flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50">
                          {linkingId === r.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Link2 size={12} />
                          )}
                          Coba Hubungkan
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge type="publish" status={r.status} />
                    <ChevronRight
                      size={16}
                      className="text-gray-300 dark:text-gray-600"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOne(r);
                  }}
                  title="Hapus raport ini"
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ManajemenRaportTable;
