import jsPDF from "jspdf";

// --- CONFIGURATION ---
const PAGE_WIDTH = 210; // A4 width in mm
const MARGIN_X = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X;

// Warna Primer (biru profesional)
const PRIMARY_COLOR = [29, 78, 216]; // Blue-700
// Warna Sekunder (abu-abu terang untuk latar belakang section)
const SECONDARY_BG = [241, 245, 249]; // Gray-100
// Warna Teks Abu-abu
const TEXT_GRAY = [75, 85, 99]; // Gray-600

// --- HELPER FUNCTIONS ---

// Menarik garis horizontal
const drawSeparator = (pdf, y, color = [200, 200, 200], thickness = 0.2) => {
  pdf.setDrawColor(...color);
  pdf.setLineWidth(thickness);
  pdf.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
};

// --- MAIN EXPORT FUNCTION ---
export const exportKonselingPDF = (konselingItem) => {
  try {
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFont("helvetica");
    let yPosition = 0;

    // ===== FOOTER FUNCTION (Minimalis) =====
    const renderFooter = (pdfInstance, pageNumber) => {
      const pageHeight = pdfInstance.internal.pageSize.height;
      const footerY = pageHeight - 15;

      // Garis pemisah footer
      drawSeparator(pdfInstance, pageHeight - 20, [200, 200, 200], 0.1);

      pdfInstance.setTextColor(...TEXT_GRAY);
      pdfInstance.setFontSize(8);
      pdfInstance.setFont("helvetica", "normal");

      // Kiri: Informasi Cetak
      pdfInstance.text(
        `Dicetak: ${new Date().toLocaleDateString("id-ID")} | Sistem BK/BP SMP Muslimin Cililin`,
        MARGIN_X,
        footerY
      );

      // Kanan: Nomor Halaman
      pdfInstance.text(`Halaman ${pageNumber}`, CONTENT_WIDTH + MARGIN_X, footerY, {
        align: "right",
      });
    };

    // ===== 1. HEADER (Minimalis dan Profesional) =====
    const renderHeader = () => {
      yPosition = 18;

      // Judul Utama
      pdf.setTextColor(...PRIMARY_COLOR);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("LAPORAN KONSELING", PAGE_WIDTH / 2, yPosition, { align: "center" });

      yPosition += 8;

      // Sub Judul
      pdf.setTextColor(...TEXT_GRAY);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Bimbingan dan Konseling - SMP MUSLIMIN CILILIN", PAGE_WIDTH / 2, yPosition, {
        align: "center",
      });

      yPosition += 8;
      drawSeparator(pdf, yPosition, PRIMARY_COLOR, 0.5); // Garis tebal pemisah
      yPosition += 5;
    };
    renderHeader();

    // ===== 2. INFORMASI SISWA (Layout Kolom Bersih) =====
    const renderStudentInfo = () => {
      pdf.setTextColor(...PRIMARY_COLOR);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("INFORMASI SISWA", MARGIN_X, yPosition);

      drawSeparator(pdf, yPosition + 2);
      yPosition += 6;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);

      // Data untuk dua kolom
      const studentInfo = [
        { label: "Nama Siswa", value: konselingItem.full_name || "-", col: 1 },
        { label: "NIS", value: konselingItem.nis || "-", col: 2 },
        { label: "Kelas", value: konselingItem.class_id || "-", col: 1 },
        {
          label: "Jenis Kelamin",
          value:
            konselingItem.gender === "L"
              ? "Laki-laki"
              : konselingItem.gender === "P"
                ? "Perempuan"
                : konselingItem.gender || "-",
          col: 2,
        },
        {
          label: "Tgl. Konseling",
          value: new Date(konselingItem.tanggal).toLocaleDateString("id-ID") || "-",
          col: 1,
        },
        { label: "Jenis Layanan", value: konselingItem.jenis_layanan || "-", col: 2 },
        { label: "Bidang Bimbingan", value: konselingItem.bidang_bimbingan || "-", col: 1 },
        { label: "Status Layanan", value: konselingItem.status_layanan || "-", col: 2 },
        { label: "Guru BK", value: konselingItem.guru_bk_name || "-", col: 1 },
      ];

      const col1X = MARGIN_X;
      const col2X = PAGE_WIDTH / 2 + 5;
      const labelWidth = 30;
      const maxTextWidth = PAGE_WIDTH / 2 - MARGIN_X - labelWidth - 5;

      // Render informasi dalam dua kolom
      studentInfo.forEach((info, index) => {
        const isNewRow = index % 2 === 0;

        if (isNewRow) {
          yPosition += 6;
        }

        const x = info.col === 1 ? col1X : col2X;
        const valueX = x + labelWidth;

        pdf.setFont("helvetica", "bold");
        pdf.text(`${info.label}:`, x, yPosition);

        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(info.value, maxTextWidth);

        pdf.text(lines, valueX, yPosition);

        if (lines.length > 1 && !isNewRow) {
          yPosition += (lines.length - 1) * 4;
        }
      });

      yPosition += 10;
    };
    renderStudentInfo();

    // ===== 3. DETAIL KONSELING (Section Box yang Bersih) =====
    const renderSection = (title, content, isRequired = false) => {
      const PADDING = 4;
      const titleHeight = 5;
      const lineSpacing = 4;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const contentLines = pdf.splitTextToSize(
        content || "Tidak diisi",
        CONTENT_WIDTH - 2 * PADDING
      );

      const sectionContentHeight = contentLines.length * lineSpacing;
      let sectionHeight = PADDING + titleHeight + PADDING + sectionContentHeight + PADDING;

      // Cek jika perlu page break
      if (yPosition + sectionHeight > pdf.internal.pageSize.height - 35) {
        pdf.addPage();
        renderHeader(); // Render header di halaman baru
        yPosition = 30; // Mulai konten setelah header baru
      }

      // Section Box (dengan background abu-abu terang)
      pdf.setFillColor(...SECONDARY_BG);
      pdf.roundedRect(MARGIN_X, yPosition, CONTENT_WIDTH, sectionHeight, 1, 1, "F");

      // Title
      pdf.setTextColor(...PRIMARY_COLOR);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(title + (isRequired ? " *" : ""), MARGIN_X + PADDING, yPosition + PADDING + 3);

      // Garis pemisah title dan content
      drawSeparator(pdf, yPosition + PADDING + titleHeight + 1, [200, 200, 200]);

      // Content
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(contentLines, MARGIN_X + PADDING, yPosition + PADDING + titleHeight + PADDING + 2);

      yPosition += sectionHeight + 5; // Jarak antar section
    };

    yPosition += 5; // Jarak dari info siswa

    pdf.setTextColor(...PRIMARY_COLOR);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("DETAIL KONSELING", MARGIN_X, yPosition);
    drawSeparator(pdf, yPosition + 2);
    yPosition += 8;

    renderSection("PERMASALAHAN", konselingItem.permasalahan, true);
    renderSection("KRONOLOGI", konselingItem.kronologi, true);
    renderSection("TINDAKAN LAYANAN", konselingItem.tindakan_layanan);
    renderSection("HASIL LAYANAN", konselingItem.hasil_layanan);
    renderSection("RENCANA TINDAK LANJUT", konselingItem.rencana_tindak_lanjut);

    // ===== 4. TANDA TANGAN (Nama Siswa SEJAJAR dengan Guru BK) =====
    // Cek jika perlu page break
    if (yPosition > pdf.internal.pageSize.height - 70) {
      pdf.addPage();
      renderHeader();
      yPosition = MARGIN_X;
    }

    yPosition += 15;

    // --- Setting Posisi Tanda Tangan ---
    const signatureY = yPosition;
    const signatureLineY = yPosition + 25;
    const signatureNameY = yPosition + 30;

    // KOLOM 1: Guru BK/BP (KIRI)
    const col1SignX = MARGIN_X + 15;

    // KOLOM 2: Siswa (KANAN)
    const col2SignX = PAGE_WIDTH - MARGIN_X - 15;

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);

    // Tempat/Tanggal (Diletakkan di kolom kanan)
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Cililin, ${new Date(konselingItem.tanggal).toLocaleDateString("id-ID")}`,
      col2SignX,
      signatureY,
      { align: "right" }
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);

    // Teks Jabatan/Keterangan (Siswa dan Guru BK Sejajar)
    pdf.text("Guru BK/BP", col1SignX, signatureY + 6, { align: "center" });
    pdf.text("Siswa yang Bersangkutan", col2SignX, signatureY + 6, { align: "right" });

    // Garis tanda tangan
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);

    // Garis Guru BK
    pdf.line(col1SignX - 25, signatureLineY, col1SignX + 25, signatureLineY);
    // Garis Siswa
    pdf.line(col2SignX - 25, signatureLineY, col2SignX + 25, signatureLineY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    // Nama (Bawah Garis, SEJAJAR)
    // Nama Guru BK
    pdf.text(konselingItem.guru_bk_name || "Nama Guru BK", col1SignX, signatureNameY, {
      align: "center",
    });
    // Nama Siswa (Sejajar dengan Guru BK)
    pdf.text(konselingItem.full_name || "Nama Siswa", col2SignX, signatureNameY, {
      align: "right",
    });

    // ===== 5. RENDER FOOTER UNTUK SEMUA HALAMAN =====
    const pageCount = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      renderFooter(pdf, i);
    }

    // ===== SAVE PDF =====
    const fileName = `Laporan_Konseling_${konselingItem.nis}_${(
      konselingItem.full_name || ""
    ).replace(/\s/g, "_")}.pdf`;
    pdf.save(fileName);

    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

// ============================================================
// ✅ NEW: LAPORAN BULANAN (rekap semua kasus dalam 1 bulan)
// ============================================================
const BULAN_NAMA = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const exportLaporanBulananPDF = (dataBulanIni, bulan, tahun) => {
  try {
    const pdf = new jsPDF("l", "mm", "a4"); // landscape biar tabel muat
    pdf.setFont("helvetica");
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const marginX = 14;
    const contentWidth = pageWidth - 2 * marginX;
    let y = 0;

    const namaBulan = BULAN_NAMA[Number(bulan)] || "";

    // ===== HEADER =====
    const renderHeader = () => {
      y = 16;
      pdf.setTextColor(...PRIMARY_COLOR);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("LAPORAN BULANAN KONSELING", pageWidth / 2, y, { align: "center" });

      y += 7;
      pdf.setTextColor(...TEXT_GRAY);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Bimbingan dan Konseling - SMP MUSLIMIN CILILIN | Periode: ${namaBulan} ${tahun}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 6;
      drawSeparator(pdf, y, PRIMARY_COLOR, 0.5);
      y += 6;
    };

    const renderFooter = (pageNumber) => {
      const footerY = pageHeight - 12;
      drawSeparator(pdf, footerY - 4, [200, 200, 200], 0.1);
      pdf.setTextColor(...TEXT_GRAY);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Dicetak: ${new Date().toLocaleDateString("id-ID")} | Sistem BK/BP SMP Muslimin Cililin`,
        marginX,
        footerY
      );
      pdf.text(`Halaman ${pageNumber}`, pageWidth - marginX, footerY, { align: "right" });
    };

    renderHeader();

    // ===== RINGKASAN STATISTIK =====
    const total = dataBulanIni.length;
    const selesai = dataBulanIni.filter((d) => d.status_layanan === "Selesai").length;
    const dalamProses = dataBulanIni.filter((d) => d.status_layanan === "Dalam Proses").length;
    const darurat = dataBulanIni.filter((d) => d.tingkat_urgensi === "Darurat").length;
    const perluFollowup = dataBulanIni.filter((d) => d.perlu_followup === true).length;

    pdf.setTextColor(...PRIMARY_COLOR);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("RINGKASAN", marginX, y);
    drawSeparator(pdf, y + 2);
    y += 8;

    const summaryItems = [
      `Total Kasus: ${total}`,
      `Dalam Proses: ${dalamProses}`,
      `Selesai: ${selesai}`,
      `Darurat: ${darurat}`,
      `Perlu Follow-up: ${perluFollowup}`,
    ];
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const summaryColWidth = contentWidth / summaryItems.length;
    summaryItems.forEach((text, i) => {
      pdf.text(text, marginX + i * summaryColWidth, y);
    });
    y += 10;

    // Breakdown per kategori masalah (ringkas, 1 baris)
    const kategoriCount = {};
    dataBulanIni.forEach((item) => {
      const k = item.kategori_masalah || "Belum Dikategorikan";
      kategoriCount[k] = (kategoriCount[k] || 0) + 1;
    });
    const kategoriText = Object.entries(kategoriCount)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => `${label}: ${count}`)
      .join("   |   ");

    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_GRAY);
    const kategoriLines = pdf.splitTextToSize(`Kategori Masalah: ${kategoriText}`, contentWidth);
    pdf.text(kategoriLines, marginX, y);
    y += kategoriLines.length * 4 + 8;

    // ===== TABEL DATA =====
    pdf.setTextColor(...PRIMARY_COLOR);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("DAFTAR KASUS", marginX, y);
    drawSeparator(pdf, y + 2);
    y += 8;

    // Kolom tabel: No | Tanggal | Nama | Kelas | Jenis Layanan | Kategori | Urgensi | Status
    const columns = [
      { header: "No", width: 8 },
      { header: "Tanggal", width: 20 },
      { header: "Nama Siswa", width: 45 },
      { header: "Kelas", width: 18 },
      { header: "Jenis Layanan", width: 28 },
      { header: "Kategori Masalah", width: 35 },
      { header: "Urgensi", width: 20 },
      { header: "Status", width: 28 },
    ];
    const rowHeight = 7;

    const renderTableHeader = () => {
      pdf.setFillColor(...PRIMARY_COLOR);
      pdf.rect(marginX, y, contentWidth, rowHeight, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      let x = marginX;
      columns.forEach((col) => {
        pdf.text(col.header, x + 2, y + 5);
        x += col.width;
      });
      y += rowHeight;
    };

    renderTableHeader();

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);

    const sortedData = [...dataBulanIni].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    sortedData.forEach((item, index) => {
      // Page break check
      if (y + rowHeight > pageHeight - 20) {
        pdf.addPage();
        renderHeader();
        renderTableHeader();
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
      }

      // Alternating row background
      if (index % 2 === 0) {
        pdf.setFillColor(...SECONDARY_BG);
        pdf.rect(marginX, y, contentWidth, rowHeight, "F");
      }

      pdf.setTextColor(0, 0, 0);
      let x = marginX;
      const rowValues = [
        String(index + 1),
        item.tanggal ? new Date(item.tanggal).toLocaleDateString("id-ID") : "-",
        item.full_name || "-",
        item.class_id || "-",
        item.jenis_layanan || "-",
        item.kategori_masalah || "-",
        item.tingkat_urgensi || "-",
        item.status_layanan || "-",
      ];

      columns.forEach((col, i) => {
        const text = pdf.splitTextToSize(rowValues[i], col.width - 3)[0] || "";
        pdf.text(text, x + 2, y + 5);
        x += col.width;
      });

      y += rowHeight;
    });

    // ===== FOOTER SEMUA HALAMAN =====
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      renderFooter(i);
    }

    // ===== SAVE PDF =====
    const fileName = `Laporan_Bulanan_Konseling_${namaBulan}_${tahun}.pdf`;
    pdf.save(fileName);

    return true;
  } catch (error) {
    console.error("Error generating laporan bulanan PDF:", error);
    throw error;
  }
};
