// portal-siswa/AkunSiswaTab.js
// (sebelumnya GenerateAkunSiswaTab.js, dipindah + rename ke sini karena ini
// jadi salah satu sub-tab dari card "Portal Siswa" bareng modul lain kayak
// Saran Siswa & Pengumuman -- lihat PortalSiswaTab.js buat wrapper-nya.)
//
// Tab admin buat kelola akun student_auth per kelas — generate massal,
// reset password, dan nonaktifkan akun (siswa lulus/pindah).
//
// ✅ UPDATE: Password sekarang UNIK PER SISWA (3 digit terakhir NIS + 3
// huruf acak, contoh "245-xyz") — bukan lagi 1 password dipake bareng
// sekelas kayak sebelumnya (`kelas7f` dst). Akun yang UDAH dibuat sebelum
// update ini SENGAJA dibiarin pake password lama, gak di-migrate otomatis
// -- kalau admin mau ikut diseragamkan, tinggal pake tombol "Reset" per
// siswa atau "Reset Semua Password Kelas Ini".
//
// Username tetap = NIS siswa (disanitize), is_active = true pas dibuat.
// Siswa yang udah punya akun otomatis di-skip pas generate (gak bakal dobel).
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileDown,
  X,
  Archive,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  Ban,
} from "lucide-react";

// URL portal siswa yang dicantumin di PDF akun login buat orang tua/wali
const PORTAL_URL = "https://administrasi-smp-muslimin.vercel.app/login-siswa";

// Ambil kode jenjang dari class_id, contoh "7A" -> "7", "10B" -> "10".
// Diambil dari angka di depan class_id, bukan hardcode daftar jenjang,
// jadi otomatis kerja buat SMP (7/8/9) maupun SMA/SMK (10/11/12).
const extractJenjang = (classId) => {
  if (!classId) return null;
  const match = String(classId).match(/^\d+/);
  return match ? match[0] : String(classId).charAt(0);
};

// NIS di tabel `students` kadang keformat aneh (titik, spasi) tergantung
// gimana data itu awalnya di-import per kelas -- pernah kejadian di 7F & 8F.
// Daripada nge-copy NIS mentah-mentah ke username, dibersihin dulu di sini
// (sisain angka & huruf doang) supaya konsisten mau data sumbernya rapi
// atau enggak.
const sanitizeUsername = (nis) => String(nis ?? "").replace(/[^0-9A-Za-z]/g, "");

// Pecah array jadi beberapa batch kecil. Dipake buat query `.in(...)` yang
// potensial nerima ratusan ID sekaligus (mis. pas filter "Semua Kelas" narik
// siswa dari banyak kelas) -- kalau dikirim sekaligus dalam 1 request GET,
// URL-nya bisa kepanjangan dan ditolak server (400 Bad Request). Batch 150
// item (UUID ~36 char) masih aman jauh di bawah limit URL umum.
const CHUNK_SIZE = 150;
const chunkArray = (arr, size = CHUNK_SIZE) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// Huruf buat suffix password acak -- sengaja exclude i/l/o (gampang keketuker
// sama 1 dan 0) biar ortu/siswa gak salah ketik pas login dari HP.
const PASSWORD_LETTERS = "abcdefghjkmnpqrstuvwxyz";
const randomLetters = (length) => {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += PASSWORD_LETTERS[Math.floor(Math.random() * PASSWORD_LETTERS.length)];
  }
  return result;
};

// Password unik per siswa: 3 digit terakhir NIS + "-" + 3 huruf acak
// (contoh "245-xyz"). Gantiin pola lama "1 password buat 1 kelas" yang
// rawan -- kalau 1 bocor, sekelas ikut kebobol. Format ini tetap gampang
// diinget/diketik (based on NIS anak sendiri) tapi beda-beda tiap siswa.
const generateUniquePassword = (nis) => {
  const digits = String(nis ?? "").replace(/[^0-9]/g, "");
  const lastThree = digits.slice(-3).padStart(3, "0");
  return `${lastThree}-${randomLetters(3)}`;
};

