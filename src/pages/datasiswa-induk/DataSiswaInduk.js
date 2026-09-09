// pages/datasiswa-induk/DataSiswaInduk.js
// ========================================================================
// Halaman buat wali kelas/admin liat siapa aja siswa yang SUDAH dan BELUM
// isi data tambahan (alamat, no HP, data ortu) dari StudentProfile.js
// (form "Lengkapi / Edit Data" di sisi siswa).
//
// Sumber data:
// - students            : daftar siswa (id, full_name, nis, class_id)
// - student_profile_details : data tambahan, cuma ADA row-nya kalau siswa/
//   ortu udah pernah klik "Simpan" minimal sekali. Belum pernah isi = gak
//   ada row sama sekali (bukan row kosong).
//
// PENTING (beda dari project Bahasa Inggris):
// - Di project SMP ini, `student_profile_details.student_id` itu FOREIGN
//   KEY langsung ke `students.id` (SUDAH DICEK via pg_constraint:
//   "FOREIGN KEY (student_id) REFERENCES students(id)"). BUKAN ke users.id
//   kayak di project Bahasa Inggris. Jadi merge-nya pake `s.id`, bukan
//   `s.user_id`.
// - Role "admin" bisa liat semua kelas (dropdown filter), role "teacher"
//   di-scope otomatis ke currentUser.homeroom_class_id aja (gak ada
//   dropdown, cuma liat kelasnya sendiri) — samain kayak fitur wali kelas
//   lain (PengumumanWaliKelas, SaranMasukanSiswa).
//
// ✅ SPLIT (biar file ini gak kepanjangan, dulu hampir 2000 baris): JSX-nya
// sekarang dipecah ke 2 file terpisah, file ini TETAP satu-satunya yang
// pegang semua state/effect/handler (gak ada logic yang pindah, cuma
// tampilannya doang):
// - DataSiswaIndukListTab.js      -> tab "Data Siswa" (list/filter/tabel)
// - DataSiswaIndukDetailPanel.js  -> picker "Pilih Siswa", header siswa
//   terpilih, riwayat mutasi, tab "Isi Data", & tab "Preview"
// Kalau nyari behavior/handler tertentu, tetep cari di sini. Kalau nyari
// tampilan/JSX tab tertentu, cek 2 file di atas.
// ========================================================================
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { exportStudentProfilePDF } from "./DataSiswaIndukPDF";
import { exportStudentProfileExcel } from "./DataSiswaIndukExcel";
import { getCompletionStatus, resolveCompletion } from "../../utils/studentProfileCompletion";
// ✅ SPLIT (lihat DataSiswaIndukConfig.js): semua konstanta & helper murni
// (STATUS_META, DETAIL_ROWS, opsi dropdown, ADMIN_EDIT_FIELDS, dll) udah
// dipindah ke file terpisah supaya bisa di-share juga sama
// DataSiswaIndukPDF.js/Excel export -- JANGAN disalin ulang manual ke sini,
// import dari sana.
import { getJenjang, ADMIN_EDIT_FIELDS, emptyAdminForm } from "./DataSiswaIndukConfig";
import DataSiswaIndukListTab from "./DataSiswaIndukListTab";
import DataSiswaIndukDetailPanel from "./DataSiswaIndukDetailPanel";

// REQUIRED_FIELDS, getCompletionStatus, genderCodeToLabel (lewat
// resolveCompletion) sekarang diimport dari utils/studentProfileCompletion.js
// -- dipake bareng sama halaman Data Siswa (badge kelengkapan) biar status
// kelengkapan SELALU sama persis di kedua halaman.

