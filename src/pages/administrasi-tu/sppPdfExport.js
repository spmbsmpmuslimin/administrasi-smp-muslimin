// src/pages/administrasi-tu/sppPdfExport.js
// Export "Kartu Pembayaran SPP" (PER SISWA) sebagai PDF -- gantiin fungsi
// kartu fisik yang dulu di-stempel/paraf TU. Isinya rekap semua tahun
// ajaran + bulan siswa itu, dikelompokkan per TA (persis kayak accordion
// yang keliatan di layar Catat Pembayaran), biar bisa dicetak atau
// disimpan sebagai bukti buat ortu.
//
// Dipanggil dari tombol "Cetak Kartu" di SppTab.js -> PembayaranPanel,
// begitu siswa kepilih. Butuh `groupedByTA` yang udah dihitung di sana
// (bukan ditung ulang di sini) biar isi kartu SELALU sama persis sama
// apa yang lagi keliatan di layar TU pas nyetak.
import autoTable from "jspdf-autotable";
import {
  createPdfDocument,
  addLetterhead,
  addSectionLabel,
  tableTheme,
  checkPageBreak,
  savePdf,
  guardHasData,
  PDF_COLORS,
  PDF_FONT_FAMILY,
} from "../../utils/pdfExportKit";
import { MONTH_NAMES, formatRupiah } from "./keuanganShared";

const STATUS_LABEL = {
  paid: "Lunas",
  partial: "Cicilan",
  unpaid: "Blm Bayar",
};

function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Versi singkat (dd/mm/yy) -- dipake KHUSUS di dalam tabel 3-kolom yang
// sempit (kolom "Tgl Bayar"), biar gak overflow. Format panjang
// ("09 September 2026") cuma buat baris "Dicetak" di letterhead.
function formatTanggalSingkat(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * @param {Object} params
 * @param {Object} params.student        - { full_name, nis, class_id }
 * @param {Object} params.groupedByTA    - { [ta]: { grade, items: [{month, year, status, lastPaidDate}] } }
 *   Urutan key harus udah sesuai urutan tampil di layar (TA lama -> baru).
 * @param {number} params.totalTunggakan - total nominal semua bulan yang belum lunas
 * @param {Function} [params.showToast]  - signature (message, type), buat guard "belum ada data"
 */
export function exportKartuPembayaranSPP({
  student,
  groupedByTA,
  totalTunggakan,
  totalPaidBulan = 0,
  lastPaidLabel = null,
  showToast,
}) {
  const hasGroups = groupedByTA && Object.keys(groupedByTA).length > 0;
  if (
    !student ||
    !guardHasData(hasGroups ? [1] : [], {
      showToast,
      message: "Belum ada data tagihan buat dicetak.",
    })
  ) {
    return;
  }

  // Landscape + TA disusun BERDAMPINGAN (bukan ditumpuk ke bawah) --
  // tinggi tiap tabel cuma 12 baris (1 TA = 1 tahun ajaran), jadi lebar
  // landscape (297mm) lebih dari cukup buat nampung sampe 3 TA sekaligus
  // (kasus umum: siswa kelas 9 yang nunggak dari kelas 7) tanpa perlu
  // ganti halaman -- iritin kertas dibanding versi lama yang nge-stack
  // tabel ke bawah (2 halaman kalau TA-nya udah 3).
  const doc = createPdfDocument({ orientation: "landscape" });
  let y = addLetterhead(doc, {
    title: "KARTU PEMBAYARAN SPP",
    metaLines: [`Dicetak: ${formatTanggal(new Date().toISOString())}`],
  });

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(10);
  doc.text(
    `Nama: ${student.full_name}     NIS: ${student.nis}     Kelas: ${student.class_id}`,
    15,
    y
  );
  y += 8;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const gap = 6;
  const colsPerRow = 3;
  const colWidth = (pageWidth - margin * 2 - gap * (colsPerRow - 1)) / colsPerRow;

  const taEntries = Object.entries(groupedByTA);
  let rowMaxFinalY = y;

  taEntries.forEach(([ta, group], idx) => {
    const posInRow = idx % colsPerRow;
    // Kalau kebetulan siswa punya lebih dari 3 TA yang belum lunas
    // (jarang, tapi jaga-jaga), lanjut ke baris kolom berikutnya alih-alih
    // numpuk di luar halaman.
    if (posInRow === 0 && idx > 0) {
      y = checkPageBreak(doc, rowMaxFinalY + 8, { threshold: 175, resetY: 25 });
      rowMaxFinalY = y;
    }
    const colLeft = margin + posInRow * (colWidth + gap);

    addSectionLabel(doc, `TA ${ta} (Kelas ${group.grade})`, y, colLeft);

    const body = group.items.map((p) => [
      MONTH_NAMES[p.month - 1].slice(0, 3),
      p.status === "paid" || p.status === "partial" ? formatTanggalSingkat(p.lastPaidDate) : "-",
      p.status === "unpaid" && p.isDue === false ? "Blm JT" : STATUS_LABEL[p.status] || p.status,
    ]);

    autoTable(doc, {
      ...tableTheme(y + 4, {
        fontSize: 7.5,
        margin: { left: colLeft, right: pageWidth - colLeft - colWidth },
        styles: { cellPadding: 1.2 },
      }),
      head: [["Bln", "Tgl Bayar", "Status"]],
      body,
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
    });

    rowMaxFinalY = Math.max(rowMaxFinalY, doc.lastAutoTable.finalY);
  });

  y = checkPageBreak(doc, rowMaxFinalY + 10, { threshold: 190, resetY: 25 });
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...(totalTunggakan > 0 ? PDF_COLORS.danger : PDF_COLORS.success));
  doc.text(
    totalTunggakan > 0
      ? `Total Tertunggak: ${formatRupiah(totalTunggakan)}`
      : `Sudah Terbayar: ${totalPaidBulan} bulan${lastPaidLabel ? ` (s/d ${lastPaidLabel})` : ""}`,
    15,
    y
  );
  doc.setTextColor(0, 0, 0);

  const safeName = (student.full_name || "siswa").replace(/[^a-zA-Z0-9]+/g, "_");
  savePdf(doc, `Kartu-SPP-${student.nis}-${safeName}.pdf`);
}
