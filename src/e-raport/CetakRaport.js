import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Download,
  Printer,
  Edit,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

function CetakRaport() {
  const [kelas, setKelas] = useState("");
  const [periode, setPeriode] = useState("");
  const [siswaList, setSiswaList] = useState([]);
  const [academicYear, setAcademicYear] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({
    current: 0,
    total: 0,
    action: "",
  });

  // STATE MODAL INPUT DETAIL
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [nilaiDetailList, setNilaiDetailList] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [expandedMapel, setExpandedMapel] = useState({});

  useEffect(() => {
    loadUserData();
    loadActiveAcademicYear();
    loadSchoolSettings();
  }, []);

  useEffect(() => {
    if (kelas && academicYear && periode) {
      loadSiswa();
    }
  }, [kelas, academicYear, periode]);

  const loadUserData = () => {
    const sessionData = localStorage.getItem("userSession");
    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData);
        if (userData.kelas) {
          setKelas(userData.kelas);
        }
      } catch (error) {
        console.error("Error parsing session:", error);
      }
    }
  };

  const loadActiveAcademicYear = async () => {
    const { data } = await supabase
      .from("academic_years")
      .select("*")
      .eq("is_active", true)
      .single();
    setAcademicYear(data);
  };

  const loadSchoolSettings = async () => {
    const { data } = await supabase.from("school_settings").select("*");
    const settings = {};
    data?.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });
    setSchoolSettings(settings);
  };

  const loadSiswa = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("kelas", kelas)
      .eq("is_active", true)
      .order("nama_siswa");
    setSiswaList(data || []);
    setLoading(false);
  };

  const getFase = (kelasNum) => {
    if (kelasNum <= 2) return "A";
    if (kelasNum <= 4) return "B";
    return "C";
  };

  const getPeriodeText = () => {
    return periode === "mid_ganjil"
      ? "Mid Semester Ganjil"
      : "Mid Semester Genap";
  };

  const generateCapaianKompetensi = (nilaiData) => {
    const tercapai = [];
    const peningkatan = [];

    nilaiData.forEach((item) => {
      item.nilai_eraport_detail?.forEach((detail) => {
        if (detail.status === "sudah_menguasai" && detail.tujuan_pembelajaran) {
          tercapai.push(detail.tujuan_pembelajaran.deskripsi_tp);
        } else if (
          detail.status === "perlu_perbaikan" &&
          detail.tujuan_pembelajaran
        ) {
          peningkatan.push(detail.tujuan_pembelajaran.deskripsi_tp);
        }
      });
    });

    let text = "";
    if (tercapai.length > 0) {
      text += `Mencapai kompetensi dengan baik dalam hal ${tercapai.join(
        ", "
      )}.`;
    }
    if (peningkatan.length > 0) {
      if (text) text += " ";
      text += `Perlu peningkatan dalam hal ${peningkatan.join(", ")}.`;
    }
    return text || "-";
  };

  // Taruh setelah fungsi generateCapaianKompetensi
  const isMapelWajib = (namaMapel) => {
    const mapel = namaMapel.toLowerCase().trim();

    const mapelWajibList = [
      "paibp",
      "pendidikan pancasila",
      "bahasa indonesia",
      "ipas",
      "matematika",
      "seni budaya",
      "pjok",
    ];

    return mapelWajibList.some((m) => mapel.includes(m));
  };

  const isMapelPilihan = (namaMapel) => {
    const mapel = namaMapel.toLowerCase().trim();

    const mapelPilihanList = ["bahasa inggris", "bahasa sunda"];

    return mapelPilihanList.some((m) => mapel.includes(m));
  };

  // MODAL FUNCTIONS
  const openDetailModal = async (siswa) => {
    setSelectedSiswa(siswa);
    setShowDetailModal(true);
    setLoadingDetail(true);
    setExpandedMapel({});

    try {
      const { data: nilaiData } = await supabase
        .from("nilai_eraport")
        .select(`*, nilai_eraport_detail(*, tujuan_pembelajaran(*))`)
        .eq("student_id", siswa.id)
        .eq("semester", academicYear?.semester)
        .eq("tahun_ajaran_id", academicYear?.id)
        .eq("periode", periode)
        .order("mata_pelajaran");

      // Query TP dengan class_id dari siswa (bisa UUID atau string kelas)
      let tpQuery = supabase
        .from("tujuan_pembelajaran")
        .select("*")
        .eq("tahun_ajaran", academicYear?.year)
        .eq("periode", periode);

      // Coba dulu pakai tingkat (kelas angka)
      if (siswa.kelas) {
        tpQuery = tpQuery.eq("tingkat", siswa.kelas);
      }

      const { data: tpData, error: tpError } = await tpQuery
        .order("mata_pelajaran")
        .order("urutan");

      console.log("DEBUG:", {
        siswa_kelas: siswa.kelas,
        tahun_ajaran: academicYear?.year,
        periode: periode,
        tp_found: tpData?.length,
        tp_error: tpError,
      });

      const enrichedData =
        nilaiData?.map((nilai) => {
          const tpForMapel =
            tpData?.filter(
              (tp) => tp.mata_pelajaran === nilai.mata_pelajaran
            ) || [];
          const detailsMap = {};
          nilai.nilai_eraport_detail?.forEach((detail) => {
            detailsMap[detail.tujuan_pembelajaran_id] = detail.status;
          });

          const tpWithStatus = tpForMapel.map((tp) => ({
            ...tp,
            status: detailsMap[tp.id] || "belum_dinilai",
            detail_id: nilai.nilai_eraport_detail?.find(
              (d) => d.tujuan_pembelajaran_id === tp.id
            )?.id,
          }));

          return { ...nilai, tujuan_pembelajaran_list: tpWithStatus };
        }) || [];

      setNilaiDetailList(enrichedData);
    } catch (error) {
      console.error("Error:", error);
      alert("Gagal memuat: " + error.message);
    }
    setLoadingDetail(false);
  };

  const handleStatusChange = (nilaiIndex, tpIndex, newStatus) => {
    const updated = [...nilaiDetailList];
    updated[nilaiIndex].tujuan_pembelajaran_list[tpIndex].status = newStatus;
    setNilaiDetailList(updated);
  };

  const toggleExpand = (idx) => {
    setExpandedMapel((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSimpanDetail = async () => {
    setSavingDetail(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const nilai of nilaiDetailList) {
        for (const tp of nilai.tujuan_pembelajaran_list) {
          if (tp.status === "belum_dinilai") continue;

          if (tp.detail_id) {
            const { error } = await supabase
              .from("nilai_eraport_detail")
              .update({ status: tp.status })
              .eq("id", tp.detail_id);
            if (error) errorCount++;
            else successCount++;
          } else {
            const { error } = await supabase
              .from("nilai_eraport_detail")
              .insert({
                nilai_eraport_id: nilai.id,
                tujuan_pembelajaran_id: tp.id,
                status: tp.status,
              });
            if (error) errorCount++;
            else successCount++;
          }
        }
      }

      if (errorCount > 0) {
        alert(`Tersimpan ${successCount}, gagal ${errorCount}`);
      } else {
        alert(`Berhasil menyimpan ${successCount} detail!`);
        setShowDetailModal(false);
      }
    } catch (error) {
      alert("Gagal: " + error.message);
    }
    setSavingDetail(false);
  };

  const addStudentPages = async (doc, siswa, isFirstStudent) => {
    try {
      const { data: nilaiData, error: nilaiError } = await supabase
        .from("nilai_eraport")
        .select(`*, nilai_eraport_detail(*, tujuan_pembelajaran(*))`)
        .eq("student_id", siswa.id)
        .eq("semester", academicYear?.semester)
        .eq("tahun_ajaran_id", academicYear?.id)
        .eq("periode", periode)
        .order("mata_pelajaran");

      if (nilaiError) throw nilaiError;

      console.log(
        "🔍 Mata pelajaran ditemukan:",
        nilaiData?.map((n) => n.mata_pelajaran)
      );

      const mapelWajib =
        nilaiData?.filter((n) => isMapelWajib(n.mata_pelajaran)) || [];
      const mapelPilihan =
        nilaiData?.filter((n) => isMapelPilihan(n.mata_pelajaran)) || [];

      console.log(
        "✅ Mapel Wajib:",
        mapelWajib.map((m) => m.mata_pelajaran)
      );
      console.log(
        "📚 Mapel Pilihan:",
        mapelPilihan.map((m) => m.mata_pelajaran)
      );

      const { data: kehadiranData } = await supabase
        .from("attendance")
        .select("*")
        .eq("nisn", siswa.nisn)
        .eq("tahun_ajaran", academicYear?.year);

      const sakit =
        kehadiranData?.filter((k) => k.status === "Sakit").length || 0;
      const izin =
        kehadiranData?.filter((k) => k.status === "Izin").length || 0;
      const alpha =
        kehadiranData?.filter((k) => k.status === "Alpha").length || 0;

      const { data: catatanData } = await supabase
        .from("catatan_eraport")
        .select("*")
        .eq("student_id", siswa.id)
        .eq("academic_year_id", academicYear?.id)
        .eq("semester", academicYear?.semester)
        .single();

      const { data: waliKelas } = await supabase
        .from("users")
        .select("full_name")
        .eq("kelas", kelas)
        .eq("role", "guru_kelas")
        .single();

      if (!isFirstStudent) doc.addPage();

      let yPos = 20;
      let currentPage = 1;

      // ========== FUNCTION UNTUK RENDER HEADER ==========
      const renderHeader = (pageNum) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        // Kolom KIRI
        doc.text("Nama Murid", 20, yPos);
        doc.text(`: ${siswa.nama_siswa.toUpperCase()}`, 55, yPos);
        doc.text("Kelas", 135, yPos);
        doc.text(`: Kelas ${kelas}`, 165, yPos);
        yPos += 5;

        doc.text("NIS/NISN", 20, yPos);
        doc.text(`: ${siswa.nis || siswa.nisn} / ${siswa.nisn}`, 55, yPos);
        doc.text("Fase", 135, yPos);
        doc.text(`: ${getFase(parseInt(kelas))}`, 165, yPos);
        yPos += 5;

        doc.text("Sekolah", 20, yPos);
        doc.text(
          `: ${schoolSettings.school_name || "SD NEGERI 1 PASIRPOGOR"}`,
          55,
          yPos
        );
        doc.text("Semester", 135, yPos);
        doc.text(`: ${academicYear?.semester}`, 165, yPos);
        yPos += 5;

        doc.text("Alamat", 20, yPos);
        doc.text(
          `: ${schoolSettings.school_address || "Kp. Bojongloa"}`,
          55,
          yPos
        );
        doc.text("Tahun Ajaran", 135, yPos);
        doc.text(`: ${academicYear?.year}`, 165, yPos);
        yPos += 10;

        // JUDUL (hanya di halaman 1)
        if (pageNum === 1) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("LAPORAN HASIL BELAJAR", 105, yPos, { align: "center" });
          yPos += 8;
        }
      };

      // ========== RENDER HEADER HALAMAN 1 ==========
      renderHeader(1);

      // ========== TABEL MATA PELAJARAN ==========
      const tableDataWajib = mapelWajib.map((nilai, idx) => {
        const capaian = generateCapaianKompetensi([nilai]);
        return [
          idx + 1,
          nilai.mata_pelajaran,
          nilai.nilai_akhir || "-",
          capaian,
        ];
      });

      const tableDataPilihan = mapelPilihan.map((nilai, idx) => {
        const capaian = generateCapaianKompetensi([nilai]);
        return [
          idx + 1,
          nilai.mata_pelajaran,
          nilai.nilai_akhir || "-",
          capaian,
        ];
      });

      const fullTableBody = [
        [
          {
            content: "Mata Pelajaran Wajib",
            colSpan: 4,
            styles: {
              fontStyle: "bold",
              halign: "left",
              fillColor: [255, 255, 255],
              textColor: [0, 0, 0],
            },
          },
        ],
        ...tableDataWajib,
      ];

      if (mapelPilihan.length > 0) {
        fullTableBody.push(
          [
            {
              content: "Mata Pelajaran Pilihan",
              colSpan: 4,
              styles: {
                fontStyle: "bold",
                halign: "left",
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
              },
            },
          ],
          ...tableDataPilihan
        );
      }

      doc.autoTable({
        startY: yPos,
        head: [["No", "Mata Pelajaran", "Nilai Akhir", "Capaian Kompetensi"]],
        body: fullTableBody,
        theme: "plain",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          fontSize: 9,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center", valign: "middle" },
          1: { cellWidth: 40, valign: "middle" },
          2: { cellWidth: 20, halign: "center", valign: "middle" },
          3: { cellWidth: 100, halign: "justify", valign: "middle" },
        },
        margin: { left: 20, right: 20 },
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // ========== CEK APAKAH PERLU PAGE BREAK ==========
      const remainingSpace = 270 - yPos; // 270 = batas aman sebelum footer (285 - 15)
      const neededSpace = 130; // Perkiraan tinggi: Kokurikuler(35) + Ekstrakurikuler(25) + 2Kolom(48) + TTD(22)

      console.log(
        `📏 Space Check - Remaining: ${remainingSpace}, Needed: ${neededSpace}`
      );

      if (remainingSpace < neededSpace) {
        console.log("⚠️ Space tidak cukup, bikin halaman baru");

        // FOOTER HALAMAN 1
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(
          `Kelas ${kelas} | ${siswa.nama_siswa.toUpperCase()} | ${siswa.nisn}`,
          20,
          285
        );
        doc.text(`Halaman : 1`, 180, 285);

        // BIKIN HALAMAN BARU
        doc.addPage();
        yPos = 20;
        currentPage = 2;

        // RENDER HEADER HALAMAN 2
        renderHeader(2);
      } else {
        console.log("✅ Space cukup, lanjut di halaman yang sama");
        // Tidak ada footer halaman 1 karena masih satu halaman
      }

      // ========== KOKURIKULER ==========
      // Header
      doc.rect(20, yPos, 170, 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Kokurikuler", 105, yPos + 7, { align: "center" });
      yPos += 10;

      // Content area (empty space below header)
      doc.rect(20, yPos, 170, 30);
      yPos += 35;

      // ========== TABEL EKSTRAKURIKULER ==========
      doc.autoTable({
        startY: yPos,
        head: [["No", "Ekstrakurikuler", "Keterangan"]],
        body: [["1", "", ""]],
        theme: "plain",
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 15, halign: "center", valign: "middle" },
          1: { cellWidth: 50, halign: "left", valign: "middle" },
          2: { cellWidth: 105, halign: "left", valign: "middle" },
        },
        margin: { left: 20, right: 20 },
      });
      yPos = doc.lastAutoTable.finalY + 8;

      // ========== LAYOUT 2 KOLOM: KETIDAKHADIRAN & CATATAN ==========
      const col1X = 20;
      const col2X = 108;
      const boxWidth = 82;
      const startBoxY = yPos;

      // BOX KIRI: KETIDAKHADIRAN
      // Header Ketidakhadiran
      doc.rect(col1X, startBoxY, boxWidth, 10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Ketidakhadiran", col1X + boxWidth / 2, startBoxY + 7, {
        align: "center",
      });

      // Tabel ketidakhadiran
      doc.autoTable({
        startY: startBoxY + 10,
        body: [
          ["Sakit", `: ${sakit} hari`],
          ["Izin", `: ${izin} hari`],
          ["Tanpa Keterangan", `: ${alpha} hari`],
        ],
        theme: "plain",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 50, halign: "left" },
          1: { cellWidth: 32, halign: "left" },
        },
        margin: { left: col1X, right: 0 },
        tableWidth: boxWidth,
      });

      const ketidakhadiranFinalY = doc.lastAutoTable.finalY;

      // BOX KANAN: CATATAN WALI KELAS
      // Header Catatan Wali Kelas
      doc.rect(col2X, startBoxY, boxWidth, 10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Catatan Wali Kelas", col2X + boxWidth / 2, startBoxY + 7, {
        align: "center",
      });

      // Content catatan (tinggi menyesuaikan dengan box ketidakhadiran)
      const catatanHeight = ketidakhadiranFinalY - (startBoxY + 10);
      doc.rect(col2X, startBoxY + 10, boxWidth, catatanHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const catatan = catatanData?.catatan_wali_kelas || "";
      const wrappedCatatan = doc.splitTextToSize(catatan, boxWidth - 6);
      doc.text(wrappedCatatan, col2X + 3, startBoxY + 15);

      yPos = ketidakhadiranFinalY + 8;

      // ========== TANGGAPAN ORANG TUA/WALI MURID ==========
      // Header
      doc.rect(20, yPos, 170, 10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Tanggapan Orang Tua/Wali Murid", 105, yPos + 7, {
        align: "center",
      });
      yPos += 10;

      // Content area (empty space below header)
      doc.rect(20, yPos, 170, 40);
      yPos += 45;

      // ========== JARAK KOSONG 2 BARIS ==========
      yPos += 4;

      // ========== TANDA TANGAN ==========
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      // ========== LOKASI DAN TANGGAL (KANAN ATAS) ==========
      const ttdCol1 = 50; // Orang Tua Murid (kiri)
      const ttdCol2 = 155; // Wali Kelas (kanan)

      doc.text("Sindangkerta, 22 Desember 2025", ttdCol2, yPos, {
        align: "center",
      });
      yPos += 6; // Jarak kecil antara tanggal dan Wali Kelas

      // ========== 2 KOLOM: ORANG TUA (KIRI) & WALI KELAS (KANAN) ==========
      doc.text("Orang Tua Murid", ttdCol1, yPos, { align: "center" });
      doc.text("Wali Kelas", ttdCol2, yPos, { align: "center" });

      yPos += 20; // Jarak untuk tanda tangan

      // NAMA - Orang Tua (titik-titik) & Wali Kelas
      doc.text(".....................................", ttdCol1, yPos, {
        align: "center",
      });

      doc.setFont("helvetica", "bold");
      doc.text(waliKelas?.full_name || "LITA PURNAMA, S.Pd", ttdCol2, yPos, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.text(
        waliKelas?.nip ? `NIP. ${waliKelas.nip}` : "NIP.",
        ttdCol2,
        yPos + 4,
        {
          align: "center",
        }
      );

      yPos += 8; // Jarak sebelum Kepala Sekolah

      // ========== KEPALA SEKOLAH (TENGAH BAWAH) ==========
      doc.text("Kepala Sekolah", 105, yPos, { align: "center" });
      yPos += 20;

      doc.setFont("helvetica", "bold");
      doc.text(
        schoolSettings.principal_name || "YAYAN HAEDAR,S.Pd",
        105,
        yPos,
        { align: "center" }
      );
      doc.setFont("helvetica", "normal");
      doc.text(
        `NIP. ${schoolSettings.principal_nip || "196704041988031005"}`,
        105,
        yPos + 4,
        { align: "center" }
      );

      // ========== FOOTER HALAMAN TERAKHIR ==========
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Kelas ${kelas} | ${siswa.nama_siswa.toUpperCase()} | ${siswa.nisn}`,
        20,
        285
      );
      doc.text(`Halaman : ${currentPage}`, 180, 285);

      return doc;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };

  const handlePrint = async (siswa) => {
    setGenerating(true);
    setGenerateProgress({ current: 1, total: 1, action: "print" });
    try {
      const doc = new jsPDF();
      await addStudentPages(doc, siswa, true);
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => printWindow.print();
      }
    } catch (error) {
      alert("Gagal print: " + error.message);
    }
    setGenerating(false);
    setGenerateProgress({ current: 0, total: 0, action: "" });
  };

  const handleDownloadPDF = async (siswa) => {
    setGenerating(true);
    setGenerateProgress({ current: 1, total: 1, action: "download" });
    try {
      const doc = new jsPDF();
      await addStudentPages(doc, siswa, true);
      doc.save(
        `RAPOR_${siswa.nama_siswa}_Kelas${kelas}_${getPeriodeText()}_${
          academicYear?.year
        }.pdf`
      );
    } catch (error) {
      alert("Gagal download: " + error.message);
    }
    setGenerating(false);
    setGenerateProgress({ current: 0, total: 0, action: "" });
  };

  const handleDownloadAllPDF = async () => {
    if (siswaList.length === 0) {
      alert("Tidak ada siswa!");
      return;
    }
    if (!periode) {
      alert("Pilih periode terlebih dahulu!");
      return;
    }

    setGenerating(true);
    setGenerateProgress({ current: 0, total: siswaList.length, action: "all" });

    try {
      const doc = new jsPDF();
      for (let i = 0; i < siswaList.length; i++) {
        const siswa = siswaList[i];
        setGenerateProgress({
          current: i + 1,
          total: siswaList.length,
          action: "all",
        });
        await addStudentPages(doc, siswa, i === 0);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      doc.save(
        `RAPOR_Kelas${kelas}_${getPeriodeText()}_${academicYear?.year}.pdf`
      );
      alert("Berhasil! File PDF telah didownload.");
    } catch (error) {
      alert("Gagal download: " + error.message);
    }
    setGenerating(false);
    setGenerateProgress({ current: 0, total: 0, action: "" });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 md:p-6">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6 text-gray-900 dark:text-white">
          CETAK RAPORT
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 md:mb-6 bg-gray-50 dark:bg-gray-800 p-3 md:p-4 rounded-lg">
          <div>
            <label className="block font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Kelas
            </label>
            <input
              type="text"
              value={kelas ? `Kelas ${kelas}` : ""}
              disabled
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-red-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium"
            />
          </div>
          <div>
            <label className="block font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Periode
            </label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400">
              <option value="">-- Pilih Periode --</option>
              <option value="mid_ganjil">Mid Semester Ganjil</option>
              <option value="mid_genap">Mid Semester Genap</option>
            </select>
          </div>
        </div>

        {!loading && siswaList.length > 0 && periode && (
          <div className="flex justify-end mb-4 md:mb-6">
            <button
              onClick={handleDownloadAllPDF}
              disabled={generating}
              className="bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 text-white px-4 md:px-6 py-3 rounded-lg hover:shadow-lg flex items-center gap-2 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed min-h-[44px] text-sm md:text-base font-semibold">
              <Download size={18} />
              <span className="hidden sm:inline">
                Download Semua Raport (1 PDF)
              </span>
              <span className="sm:hidden">Download Semua</span>
            </button>
          </div>
        )}

        {!loading && siswaList.length > 0 && periode && (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full border-collapse text-xs md:text-sm min-w-[768px]">
              <thead>
                <tr className="bg-red-700 dark:bg-red-900 text-white">
                  <th className="border border-red-600 dark:border-red-800 p-2 md:p-3 w-12 md:w-16 text-center">
                    No
                  </th>
                  <th className="border border-red-600 dark:border-red-800 p-2 md:p-3 w-32 md:w-40 text-center">
                    NISN
                  </th>
                  <th className="border border-red-600 dark:border-red-800 p-2 md:p-3 text-center">
                    Nama Siswa
                  </th>
                  <th className="border border-red-600 dark:border-red-800 p-2 md:p-3 w-20 md:w-24 text-center">
                    Kelas
                  </th>
                  <th className="border border-red-600 dark:border-red-800 p-2 md:p-3 w-56 md:w-64 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {siswaList.map((siswa, idx) => (
                  <tr
                    key={siswa.id}
                    className={
                      idx % 2 === 0
                        ? "bg-red-50/30 dark:bg-gray-800/50"
                        : "bg-white dark:bg-gray-900"
                    }>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 md:p-3 text-center font-medium">
                      {idx + 1}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 md:p-3 text-center font-mono">
                      {siswa.nisn}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 md:p-3 font-medium">
                      {siswa.nama_siswa}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 md:p-3 text-center">
                      Kelas {kelas}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 text-center">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => openDetailModal(siswa)}
                          disabled={generating}
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-3 py-2 rounded-lg hover:shadow flex items-center gap-1 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed min-h-[44px] text-xs font-medium"
                          title="Edit Detail">
                          <Edit size={14} />
                          <span className="hidden md:inline">Detail</span>
                        </button>
                        <button
                          onClick={() => handlePrint(siswa)}
                          disabled={generating}
                          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-3 py-2 rounded-lg hover:shadow flex items-center gap-1 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed min-h-[44px] text-xs font-medium"
                          title="Print">
                          <Printer size={14} />
                          <span className="hidden md:inline">Print</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(siswa)}
                          disabled={generating}
                          className="bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 text-white px-3 py-2 rounded-lg hover:shadow flex items-center gap-1 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed min-h-[44px] text-xs font-medium"
                          title="Download PDF">
                          <Download size={14} />
                          <span className="hidden md:inline">PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && (
          <div className="text-center py-8 md:py-12">
            <div className="inline-flex flex-col items-center">
              <div className="relative">
                <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-red-200 dark:border-red-800/30 border-t-red-700 dark:border-t-red-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mt-3 md:mt-4 font-medium text-sm md:text-base">
                Memuat data...
              </p>
            </div>
          </div>
        )}

        {!loading && siswaList.length === 0 && kelas && periode && (
          <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm md:text-base">Tidak ada siswa aktif.</p>
          </div>
        )}

        {!loading && kelas && !periode && (
          <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm md:text-base">
              Silakan pilih periode terlebih dahulu.
            </p>
          </div>
        )}
      </div>

      {generating && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl p-6 md:p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 md:w-20 md:h-20 mb-4 md:mb-6">
                <div className="absolute inset-0 border-4 border-red-200 dark:border-red-800/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-red-700 dark:border-t-red-600 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
                {generateProgress.action === "print" && "Menyiapkan Print..."}
                {generateProgress.action === "download" && "Membuat PDF..."}
                {generateProgress.action === "all" &&
                  "Membuat PDF Semua Siswa..."}
              </h3>
              {generateProgress.action === "all" && (
                <>
                  <p className="text-gray-600 dark:text-gray-300 text-center text-sm md:text-base mb-4">
                    {generateProgress.current} dari {generateProgress.total}{" "}
                    siswa
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div
                      className="bg-red-700 dark:bg-red-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          generateProgress.total > 0
                            ? (generateProgress.current /
                                generateProgress.total) *
                              100
                            : 0
                        }%`,
                      }}></div>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-red-700 dark:text-red-500 mt-2">
                    {generateProgress.total > 0
                      ? Math.round(
                          (generateProgress.current / generateProgress.total) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </>
              )}
              {(generateProgress.action === "print" ||
                generateProgress.action === "download") && (
                <p className="text-gray-600 dark:text-gray-300 text-center text-sm md:text-base">
                  Mohon tunggu sebentar...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-600 text-white p-6 rounded-t-xl flex justify-between items-center z-10">
              <div>
                <h3 className="text-2xl font-bold">
                  Input Detail Capaian Kompetensi
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  {selectedSiswa?.nama_siswa} - {selectedSiswa?.nisn}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg font-medium">
                Tutup
              </button>
            </div>

            <div className="p-6">
              {loadingDetail ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Memuat data...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {nilaiDetailList.map((nilai, nilaiIndex) => (
                    <div
                      key={nilai.id}
                      className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div
                        onClick={() => toggleExpand(nilaiIndex)}
                        className="bg-blue-600 text-white p-4 cursor-pointer hover:bg-blue-700 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-lg">
                            {nilai.mata_pelajaran}
                          </h4>
                          <p className="text-sm text-blue-100">
                            Nilai: {nilai.nilai_akhir || "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm bg-blue-500 px-3 py-1 rounded-full">
                            {nilai.tujuan_pembelajaran_list?.length || 0} TP
                          </span>
                          {expandedMapel[nilaiIndex] ? (
                            <ChevronUp size={24} />
                          ) : (
                            <ChevronDown size={24} />
                          )}
                        </div>
                      </div>

                      {expandedMapel[nilaiIndex] && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 space-y-3">
                          {nilai.tujuan_pembelajaran_list?.length > 0 ? (
                            nilai.tujuan_pembelajaran_list.map(
                              (tp, tpIndex) => (
                                <div
                                  key={tp.id}
                                  className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                                      {tp.urutan || tpIndex + 1}
                                    </div>
                                    <div className="flex-grow">
                                      <p className="text-gray-800 dark:text-gray-200 mb-2">
                                        {tp.deskripsi_tp}
                                      </p>
                                      <div className="flex gap-2 flex-wrap">
                                        <button
                                          onClick={() =>
                                            handleStatusChange(
                                              nilaiIndex,
                                              tpIndex,
                                              "sudah_menguasai"
                                            )
                                          }
                                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                            tp.status === "sudah_menguasai"
                                              ? "bg-green-600 text-white shadow-md"
                                              : "bg-green-100 text-green-700 hover:bg-green-200"
                                          }`}>
                                          ✓ Sudah Menguasai
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleStatusChange(
                                              nilaiIndex,
                                              tpIndex,
                                              "perlu_perbaikan"
                                            )
                                          }
                                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                            tp.status === "perlu_perbaikan"
                                              ? "bg-yellow-600 text-white shadow-md"
                                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                          }`}>
                                          ⚠ Perlu Perbaikan
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                      {tp.status === "sudah_menguasai" && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                          ✓ Sudah
                                        </span>
                                      )}
                                      {tp.status === "perlu_perbaikan" && (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                          ⚠ Perlu
                                        </span>
                                      )}
                                      {tp.status === "belum_dinilai" && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">
                                          - Belum
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            )
                          ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <p className="font-medium">
                                Belum ada Tujuan Pembelajaran
                              </p>
                              <p className="text-sm">
                                Silakan buat TP terlebih dahulu
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSimpanDetail}
                      disabled={savingDetail}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all">
                      <Save size={20} />
                      {savingDetail ? "Menyimpan..." : "Simpan Semua"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {savingDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800/30 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Menyimpan Data...
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Mohon tunggu sebentar
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CetakRaport;