export default function AkunSiswaTab({ showToast }) {
  const [classList, setClassList] = useState([]);
  const [selectedJenjang, setSelectedJenjang] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ✅ Sengaja gak auto-load siswa pas tab ini pertama kali dibuka -- default
  // filter-nya "Semua Jenjang" + "Semua Kelas", jadi kalau langsung ditarik
  // pas mount bisa narik SEMUA siswa aktif di sekolah tanpa admin minta.
  // `hasFiltered` ini baru jadi `true` begitu admin ganti Jenjang atau Kelas
  // (apa pun pilihannya, termasuk balik ke "Semua") -- baru dari situ data
  // boleh di-fetch.
  const [hasFiltered, setHasFiltered] = useState(false);

  // State khusus buat fitur "Generate Semua Kelas Sekaligus". Dipisah dari
  // state per-kelas di atas biar gak saling ganggu -- summary di-load dulu
  // (preview, belum nulis apa-apa ke DB), baru generate beneran kalau admin
  // udah cek & klik tombol konfirmasi.
  const [allSummary, setAllSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);

  // State buat tombol "Download Semua PDF (ZIP)" -- proses ini murni baca
  // data + generate file di browser (gak nulis apa-apa ke DB), jadi gak
  // perlu tahap preview/konfirmasi kayak handleGenerateAll.
  const [downloadingAllPdf, setDownloadingAllPdf] = useState(false);

  // ✅ State baru buat fitur kelola akun per siswa: reset password (single &
  // bulk per kelas), lihat/sembunyiin password, dan nonaktifkan akun.
  const [resettingId, setResettingId] = useState(null);
  const [resettingClass, setResettingClass] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [revealedIds, setRevealedIds] = useState(() => new Set());

  // Daftar kelas diambil dari class_id unik yang ada di tabel `students`
  // (bukan hardcode) — jadi kelas baru otomatis muncul begitu siswanya
  // ke-import, gak perlu edit kode di sini.
  useEffect(() => {
    const loadClasses = async () => {
      setLoadingClasses(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("class_id")
          .eq("is_active", true);
        if (error) throw error;

        const unique = [...new Set((data || []).map((s) => s.class_id).filter(Boolean))].sort();
        setClassList(unique);
        // ✅ Sengaja gak auto-pilih jenjang pertama lagi -- biar defaultnya
        // tetep "Semua Jenjang" pas tab ini pertama kali dibuka.
      } catch (err) {
        console.error("[AkunSiswaTab] Gagal load daftar kelas:", err);
        showToast && showToast("Gagal memuat daftar kelas", "error");
      } finally {
        setLoadingClasses(false);
      }
    };
    loadClasses();
  }, [showToast]);

  const jenjangList = [...new Set(classList.map(extractJenjang).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b)
  );
  // selectedJenjang === "" => "Semua Jenjang", jadi semua kelas ikut masuk.
  const classesInJenjang = useMemo(
    () =>
      selectedJenjang ? classList.filter((c) => extractJenjang(c) === selectedJenjang) : classList,
    [classList, selectedJenjang]
  );

  // ✅ Setiap kali JENJANG diganti manual (termasuk balik ke "Semua
  // Jenjang"), kelas yang lagi dipilih SELALU direset ke "Semua Kelas" --
  // gak dicek dulu valid apa nggak. Soalnya kalau cuma dicek validity,
  // pas balik dari "Kelas 7 > 7B" ke "Semua Jenjang", 7B tetep dianggap
  // "valid" (karena masuk juga ke classesInJenjang pas Semua Jenjang) jadi
  // gak ke-reset -- padahal harusnya balik ke "Semua Kelas".
  // prevJenjangRef dipake buat bedain "jenjang beneran diganti" vs efek ini
  // ke-trigger ulang gara-gara classesInJenjang berubah referensi doang
  // (misal abis reload data kelas tapi jenjangnya sama).
  const prevJenjangRef = useRef(selectedJenjang);
  useEffect(() => {
    const jenjangBerubah = prevJenjangRef.current !== selectedJenjang;
    prevJenjangRef.current = selectedJenjang;

    if (jenjangBerubah) {
      setSelectedClass("");
      return;
    }
    // Jenjang-nya sama, tapi daftar kelas kesedia (mis. abis reload) --
    // pastiin kelas yang lagi kepilih masih ada di jenjang ini.
    if (selectedClass && !classesInJenjang.includes(selectedClass)) {
      setSelectedClass("");
    }
  }, [selectedJenjang, classesInJenjang]);

  // Siswa + status akun (punya/belum) buat kelas yang lagi dipilih.
  // ✅ selectedClass === "" ("Semua Kelas") -> tarik siswa dari SEMUA kelas
  // yang ada di jenjang yang lagi aktif (classesInJenjang), bukan cuma 1
  // kelas doang. Kalau jenjang-nya juga "Semua Jenjang", classesInJenjang
  // otomatis udah berisi semua kelas yang ada.
  const loadStudents = useCallback(async () => {
    if (!hasFiltered) {
      setStudents([]);
      return;
    }
    if (!selectedClass && classesInJenjang.length === 0) {
      setStudents([]);
      return;
    }
    setLoadingList(true);
    try {
      let query = supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      query = selectedClass
        ? query.eq("class_id", selectedClass)
        : query.in("class_id", classesInJenjang);

      const { data: studentRows, error: studentErr } = await query;
      if (studentErr) throw studentErr;

      const ids = (studentRows || []).map((s) => s.id);
      let authRows = [];
      if (ids.length > 0) {
        const results = await Promise.all(
          chunkArray(ids).map((batch) =>
            supabase
              .from("student_auth")
              .select("student_id, username, password, is_active")
              .in("student_id", batch)
          )
        );
        const firstErr = results.find((r) => r.error)?.error;
        if (firstErr) throw firstErr;
        authRows = results.flatMap((r) => r.data || []);
      }
      const authMap = {};
      authRows.forEach((a) => {
        authMap[a.student_id] = a;
      });

      setStudents(
        (studentRows || []).map((s) => ({
          ...s,
          hasAccount: !!authMap[s.id],
          username: authMap[s.id]?.username || null,
          password: authMap[s.id]?.password || null,
          isActive: authMap[s.id]?.is_active ?? true,
        }))
      );
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal memuat siswa:", err);
      showToast && showToast("Gagal memuat daftar siswa", "error");
    } finally {
      setLoadingList(false);
    }
  }, [hasFiltered, selectedClass, classesInJenjang, showToast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const belumPunyaAkun = students.filter((s) => !s.hasAccount);
  const nisKosong = belumPunyaAkun.filter((s) => !s.nis);
  const bisaDigenerate = belumPunyaAkun.filter((s) => !!s.nis);

  const handleGenerate = async () => {
    if (bisaDigenerate.length === 0) return;
    setGenerating(true);
    try {
      const rows = bisaDigenerate.map((s) => ({
        student_id: s.id,
        username: sanitizeUsername(s.nis),
        password: generateUniquePassword(s.nis),
        is_active: true,
      }));
      const { error } = await supabase.from("student_auth").insert(rows);
      if (error) throw error;

      showToast &&
        showToast(
          `${rows.length} akun berhasil dibuat${
            nisKosong.length > 0 ? `, ${nisKosong.length} dilewati (NIS kosong)` : ""
          }.`,
          "success"
        );
      await loadStudents();
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal generate akun:", err);
      showToast && showToast("Gagal membuat akun. Cek console buat detail error.", "error");
    } finally {
      setGenerating(false);
    }
  };

  // ==== Generate PDF Daftar Akun Login (per kelas) ====
  // Diekstrak jadi fungsi terpisah dari handleDownloadPdf supaya bisa dipake
  // ulang buat fitur "Download Semua PDF (ZIP)" -- satu fungsi ini yang
  // bikin 1 dokumen PDF per kelas, dipanggil berkali-kali (1x per kelas)
  // pas generate ZIP. Cuma masukin siswa yang UDAH punya akun (withAccount)
  // - PDF ini buat dibagiin ke orang tua/wali, jadi gak ada gunanya
  // nampilin siswa yang belum digenerate akunnya. Return doc (jsPDF
  // instance), belum di-save/download -- itu jadi tanggung jawab caller.
  const buildAccountPdfDoc = (classId, withAccount) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
    // Jarak aman dari bawah halaman buat footer (nomor halaman + teks rahasia)
    // supaya isi (Cara Login / Catatan Penting) gak pernah mepet/ketiban footer.
    const bottomLimit = pageHeight - 55;
    let y = 50;

    // Pindah halaman kalau konten berikutnya (setinggi `neededHeight`) udah
    // gak muat lagi di sisa halaman sekarang -- dipake sebelum nulis blok
    // "Cara Login" & "Catatan Penting" yang gak otomatis pecah halaman kayak
    // autoTable, biar gak ada teks yang kepotong pas ganti halaman.
    const checkPageBreak = (neededHeight) => {
      if (y + neededHeight > bottomLimit) {
        doc.addPage();
        y = 50;
      }
    };

    // Judul
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Daftar Akun Login Portal Siswa", pageWidth / 2, y, { align: "center" });
    y += 20;

    doc.setFontSize(12);
    doc.text(`Kelas ${classId} — Untuk Orang Tua/Wali Siswa`, pageWidth / 2, y, {
      align: "center",
    });
    y += 18;

    // Info jumlah siswa - berguna terutama kalau daftarnya sampai beberapa
    // halaman, jadi orang tua/wali langsung tau totalnya dari halaman pertama.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Menampilkan ${withAccount.length} siswa`, pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0);
    y += 18;

    // Paragraf pembuka
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const intro = doc.splitTextToSize(
      "Bapak/Ibu dapat memantau presensi, jadwal pelajaran, dan informasi sekolah putra/putrinya " +
        "melalui portal siswa. Berikut akun login untuk masing-masing siswa:",
      pageWidth - marginX * 2
    );
    doc.text(intro, marginX, y);
    y += intro.length * 13 + 8;

    // Tabel akun (autoTable otomatis pecah ke halaman baru sendiri kalau
    // daftarnya panjang, header tabel ikut diulang di tiap halaman baru)
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX, bottom: 55 },
      head: [["No", "Nama Siswa", "Username", "Password"]],
      body: withAccount.map((s, idx) => [
        String(idx + 1),
        s.full_name,
        s.username || "-",
        s.password || "-",
      ]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 30, halign: "center" } },
    });

    y = doc.lastAutoTable.finalY + 24;

    // Cara Login
    checkPageBreak(90);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Cara Login", marginX, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const caraLogin = [
      `Buka ${PORTAL_URL} lewat browser HP/laptop.`,
      "Masukkan Username dan Password sesuai tabel di atas (kolom milik anak Bapak/Ibu).",
      "Klik tombol Masuk.",
    ];
    caraLogin.forEach((line, idx) => {
      const wrapped = doc.splitTextToSize(`${idx + 1}. ${line}`, pageWidth - marginX * 2);
      checkPageBreak(wrapped.length * 13 + 2);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 13 + 2;
    });
    y += 10;

    // Catatan Penting
    checkPageBreak(100);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Catatan Penting", marginX, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const catatan = [
      "Password di atas adalah password awal/default yang sama untuk semua siswa. Disarankan " +
        "segera diganti lewat menu Akun > Ganti Password setelah login pertama kali.",
      "Username dan Password bersifat rahasia. Mohon tidak dibagikan ke pihak lain selain orang " +
        "tua/wali siswa yang bersangkutan.",
      "Jika lupa password atau mengalami kendala login, silakan hubungi wali kelas.",
    ];
    catatan.forEach((line) => {
      const wrapped = doc.splitTextToSize(`•  ${line}`, pageWidth - marginX * 2);
      checkPageBreak(wrapped.length * 13 + 4);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 13 + 4;
    });

    // Footer rahasia + nomor halaman - ditaruh di SETIAP halaman (bukan cuma
    // halaman terakhir) karena daftar per kelas kadang lebih dari 1 halaman.
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `Dokumen ini bersifat rahasia — hanya untuk orang tua/wali siswa Kelas ${classId}.`,
        pageWidth / 2,
        pageHeight - 32,
        { align: "center" }
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth / 2, pageHeight - 18, {
        align: "center",
      });
      doc.setTextColor(0);
    }

    return doc;
  };

  // Download PDF buat kelas yang lagi dipilih di dropdown (pake state
  // `students` yang udah ke-load) -- tinggal bungkus buildAccountPdfDoc.
  const handleDownloadPdf = () => {
    const withAccount = students.filter((s) => s.hasAccount);
    if (withAccount.length === 0) return;
    const doc = buildAccountPdfDoc(selectedClass, withAccount);
    doc.save(`Daftar_Akun_Login_Siswa_${selectedClass}.pdf`);
  };

  // ==== Download Semua PDF Sekaligus (ZIP, satu PDF per kelas) ====
  // Query semua siswa aktif + semua akun (student_auth) langsung dari sini
  // (gak gantungan ke `allSummary`/`students` biar tombolnya bisa langsung
  // dipencet tanpa harus klik "Cek Semua Kelas" dulu). Sama kayak
  // loadAllSummary, fetch student_auth TANPA filter .in() lalu dicocokin
  // di JS -- biar gak kena limit panjang URL kalau siswanya ratusan.
  // Tiap kelas tetep jadi 1 file PDF sendiri (isi & format sama persis kayak
  // download per-kelas), cuma dibundel dalam 1 file .zip biar sekali klik.
  const handleDownloadAllPdf = async () => {
    setDownloadingAllPdf(true);
    try {
      const { data: allStudents, error: studentErr } = await supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (studentErr) throw studentErr;

      const { data: authData, error: authErr } = await supabase
        .from("student_auth")
        .select("student_id, username, password");
      if (authErr) throw authErr;

      const authMap = {};
      (authData || []).forEach((a) => {
        authMap[a.student_id] = a;
      });

      // Kelompokin siswa yang UDAH punya akun per class_id.
      const withAccountByClass = {};
      (allStudents || []).forEach((s) => {
        const auth = authMap[s.id];
        if (!auth) return; // skip siswa yang belum punya akun
        const key = s.class_id || "(tanpa kelas)";
        if (!withAccountByClass[key]) withAccountByClass[key] = [];
        withAccountByClass[key].push({
          ...s,
          username: auth.username,
          password: auth.password,
        });
      });

      const classKeys = Object.keys(withAccountByClass).sort();
      if (classKeys.length === 0) {
        showToast && showToast("Belum ada siswa yang punya akun di kelas manapun.", "error");
        return;
      }

      const zip = new JSZip();
      classKeys.forEach((classId) => {
        const doc = buildAccountPdfDoc(classId, withAccountByClass[classId]);
        // Nama file di dalam ZIP disamain kayak nama file download per-kelas
        // (Daftar_Akun_Login_Siswa_<KELAS>.pdf) biar konsisten & gampang
        // dikenali admin/wali kelas begitu diekstrak.
        zip.file(`Daftar_Akun_Login_Siswa_${classId}.pdf`, doc.output("blob"));
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      const tanggal = new Date().toISOString().slice(0, 10);
      link.download = `Daftar_Akun_Login_Siswa_Semua_Kelas_${tanggal}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast &&
        showToast(`ZIP berhasil dibuat: ${classKeys.length} file PDF (1 per kelas).`, "success");
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal membuat ZIP semua PDF:", err);
      showToast && showToast("Gagal membuat ZIP. Cek console buat detail error.", "error");
    } finally {
      setDownloadingAllPdf(false);
    }
  };

  // ==== Fitur "Generate Semua Kelas Sekaligus" ====
  // Alurnya sengaja 2 tahap: (1) loadAllSummary cuma BACA data & itung
  // preview per kelas -- belum nulis apa-apa ke DB, (2) handleGenerateAll
  // baru insert beneran, dan cuma bisa dipanggil setelah admin liat preview
  // & klik tombol konfirmasi. Siswa yang udah punya akun (di kelas manapun,
  // termasuk 7B/7F/8F yang udah digenerate) otomatis kelewat karena dicek
  // ke `existingIds` -- jadi gak bakal ke-generate ulang / dobel.
  const loadAllSummary = async () => {
    setLoadingSummary(true);
    try {
      const { data: allStudents, error: studentErr } = await supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .eq("is_active", true);
      if (studentErr) throw studentErr;

      // Sengaja gak pake .in("student_id", ids) di sini kayak versi per-kelas
      // -- kalau dipanggil buat SEMUA siswa sekolah sekaligus (ratusan UUID),
      // query string-nya bisa kepanjangan dan ditolak Supabase/PostgREST.
      // Ambil semua student_id yang udah ada akunnya tanpa filter, terus
      // cocokin di JS aja -- lebih ringan buat network & gak ada limit URL.
      const { data: authData, error: authErr } = await supabase
        .from("student_auth")
        .select("student_id");
      if (authErr) throw authErr;
      const existingIds = new Set((authData || []).map((a) => a.student_id));

      const byClass = {};
      (allStudents || []).forEach((s) => {
        const key = s.class_id || "(tanpa kelas)";
        if (!byClass[key]) {
          byClass[key] = { class_id: key, total: 0, belum: 0, kosongNis: 0 };
        }
        byClass[key].total += 1;
        if (!existingIds.has(s.id)) {
          if (s.nis) byClass[key].belum += 1;
          else byClass[key].kosongNis += 1;
        }
      });

      const perClass = Object.values(byClass).sort((a, b) => a.class_id.localeCompare(b.class_id));

      setAllSummary({ perClass, students: allStudents || [], existingIds });
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal memuat ringkasan semua kelas:", err);
      showToast && showToast("Gagal memuat ringkasan semua kelas", "error");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!allSummary) return;
    const toGenerate = allSummary.students.filter(
      (s) => !allSummary.existingIds.has(s.id) && !!s.nis
    );
    if (toGenerate.length === 0) return;

    setGeneratingAll(true);
    try {
      const rows = toGenerate.map((s) => ({
        student_id: s.id,
        username: sanitizeUsername(s.nis),
        password: generateUniquePassword(s.nis),
        is_active: true,
      }));
      const { error } = await supabase.from("student_auth").insert(rows);
      if (error) throw error;

      showToast &&
        showToast(`${rows.length} akun berhasil dibuat sekaligus untuk semua kelas.`, "success");
      setAllSummary(null);
      await loadStudents();
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal generate semua kelas:", err);
      showToast && showToast("Gagal membuat akun massal. Cek console buat detail error.", "error");
    } finally {
      setGeneratingAll(false);
    }
  };

  const totalBelumSemua = allSummary ? allSummary.perClass.reduce((sum, c) => sum + c.belum, 0) : 0;
  const totalKosongNisSemua = allSummary
    ? allSummary.perClass.reduce((sum, c) => sum + c.kosongNis, 0)
    : 0;

  // ==== Show/Hide & Copy Password ====
  const toggleReveal = (studentId) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const copyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password);
      showToast && showToast("Password disalin ke clipboard.", "success");
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal menyalin password:", err);
      showToast && showToast("Gagal menyalin password.", "error");
    }
  };

  // ==== Reset Password 1 Siswa ====
  // Generate password baru (format unik, "245-xyz") buat 1 siswa aja --
  // dipake kalau siswa/ortu lupa password atau mau diseragamkan ke format
  // baru. Password lama otomatis ga berlaku lagi begitu diupdate.
  const handleResetPassword = async (student) => {
    if (!student?.nis) {
      showToast &&
        showToast("Siswa ini belum punya NIS, lengkapi dulu di Manajemen Sekolah.", "error");
      return;
    }
    if (
      !window.confirm(
        `Reset password ${student.full_name}? Password lama otomatis ga berlaku lagi.`
      )
    ) {
      return;
    }
    setResettingId(student.id);
    try {
      const newPassword = generateUniquePassword(student.nis);
      const { error } = await supabase
        .from("student_auth")
        .update({ password: newPassword })
        .eq("student_id", student.id);
      if (error) throw error;

      showToast && showToast(`Password ${student.full_name} berhasil direset.`, "success");
      setRevealedIds((prev) => new Set(prev).add(student.id));
      await loadStudents();
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal reset password:", err);
      showToast && showToast("Gagal reset password. Cek console buat detail error.", "error");
    } finally {
      setResettingId(null);
    }
  };

  // ==== Reset Password Semua Siswa di Kelas Ini ====
  // Buat kebutuhan kayak awal tahun ajaran -- mau nyeragamin semua akun di
  // 1 kelas ke format password unik yang baru sekaligus, tanpa reset 1-1.
  const handleResetAllInClass = async () => {
    const withAccount = students.filter((s) => s.hasAccount && !!s.nis);
    if (withAccount.length === 0) return;
    if (
      !window.confirm(
        `Reset password SEMUA siswa (${withAccount.length}) di Kelas ${selectedClass}? Password lama otomatis ga berlaku lagi.`
      )
    ) {
      return;
    }
    setResettingClass(true);
    try {
      const updates = withAccount.map((s) =>
        supabase
          .from("student_auth")
          .update({ password: generateUniquePassword(s.nis) })
          .eq("student_id", s.id)
      );
      const results = await Promise.all(updates);
      const hasError = results.some((r) => r.error);
      if (hasError) throw new Error("Sebagian password gagal direset");

      showToast &&
        showToast(
          `Password ${withAccount.length} siswa di Kelas ${selectedClass} berhasil direset semua.`,
          "success"
        );
      await loadStudents();
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal reset password sekelas:", err);
      showToast &&
        showToast("Gagal reset password sekelas. Cek console buat detail error.", "error");
    } finally {
      setResettingClass(false);
    }
  };

  // ==== Aktifkan / Nonaktifkan Akun ====
  // Buat siswa lulus/pindah sekolah -- akun dimatiin (is_active=false) tanpa
  // hapus data histori-nya. Kalau ternyata perlu diaktifkan lagi (misal
  // salah nonaktifin), tinggal toggle balik.
  const handleToggleActive = async (student) => {
    const willDeactivate = student.isActive !== false;
    if (
      willDeactivate &&
      !window.confirm(
        `Nonaktifkan akun ${student.full_name}? Siswa/ortu ga akan bisa login lagi sampai diaktifkan ulang.`
      )
    ) {
      return;
    }
    setTogglingId(student.id);
    try {
      const { error } = await supabase
        .from("student_auth")
        .update({ is_active: !willDeactivate })
        .eq("student_id", student.id);
      if (error) throw error;

      showToast &&
        showToast(
          `Akun ${student.full_name} berhasil ${willDeactivate ? "dinonaktifkan" : "diaktifkan"}.`,
          "success"
        );
      await loadStudents();
    } catch (err) {
      console.error("[AkunSiswaTab] Gagal mengubah status akun:", err);
      showToast && showToast("Gagal mengubah status akun. Cek console buat detail error.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Generate Semua Kelas Sekaligus */}
      <div className="border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            Generate Semua Kelas Sekaligus
          </p>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadAllPdf}
              disabled={downloadingAllPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition disabled:opacity-50"
              title="Download PDF Daftar Akun tiap kelas sekaligus, dibundel jadi satu file ZIP (1 PDF per kelas di dalamnya)"
            >
              {downloadingAllPdf ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Archive size={14} />
              )}
              {downloadingAllPdf ? "Membuat ZIP..." : "Download Semua PDF (ZIP)"}
            </button>
            <button
              onClick={loadAllSummary}
              disabled={loadingSummary || generatingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingSummary ? "animate-spin" : ""} />
              {allSummary ? "Muat Ulang" : "Cek Semua Kelas"}
            </button>
            {allSummary && !loadingSummary && (
              <button
                onClick={() => setAllSummary(null)}
                disabled={generatingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                <X size={14} />
                Tutup
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">
          Cek dulu berapa siswa yang belum punya akun di tiap kelas sebelum bikin akunnya sekaligus.
          Siswa yang udah punya akun otomatis dilewat, gak bakal dobel.
        </p>

        {loadingSummary && (
          <div className="flex items-center gap-2 py-3 text-xs text-indigo-500 dark:text-indigo-400">
            <Loader2 size={14} className="animate-spin" /> Memuat ringkasan semua kelas...
          </div>
        )}

        {!loadingSummary && allSummary && (
          <>
            <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-800 mb-3">
              <table className="w-full text-xs">
                <thead className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-semibold">Kelas</th>
                    <th className="text-right px-3 py-1.5 font-semibold">Total</th>
                    <th className="text-right px-3 py-1.5 font-semibold">Akan Dibuat</th>
                    <th className="text-right px-3 py-1.5 font-semibold">NIS Kosong</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50 dark:divide-indigo-900/40">
                  {allSummary.perClass.map((c) => (
                    <tr key={c.class_id}>
                      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-200">{c.class_id}</td>
                      <td className="px-3 py-1.5 text-right text-gray-500 dark:text-gray-400">
                        {c.total}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right font-semibold ${
                          c.belum > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {c.belum}
                      </td>
                      <td className="px-3 py-1.5 text-right text-rose-500 dark:text-rose-400">
                        {c.kosongNis || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalKosongNisSemua > 0 && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5 mb-3 text-xs text-rose-700 dark:text-rose-300">
                {totalKosongNisSemua} siswa gak bisa dibuatin akun karena NIS-nya kosong. Lengkapi
                dulu di Manajemen Sekolah kalau perlu, sisanya tetep bisa digenerate sekarang.
              </div>
            )}

            <button
              onClick={handleGenerateAll}
              disabled={generatingAll || totalBelumSemua === 0}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingAll ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {generatingAll
                ? "Membuat Akun..."
                : totalBelumSemua === 0
                  ? "Semua Kelas Sudah Punya Akun"
                  : `Buat Akun untuk ${totalBelumSemua} Siswa di Semua Kelas`}
            </button>
          </>
        )}
      </div>

      {/* Pilih Jenjang & Kelas */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Pilih Jenjang
          </label>
          <select
            value={selectedJenjang}
            onChange={(e) => {
              setSelectedJenjang(e.target.value);
              setHasFiltered(true);
            }}
            disabled={loadingClasses}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">{loadingClasses ? "Memuat..." : "Semua Jenjang"}</option>
            {jenjangList.map((j) => (
              <option key={j} value={j}>
                Kelas {j}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Pilih Kelas
          </label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setHasFiltered(true);
            }}
            disabled={loadingClasses}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Semua Kelas</option>
            {classesInJenjang.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadStudents}
          disabled={loadingList || !hasFiltered}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={16} className={loadingList ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {selectedClass && (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {students.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Siswa</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {students.length - belumPunyaAkun.length}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Sudah Ada Akun</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                {belumPunyaAkun.length}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Belum Ada Akun</p>
            </div>
          </div>

          {/* Info konvensi username/password */}
          {bisaDigenerate.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
              Akun baru dibuat pakai username = <b>NIS siswa</b>, password <b>unik per siswa</b> (3
              digit terakhir NIS + 3 huruf acak, contoh <span className="font-mono">245-xyz</span>)
              — beda-beda tiap anak, ga lagi 1 password dipake bareng sekelas.
            </div>
          )}
          {nisKosong.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 mb-4 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
              {nisKosong.length} siswa gak bisa dibuatin akun karena kolom NIS-nya masih kosong di
              data siswa. Lengkapi dulu NIS-nya di Manajemen Sekolah, baru generate lagi.
            </div>
          )}

          {/* Tombol Generate & Download PDF - sejajar satu baris, warna dibedain
              (biru = buat akun, emerald = download PDF) biar gak ketuker fungsinya */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
            <button
              onClick={handleGenerate}
              disabled={generating || bisaDigenerate.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {generating
                ? "Membuat Akun..."
                : bisaDigenerate.length === 0
                  ? "Semua Siswa Sudah Punya Akun"
                  : `Buat Akun untuk ${bisaDigenerate.length} Siswa`}
            </button>

            {students.length - belumPunyaAkun.length > 0 && (
              <button
                onClick={handleDownloadPdf}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
              >
                <FileDown size={16} />
                Download PDF Daftar Akun ({students.length - belumPunyaAkun.length} Siswa)
              </button>
            )}

            {students.length - belumPunyaAkun.length > 0 && (
              <button
                onClick={handleResetAllInClass}
                disabled={resettingClass}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate ulang password baru (unik per siswa) buat semua siswa di kelas ini yang udah punya akun"
              >
                {resettingClass ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyRound size={16} />
                )}
                {resettingClass
                  ? "Mereset..."
                  : `Reset Semua Password Kelas Ini (${students.length - belumPunyaAkun.length})`}
              </button>
            )}
          </div>
        </>
      )}

      {/* Daftar Siswa */}
      {!hasFiltered ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
          Silakan pilih Jenjang dan Kelas terlebih dahulu.
        </div>
      ) : loadingList ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 dark:text-gray-500 text-sm">
          <Loader2 size={18} className="animate-spin" /> Memuat siswa...
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          {classesInJenjang.length === 0
            ? "Tidak ada kelas untuk jenjang ini."
            : selectedClass
              ? "Gak ada siswa aktif di kelas ini."
              : "Gak ada siswa aktif untuk filter ini."}
        </div>
      ) : (
        <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {students.map((s) => {
              const isRevealed = revealedIds.has(s.id);
              const isInactive = s.hasAccount && s.isActive === false;

              return (
                <div
                  key={s.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 text-sm ${
                    isInactive ? "bg-gray-50/80 dark:bg-gray-900/30" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                      {s.full_name}
                      {isInactive && (
                        <span className="ml-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 align-middle">
                          (Nonaktif)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-wrap">
                      <span>NIS: {s.nis || <span className="text-rose-500">Kosong</span>}</span>
                      {s.hasAccount && (
                        <>
                          <span>•</span>
                          <span>
                            Password:{" "}
                            <span className="font-mono">
                              {isRevealed ? s.password || "-" : "••••••"}
                            </span>
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {s.hasAccount ? (
                      <>
                        <button
                          onClick={() => toggleReveal(s.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          title={isRevealed ? "Sembunyikan password" : "Lihat password"}
                        >
                          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {isRevealed && (
                          <button
                            onClick={() => copyPassword(s.password)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title="Salin password"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPassword(s)}
                          disabled={resettingId === s.id || !s.nis}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reset password siswa ini"
                        >
                          {resettingId === s.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <KeyRound size={13} />
                          )}
                          Reset
                        </button>
                        <button
                          onClick={() => handleToggleActive(s)}
                          disabled={togglingId === s.id}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            isInactive
                              ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              : "text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          }`}
                          title={
                            isInactive ? "Aktifkan akun" : "Nonaktifkan akun (siswa lulus/pindah)"
                          }
                        >
                          {togglingId === s.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : isInactive ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <Ban size={13} />
                          )}
                          {isInactive ? "Aktifkan" : "Nonaktifkan"}
                        </button>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <XCircle size={14} /> Belum Ada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