// ✅ FIX (Sep 2026): dibuka lagi buat Wali Kelas -- sebelumnya halaman ini
// FINAL cuma Admin & TU (lihat riwayat komentar lama di git kalau perlu),
// dan pattern isWaliKelas sempet dibuang total sebagai "dead code". Sekarang
// dibalikin lagi (lihat menuConfig.js: allowedRoles udah include "teacher" +
// requireWaliKelas: true), TAPI beda dari versi lama: wali kelas cuma boleh
// LIAT data siswa di kelasnya sendiri (di-scope lewat query `class_id` =
// currentUser.homeroom_class_id) lewat tab "Data Siswa" & "Preview"
// (read-only) -- gak bisa isi/edit sama sekali, tab "Isi Data" disembunyiin
// total buat mereka (lihat gate `isAdmin || isTU` di bagian render tab, ~L767,
// dan gate yang sama di DataSiswaIndukDetailPanel.js). Beda kelas juga tetep
// gak bisa diliat kayak Admin/TU. Guru BK TETAP gak dikasih akses ke halaman
// ini sama sekali.
export default function KelengkapanDataSiswa({ currentUser }) {
  const isAdmin = currentUser?.role === "admin";
  const isTU = currentUser?.role === "tu";
  // Wali Kelas = teacher dengan homeroom_class_id keisi (pola sama kayak
  // isWaliKelas() di App.js/Layout.js/Sidebar.js). Guru mapel biasa (bukan
  // wali kelas) gak pernah nyampe render komponen ini -- udah distop lebih
  // dulu di ProtectedRoute (requireWaliKelas: true di menuConfig.js).
  const isWaliKelas = currentUser?.role === "teacher" && !!currentUser?.homeroom_class_id;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [mutationHistory, setMutationHistory] = useState([]);
  const [mutationHistoryLoading, setMutationHistoryLoading] = useState(false);

  const [search, setSearch] = useState("");
  // ✅ NEW: search lokal buat picker "Pilih Siswa" di dalam tab Isi
  // Data/Preview -- kepake pas user masuk tab itu TANPA milih siswa dulu
  // dari list. Terpisah dari `search` (filter di tab Data Siswa) biar gak
  // saling ganggu state-nya.
  const [pickerQuery, setPickerQuery] = useState("");
  // ✅ NEW: filter Jenjang/Kelas KHUSUS buat picker "Pilih Siswa" (dalam
  // tab Isi Data/Preview) -- state TERPISAH dari jenjangFilter/classFilter
  // di tab "Data Siswa", biar ganti filter di picker gak ikut ngubah
  // filter yang lagi dipakai di tab list pas balik ke sana.
  const [pickerJenjang, setPickerJenjang] = useState("all");
  const [pickerClass, setPickerClass] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | lengkap | sebagian | belum
  // all | verified | unverified -- filter TERPISAH dari statusFilter
  // (kelengkapan) di atas, krn "udah lengkap" beda sama "udah diverifikasi".
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [verifying, setVerifying] = useState(false);
  // ====== TAB HALAMAN UTAMA ======
  // "list"    = list/filter siswa (tampilan default)
  // "isi"     = form edit (admin & TU) buat selectedStudent
  // "preview" = ringkasan read-only buat selectedStudent (semua role bisa
  //             liat, isinya dari `adminForm` yang sama dipakai tab "isi",
  //             jadi utk non-admin otomatis nampilin data tersimpan apa
  //             adanya krn mereka gak bisa ngubah adminForm).
  const [activePageTab, setActivePageTab] = useState("list");
  const [adminForm, setAdminForm] = useState(null);
  // True kalau ada perubahan di form yang belum di-klik Simpan -- dipake
  // buat munculin konfirmasi sebelum TU pindah tab/siswa lain & kehilangan
  // perubahan gak sengaja.
  const [adminFormDirty, setAdminFormDirty] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminEditError, setAdminEditError] = useState(null);
  // Notif sukses sementara di tab "Isi Data" setelah klik Simpan (TU tetap
  // di tab yang sama, gak auto-pindah ke list).
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [jenjangFilter, setJenjangFilter] = useState("all"); // all | "7" | "8" | "9"
  const [classOptions, setClassOptions] = useState([]); // [{ id: "7A", jenjang: "7" }, ...]
  // Admin & TU (satu-satunya role yang bisa buka halaman ini) selalu liat
  // semua kelas -- gak ada lagi auto-scope ke 1 kelas kayak wali kelas dulu.
  const [classFilter, setClassFilter] = useState("all");

  // ====== SELEKSI SISWA UNTUK EXPORT PDF ======
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // ✅ PAGINATION (biar gak lag di HP) — render maksimal PAGE_SIZE card
  // dulu, sisanya dimuat pas user klik "Muat Lebih Banyak". Data lengkap
  // (filteredRows) tetep dipakai buat "Pilih Semua" & Export PDF, cuma
  // yang di-render ke DOM yang dibatasin.
  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [academicYear, setAcademicYear] = useState(null); // format "2026/2027", buat header PDF

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let studentQuery = supabase
          .from("students")
          // Kolom jenis kelamin di tabel `students` namanya `gender`
          // (isinya kode "P"/"L"), BEDA nama & format sama
          // student_profile_details.jenis_kelamin ("Perempuan"/
          // "Laki-laki"). Konversi ke label penuh di bagian merge.
          .select("id, full_name, nis, class_id, user_id, gender")
          .eq("is_active", true)
          .order("full_name", { ascending: true });

        // Admin & TU tetap liat semua kelas/jenjang. Wali Kelas di-scope
        // KETAT cuma ke kelasnya sendiri lewat filter query ini -- samain
        // pola scoping kayak fitur wali kelas lain (PengumumanWaliKelas,
        // SaranMasukanSiswa).
        if (!isAdmin && !isTU && isWaliKelas) {
          studentQuery = studentQuery.eq("class_id", currentUser.homeroom_class_id);
        }

        const [
          { data: students, error: studentErr },
          { data: details, error: detailErr },
          { data: activeYear },
        ] = await Promise.all([
          studentQuery,
          supabase
            .from("student_profile_details")
            // Semua kolom formulir (identitas kependudukan, dokumen, alamat
            // detail, data ortu) di-select semua sekarang -- sebelumnya cuma
            // 16 kolom "lama" yang narik, jadi field2 kayak NIK/No KK/Dusun/
            // NIK Ayah-Ibu dkk gak pernah nyampe ke kartu expand & Export
            // PDF walau udah kesimpen di DB. `nama_ortu` dibuang dari sini
            // karena udah gak dipake sama sekali (diganti nama_ayah+nama_ibu).
            // `keterangan` sempat SENGAJA di-exclude nunggu keputusan purpose
            // field-nya -- tapi ternyata 16 siswa udah keisi datanya, jadi
            // ditambahin balik biar gak ke-hidden dari admin/walikelas.
            // Purpose jangka panjangnya (admin-only? gabung CatatanSiswa.js?)
            // masih open, tapi visibilitas data yang UDAH ADA gak boleh nunggu.
            // `verified_at` = kolom baru buat status verifikasi admin (lihat
            // migrasi add_verified_at_student_profile_details.sql). null =
            // belum pernah diverifikasi / berubah lagi setelah diverifikasi
            // (StudentProfile.js otomatis reset ini ke null tiap kali siswa
            // save data baru -- lihat handleSubmit di sana).
            .select(
              "student_id, jenis_kelamin, tempat_lahir, tanggal_lahir, nisn, nik, no_kk, no_akta_lahir, agama, anak_ke, sekolah_asal, no_peserta_ujian, no_ijazah, no_kip, no_daftar, alamat, kode_pos, no_hp, no_hp_ortu, nama_ayah, nik_ayah, tempat_tgl_lahir_ayah, pekerjaan_ayah, pendidikan_ayah, nama_ibu, nik_ibu, tempat_tgl_lahir_ibu, pekerjaan_ibu, pendidikan_ibu, keterangan, updated_at, verified_at"
            ),
          supabase.from("academic_years").select("year").eq("is_active", true).limit(1),
        ]);

        if (studentErr) throw studentErr;
        if (detailErr) throw detailErr;

        setAcademicYear(activeYear?.[0]?.year || null);

        const detailMap = {};
        (details || []).forEach((d) => {
          detailMap[d.student_id] = d;
        });

        const merged = (students || []).map((s) => {
          // student_profile_details.student_id nunjuk LANGSUNG ke
          // students.id di project ini (bukan users.id).
          const rawDetail = detailMap[s.id] || null;

          // resolveCompletion: prioritas jenis_kelamin dari students.gender
          // (kode P/L, dikonversi ke label penuh) dulu, fallback ke
          // student_profile_details.jenis_kelamin (form siswa) kalau
          // students.gender kosong/gak valid -- hasil gabungannya dipake
          // buat DETAIL_ROWS (kartu expand), DataSiswaIndukPDF.js, DAN
          // status kelengkapan sekaligus (jenis_kelamin ada di
          // REQUIRED_FIELDS, jadi siswa yang gender-nya udah keisi lewat
          // students.gender tetep ke-anggep "keisi" buat field ini).
          const { detail, status } = resolveCompletion(s.gender, rawDetail);

          return {
            ...s,
            detail,
            status,
            // Status verifikasi (BEDA dari status kelengkapan di atas):
            // kelengkapan = "udah diisi apa belum", verifikasi = "udah
            // dicek admin/TU ke dokumen fisik apa belum & masih valid".
            // rawDetail null (belum pernah isi) otomatis gak verified.
            isVerified: !!rawDetail?.verified_at,
            verifiedAt: rawDetail?.verified_at || null,
          };
        });

        setRows(merged);
        setSelectedIds(new Set());

        // Dropdown filter Jenjang & Kelas -- Admin & TU selalu butuh ini
        // karena selalu liat semua kelas.
        const uniqueClasses = [
          ...new Set((students || []).map((s) => s.class_id).filter(Boolean)),
        ].sort();
        setClassOptions(uniqueClasses.map((c) => ({ id: c, jenjang: getJenjang(c) })));
      } catch (err) {
        console.error("[KelengkapanDataSiswa] Gagal memuat data:", err);
        setError("Gagal memuat data kelengkapan siswa. Coba refresh halaman.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser]);

  // ✅ NEW: summary sekarang ikut kescope oleh jenjangFilter & classFilter
  // (TAPI SENGAJA TIDAK oleh statusFilter/verifiedFilter/search) -- biar
  // 3 angka (Lengkap/Sebagian/Belum) + persentase di bawah selalu
  // nunjukin potret jenjang/kelas yang lagi dipilih. Kalau summary ikut
  // kescope statusFilter juga, salah satu dari 3 angka bakal selalu 0
  // begitu status dipilih -- percuma ditampilin bareng.
  const summaryScopedRows = useMemo(() => {
    return rows.filter((r) => {
      if (jenjangFilter !== "all" && getJenjang(r.class_id) !== jenjangFilter) return false;
      if (classFilter !== "all" && r.class_id !== classFilter) return false;
      return true;
    });
  }, [rows, jenjangFilter, classFilter]);

  const summary = useMemo(
    () =>
      summaryScopedRows.reduce(
        (acc, r) => {
          acc[r.status] += 1;
          acc.total += 1;
          return acc;
        },
        { total: 0, lengkap: 0, sebagian: 0, belum: 0 }
      ),
    [summaryScopedRows]
  );

  // ✅ NEW: persentase kelengkapan (Lengkap / Total) buat scope jenjang/
  // kelas yang lagi aktif -- ditampilin sebagai progress bar di atas
  // kartu ringkasan. Label ikut nyesuain: belum pilih apa-apa -> "Semua
  // Jenjang & Kelas", udah pilih jenjang doang -> "Jenjang 7 (semua
  // kelas)", udah pilih kelas -> "Kelas 7A" (classFilter menang kalau
  // dua-duanya somehow aktif, karena itu scope paling sempit).
  const completionPercent =
    summary.total > 0 ? Math.round((summary.lengkap / summary.total) * 100) : 0;
  const completionScopeLabel =
    classFilter !== "all"
      ? `Kelas ${classFilter}`
      : jenjangFilter !== "all"
        ? `Jenjang ${jenjangFilter} (semua kelas)`
        : "Semua Jenjang & Kelas";

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (verifiedFilter === "verified" && !r.isVerified) return false;
      if (verifiedFilter === "unverified" && r.isVerified) return false;
      if (jenjangFilter !== "all" && getJenjang(r.class_id) !== jenjangFilter) return false;
      if (classFilter !== "all" && r.class_id !== classFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = r.full_name?.toLowerCase().includes(q);
        const matchNis = r.nis?.toLowerCase?.().includes(q);
        if (!matchName && !matchNis) return false;
      }
      return true;
    });
  }, [rows, statusFilter, jenjangFilter, classFilter, search]);

  // ✅ UPDATED: hasil pencarian buat picker "Pilih Siswa" (dipakai di tab
  // Isi Data/Preview kalau belum ada selectedStudent). Dulu picker ini
  // CUMA bisa dicari lewat nama/NIS (harus ngetik dulu baru muncul
  // hasil) -- sekarang bisa juga di-narrow lewat dropdown Jenjang/Kelas
  // (persis kayak filter di tab "Data Siswa"), dan kalau salah satu
  // filter itu aktif, hasil boleh muncul WALAU kolom pencarian kosong
  // (misal wali kelas cuma mau browse "kelas 8B" tanpa inget nama
  // siapa2). Kalau gak ada query DAN gak ada filter aktif, tetep kosong
  // -- biar gak nge-render ratusan siswa sekaligus pas box baru dibuka.
  // Dibatasi PICKER_LIMIT biar ringan.
  const PICKER_LIMIT = 30;
  const pickerMatches = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;
    const hasClassFilter = pickerJenjang !== "all" || pickerClass !== "all";
    if (!hasQuery && !hasClassFilter) return [];
    return rows
      .filter((r) => {
        if (pickerJenjang !== "all" && getJenjang(r.class_id) !== pickerJenjang) return false;
        if (pickerClass !== "all" && r.class_id !== pickerClass) return false;
        if (hasQuery) {
          const matchName = r.full_name?.toLowerCase().includes(q);
          const matchNis = r.nis?.toLowerCase?.().includes(q);
          if (!matchName && !matchNis) return false;
        }
        return true;
      })
      .slice(0, PICKER_LIMIT);
  }, [rows, pickerQuery, pickerJenjang, pickerClass]);

  // Daftar jenjang unik (7/8/9) dari classOptions, dipakai bareng buat
  // dropdown Jenjang di tab "Data Siswa" MAUPUN picker "Pilih Siswa".
  const jenjangOptions = useMemo(() => {
    return [...new Set(classOptions.map((c) => c.jenjang).filter(Boolean))].sort();
  }, [classOptions]);

  // Dropdown Kelas (kedua) di tab "Data Siswa" -- cuma nampilin kelas
  // dari jenjang yang lagi dipilih di dropdown pertama. Kalau jenjang
  // "Semua", tampilkan semua.
  const filteredClassOptions = useMemo(() => {
    if (jenjangFilter === "all") return classOptions;
    return classOptions.filter((c) => c.jenjang === jenjangFilter);
  }, [classOptions, jenjangFilter]);

  // Sama kayak filteredClassOptions di atas, tapi versi picker (state
  // pickerJenjang, terpisah dari jenjangFilter tab list).
  const pickerFilteredClassOptions = useMemo(() => {
    if (pickerJenjang === "all") return classOptions;
    return classOptions.filter((c) => c.jenjang === pickerJenjang);
  }, [classOptions, pickerJenjang]);

  // Reset ke halaman pertama (30 teratas) tiap kali filter/search berubah,
  // biar gak nyangkut di posisi scroll yang salah pas hasil filter beda.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, verifiedFilter, jenjangFilter, classFilter, search]);

  const paginatedRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );

  // "Pilih semua" ngikutin hasil filter yang lagi ditampilin, bukan semua
  // siswa di kelas -- biar konsisten sama apa yang keliatan di layar.
  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        // Semua yang keliatan lagi kepilih -> unselect semua yang keliatan.
        filteredRows.forEach((r) => next.delete(r.id));
      } else {
        filteredRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const handleExportPDF = async () => {
    const selectedRows = rows.filter((r) => selectedIds.has(r.id));
    if (selectedRows.length === 0) return;

    setExporting(true);
    try {
      const result = await exportStudentProfilePDF(selectedRows, {
        academicYear,
      });
      if (!result.success) {
        setError(result.message || "Gagal export PDF.");
      }
    } finally {
      setExporting(false);
    }
  };

  // Export Excel pake selectedIds yang SAMA kayak export PDF, cuma manggil
  // fungsi & file yang beda (DataSiswaIndukExcel.js) -- gak perlu seleksi
  // terpisah, toolbar-nya juga digabung jadi 1 (lihat JSX toolbar di bawah).
  const handleExportExcel = async () => {
    const selectedRows = rows.filter((r) => selectedIds.has(r.id));
    if (selectedRows.length === 0) return;

    // className cuma diisi kalau SEMUA siswa yang dipilih emang dari kelas
    // yang sama (mis. lagi difilter ke "7B" terus pilih semua/sebagian).
    // classes.id sendiri udah berformat grade+section (mis. "7B"), jadi
    // tinggal dipake langsung sebagai label kelas di judul Excel. Kalau
    // seleksinya lintas kelas (classFilter "all" terus pilih siswa dari
    // kelas macem-macem), className dibiarin undefined biar judul Excel
    // fallback ke judul umum (gak nyesatin nunjuk 1 kelas doang).
    const distinctClassIds = [...new Set(selectedRows.map((r) => r.class_id).filter(Boolean))];
    const className = distinctClassIds.length === 1 ? distinctClassIds[0] : undefined;

    setExportingExcel(true);
    try {
      const result = await exportStudentProfileExcel(selectedRows, {
        academicYear,
        className,
      });
      if (!result.success) {
        setError(result.message || "Gagal export Excel.");
      }
    } finally {
      setExportingExcel(false);
    }
  };

  // Tandai/batalkan verifikasi 1 siswa. `verify=true` -> set verified_at =
  // sekarang (admin udah cocokin ke dokumen fisik). `verify=false` ->
  // batalin (verified_at = null), buat jaga-jaga kalau admin salah klik.
  // Update langsung ke `rows` & `selectedStudent` (optimistic) biar UI
  // ke-update instan tanpa nunggu refetch penuh dari server.
  const handleToggleVerify = async (studentId, verify) => {
    setVerifying(true);
    try {
      const verifiedAt = verify ? new Date().toISOString() : null;
      const { error: verifyErr } = await supabase
        .from("student_profile_details")
        .update({ verified_at: verifiedAt })
        .eq("student_id", studentId);

      if (verifyErr) throw verifyErr;

      setRows((prev) =>
        prev.map((r) => (r.id === studentId ? { ...r, isVerified: verify, verifiedAt } : r))
      );
      setSelectedStudent((prev) =>
        prev && prev.id === studentId ? { ...prev, isVerified: verify, verifiedAt } : prev
      );
    } catch (err) {
      console.error("[KelengkapanDataSiswa] Gagal update verifikasi:", err);
      setError("Gagal menyimpan status verifikasi. Coba lagi.");
    } finally {
      setVerifying(false);
    }
  };

  // Admin nyimpen SEMUA field lewat form edit di tab "Isi Data" (beda dari
  // handleToggleVerify yang cuma toggle 1 kolom verified_at). Upsert
  // langsung ke student_profile_details, sama kayak upsert di
  // StudentProfile.js sisi siswa -- bedanya field yang dikirim di sini
  // full semua (Kelompok A + B), bukan cuma Kelompok B.
  // verified_at otomatis di-set ke sekarang: karena yang isi/edit di sini
  // admin sendiri, datanya dianggap udah "terverifikasi" tanpa perlu
  // klik tombol verifikasi terpisah lagi setelahnya.
  // Setelah sukses, TU TETAP di tab "Isi Data" (gak auto-pindah ke list) --
  // cuma munculin notif sukses sebentar, biar bisa lanjut ngecek di tab
  // Preview atau langsung ngedit siswa lain lewat "Kembali ke Data Siswa".
  const handleSaveAdminEdit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setAdminEditError(null);
    setSaveSuccessVisible(false);
    setSavingAdmin(true);
    try {
      const verifiedAt = new Date().toISOString();
      const payload = {
        student_id: selectedStudent.id,
        updated_at: verifiedAt,
        verified_at: verifiedAt,
      };
      ADMIN_EDIT_FIELDS.forEach(({ key, type }) => {
        const raw = adminForm[key];
        if (type === "number") {
          payload[key] = raw === "" ? null : Number(raw);
        } else if (key === "jenis_kelamin") {
          // Jaga-jaga: paksa UPPERCASE walau isian aslinya mixed-case
          // (misal data lama / hasil fallback dari students.gender),
          // biar gak kena check constraint DB (lihat catatan di
          // ADMIN_EDIT_FIELDS di atas).
          payload[key] = raw === "" || raw == null ? null : String(raw).toUpperCase();
        } else {
          payload[key] = raw === "" ? null : raw;
        }
      });

      const { error: upsertErr } = await supabase
        .from("student_profile_details")
        .upsert(payload, { onConflict: "student_id" });

      if (upsertErr) throw upsertErr;

      // Update optimistic: gabungin field baru ke detail yang lama biar
      // kolom yang gak ada di ADMIN_EDIT_FIELDS (kalau ada) gak ke-drop.
      const newDetail = { ...(selectedStudent.detail || {}), ...payload };
      const newStatus = getCompletionStatus(newDetail);

      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedStudent.id
            ? {
                ...r,
                detail: newDetail,
                status: newStatus,
                isVerified: true,
                verifiedAt,
              }
            : r
        )
      );
      setSelectedStudent((prev) =>
        prev
          ? {
              ...prev,
              detail: newDetail,
              status: newStatus,
              isVerified: true,
              verifiedAt,
            }
          : prev
      );
      setAdminFormDirty(false);
      setSaveSuccessVisible(true);
    } catch (err) {
      console.error("[KelengkapanDataSiswa] Gagal simpan edit admin:", err);
      setAdminEditError("Gagal menyimpan data. Coba lagi.");
    } finally {
      setSavingAdmin(false);
    }
  };

  // Kalau ada perubahan belum disimpan (adminFormDirty), minta konfirmasi
  // dulu sebelum TU pindah tab/kembali ke list/ganti siswa lain -- biar
  // gak kehilangan isian gak sengaja. Dipanggil di tiap titik navigasi
  // keluar dari tab "Isi Data".
  const confirmDiscardIfDirty = () => {
    if (!adminFormDirty) return true;
    return window.confirm("Perubahan belum disimpan. Yakin mau keluar tanpa menyimpan?");
  };

  // Isi adminForm dari detail siswa yang dipilih, TANPA ngubah tab yang
  // lagi aktif. Dipakai bareng oleh openStudent() (dari list, otomatis
  // pindah tab) dan selectStudentInTab() (dari picker di dalam tab Isi
  // Data/Preview, tetap di tab yang sama).
  const loadStudentIntoForm = (student) => {
    setSelectedStudent(student);
    setAdminForm(emptyAdminForm(student.detail));
    setAdminEditError(null);
    setAdminFormDirty(false);
    setSaveSuccessVisible(false);
    setPickerQuery("");
    setPickerJenjang("all");
    setPickerClass("all");
  };

  // ✅ CHANGE: klik nama siswa dari list SELALU landing ke tab "Preview"
  // dulu (read-only) -- dulu admin/TU langsung ke "Isi Data", tapi itu
  // beresiko kepencet ubah data pas niatnya cuma mau ngecek. Preview lebih
  // aman jadi default "lihat dulu, edit belakangan". Mau edit tinggal 1
  // klik pindah ke tab "Isi Data" di tab bar -- siswa yang lagi dibuka
  // TETAP kepilih (selectedStudent gak direset), jadi gak nambah kerjaan
  // pilih ulang siswanya.
  const openStudent = (student) => {
    loadStudentIntoForm(student);
    setActivePageTab("preview");
  };

  // ✅ NEW: dipanggil dari picker "Pilih Siswa" di dalam tab Isi Data/
  // Preview -- beda dari openStudent(), tab yang lagi aktif TIDAK diubah
  // (user emang udah di tab itu, tinggal munculin data siswa yang dipilih).
  const selectStudentInTab = (student) => {
    loadStudentIntoForm(student);
  };

  // ====== NAVIGASI GESER SISWA SEBELUM/SESUDAHNYA (tab Isi Data & Preview) ======
  // Urutan siswa ngikutin `filteredRows` (list yang lagi difilter/dicari di
  // tab "Data Siswa"), BUKAN `paginatedRows` -- biar tetep bisa geser
  // lanjut ke siswa berikutnya walau siswa itu belum "dimuat" di halaman
  // list (pagination "Muat Lebih Banyak").
  const adjacentStudentIndex = selectedStudent
    ? filteredRows.findIndex((r) => r.id === selectedStudent.id)
    : -1;
  const prevStudent = adjacentStudentIndex > 0 ? filteredRows[adjacentStudentIndex - 1] : null;
  const nextStudent =
    adjacentStudentIndex >= 0 && adjacentStudentIndex < filteredRows.length - 1
      ? filteredRows[adjacentStudentIndex + 1]
      : null;

  // Beda dari openStudent: TETAP di tab yang lagi aktif (Isi Data /
  // Preview), gak di-reset balik ke default berdasarkan role. Guard dirty
  // tetap jalan biar perubahan yang belum disimpan gak ke-skip diam-diam.
  const goToAdjacentStudent = (direction) => {
    const target = direction === "prev" ? prevStudent : nextStudent;
    if (!target) return;
    if (!confirmDiscardIfDirty()) return;
    setSelectedStudent(target);
    setAdminForm(emptyAdminForm(target.detail));
    setAdminEditError(null);
    setAdminFormDirty(false);
    setSaveSuccessVisible(false);
  };

  // Riwayat mutasi (masuk/keluar) siswa yang lagi dibuka -- cuma info,
  // gak bisa diedit dari sini. Reset dulu tiap ganti siswa biar gak
  // sempet numpuk data siswa sebelumnya pas fetch masih jalan.
  useEffect(() => {
    if (!selectedStudent?.id) {
      setMutationHistory([]);
      return;
    }
    let cancelled = false;
    setMutationHistory([]);
    setMutationHistoryLoading(true);
    supabase
      .from("student_mutations")
      .select("*")
      .eq("student_id", selectedStudent.id)
      .order("mutation_date", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          console.error("Error fetching student_mutations:", fetchError);
          return;
        }
        setMutationHistory(data || []);
      })
      .finally(() => {
        if (!cancelled) setMutationHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.id]);

  // ===== Deep-link dari halaman "Data Siswa" (?student=<id>) =====
  // Begitu `rows` selesai kemuat, cek apakah halaman ini dibuka lewat link
  // dari Students.js. Kalau iya & siswanya ketemu, langsung buka detailnya
  // (tanpa TU harus cari manual lagi). Cuma jalan sekali per kunjungan.
  const appliedDeepLinkRef = useRef(false);
  useEffect(() => {
    if (appliedDeepLinkRef.current) return;
    if (!rows.length) return;
    const studentIdParam = searchParams.get("student");
    if (!studentIdParam) return;

    const match = rows.find((r) => String(r.id) === String(studentIdParam));
    appliedDeepLinkRef.current = true;
    setSearchParams({}, { replace: true });
    if (match) {
      openStudent(match);
    }
  }, [rows, searchParams, setSearchParams]);

  // Balik ke halaman "Data Siswa" (Students.js) buat siswa yang lagi
  // dibuka -- BEDA dari backToList (yang cuma balik ke tab list internal
  // halaman ini). Kirim NIS lewat query param biar Students.js otomatis
  // filter ke siswa yang sama.
  const goToDataSiswa = () => {
    if (!confirmDiscardIfDirty()) return;
    const nis = selectedStudent?.nis;
    navigate(nis ? `/students?search=${encodeURIComponent(nis)}` : "/students");
  };

  // Balik ke tab "Data Siswa" (list). Kalau lagi di tab Isi Data & ada
  // perubahan belum disimpan, minta konfirmasi dulu.
  const backToList = () => {
    if (!confirmDiscardIfDirty()) return;
    setSelectedStudent(null);
    setAdminForm(null);
    setAdminEditError(null);
    setAdminFormDirty(false);
    setSaveSuccessVisible(false);
    setPickerQuery("");
    setPickerJenjang("all");
    setPickerClass("all");
    setActivePageTab("list");
  };

  // Ganti tab level-halaman (dipanggil dari tab bar). Klik tab "Data
  // Siswa" == backToList (ada guard dirty). Klik "Isi Data"/"Preview" udah
  // gak butuh selectedStudent lagi -- kalau belum ada siswa yang dipilih,
  // tab-nya nampilin picker "Pilih Siswa" (lihat renderStudentPicker()).
  const goToTab = (tabKey) => {
    if (tabKey === "list") {
      backToList();
      return;
    }
    setActivePageTab(tabKey);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-400 dark:border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Memuat data kelengkapan siswa...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 sm:p-4 md:p-6">
      <div>
        {/* ====== HEADER ====== */}
        <div className="bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 rounded-xl sm:rounded-2xl shadow-lg p-5 sm:p-7 mb-5 sm:mb-6 relative overflow-hidden border border-blue-200/50 dark:border-slate-700">
          <div className="absolute inset-0 opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
          </div>
          <div className="relative min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Kelengkapan Data Siswa Induk
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
              Pantau Siswa/Orang Tua Yang Sudah & Belum Melengkapi Data Alamat Dan Kontak.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
            ⚠️ {error}
          </div>
        )}

        {/* ====== TAB HALAMAN UTAMA ====== */}
        {/* Ganti sistem modal yang lama: sekarang navigasi antar "Data
            Siswa" (list) <-> "Isi Data" (form edit, admin/TU only) <->
            "Preview" (ringkasan read-only) pake tab di level halaman, biar
            keliatan jelas lagi ngapain (isi data vs cuma liat), bukan
            numpuk semua di 1 modal kecil. */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-5 sm:mb-6 overflow-x-auto">
          {/* ✅ Tab "Isi Data" SENGAJA disembunyiin dari Wali Kelas -- wali
              kelas cuma boleh liat "Data Siswa" & "Preview" (read-only),
              gak boleh isi/edit data siswa. Isi/edit tetep eksklusif
              Admin/TU (lihat juga gate di DataSiswaIndukDetailPanel.js,
              yang balik ke (isAdmin || isTU) doang buat tab ini). */}
          {[
            { key: "list", label: "Data Siswa" },
            ...(isAdmin || isTU ? [{ key: "isi", label: "Isi Data" }] : []),
            { key: "preview", label: "Preview" },
          ].map((tab) => {
            const active = activePageTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => goToTab(tab.key)}
                className={`shrink-0 px-4 py-2.5 text-base sm:text-lg font-extrabold uppercase border-b-2 -mb-px transition ${
                  active
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                {tab.label}
                {tab.key !== "list" && selectedStudent && (
                  <span className="hidden sm:inline text-xs font-normal text-slate-400 dark:text-slate-500">
                    {" "}
                    · {selectedStudent.full_name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activePageTab === "list" && (
          <DataSiswaIndukListTab
            isWaliKelas={isWaliKelas}
            summary={summary}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            completionPercent={completionPercent}
            completionScopeLabel={completionScopeLabel}
            search={search}
            setSearch={setSearch}
            verifiedFilter={verifiedFilter}
            setVerifiedFilter={setVerifiedFilter}
            jenjangFilter={jenjangFilter}
            setJenjangFilter={setJenjangFilter}
            classFilter={classFilter}
            setClassFilter={setClassFilter}
            jenjangOptions={jenjangOptions}
            filteredClassOptions={filteredClassOptions}
            filteredRows={filteredRows}
            paginatedRows={paginatedRows}
            visibleCount={visibleCount}
            setVisibleCount={setVisibleCount}
            PAGE_SIZE={PAGE_SIZE}
            selectedIds={selectedIds}
            toggleSelectOne={toggleSelectOne}
            toggleSelectAllFiltered={toggleSelectAllFiltered}
            allFilteredSelected={allFilteredSelected}
            handleExportPDF={handleExportPDF}
            handleExportExcel={handleExportExcel}
            exporting={exporting}
            exportingExcel={exportingExcel}
            openStudent={openStudent}
          />
        )}
      </div>

      <DataSiswaIndukDetailPanel
        activePageTab={activePageTab}
        setActivePageTab={setActivePageTab}
        selectedStudent={selectedStudent}
        isAdmin={isAdmin}
        isTU={isTU}
        isWaliKelas={isWaliKelas}
        prevStudent={prevStudent}
        nextStudent={nextStudent}
        goToAdjacentStudent={goToAdjacentStudent}
        handleToggleVerify={handleToggleVerify}
        verifying={verifying}
        goToDataSiswa={goToDataSiswa}
        backToList={backToList}
        mutationHistory={mutationHistory}
        mutationHistoryLoading={mutationHistoryLoading}
        pickerQuery={pickerQuery}
        setPickerQuery={setPickerQuery}
        pickerJenjang={pickerJenjang}
        setPickerJenjang={setPickerJenjang}
        pickerClass={pickerClass}
        setPickerClass={setPickerClass}
        pickerMatches={pickerMatches}
        jenjangOptions={jenjangOptions}
        pickerFilteredClassOptions={pickerFilteredClassOptions}
        waliKelasStudents={isWaliKelas ? rows : []}
        selectStudentInTab={selectStudentInTab}
        adminForm={adminForm}
        setAdminForm={setAdminForm}
        setAdminFormDirty={setAdminFormDirty}
        setSaveSuccessVisible={setSaveSuccessVisible}
        saveSuccessVisible={saveSuccessVisible}
        adminEditError={adminEditError}
        savingAdmin={savingAdmin}
        handleSaveAdminEdit={handleSaveAdminEdit}
      />
    </div>
  );
}
