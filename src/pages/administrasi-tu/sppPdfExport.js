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
  unpaid: "Belum Bayar",
};

function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

  const doc = createPdfDocument({ orientation: "portrait" });
  let y = addLetterhead(doc, {
    title: "KARTU PEMBAYARAN SPP",
    metaLines: [`Dicetak: ${formatTanggal(new Date().toISOString())}`],
  });

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(10);
  doc.text(`Nama    : ${student.full_name}`, 15, y);
  y += 5;
  doc.text(`NIS     : ${student.nis}`, 15, y);
  y += 5;
  doc.text(`Kelas   : ${student.class_id}`, 15, y);
  y += 8;

  Object.entries(groupedByTA).forEach(([ta, group]) => {
    y = checkPageBreak(doc, y, { threshold: 255 });
    addSectionLabel(doc, `TA ${ta} (Kelas ${group.grade})`, y);
    y += 4;

    const body = group.items.map((p) => [
      MONTH_NAMES[p.month - 1],
      p.status === "paid" || p.status === "partial" ? formatTanggal(p.lastPaidDate) : "-",
      p.status === "unpaid" && p.isDue === false
        ? "Belum Jatuh Tempo"
        : STATUS_LABEL[p.status] || p.status,
    ]);

    autoTable(doc, {
      ...tableTheme(y, { fontSize: 8.5 }),
      head: [["Bulan", "Tgl Bayar", "Status"]],
      body,
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
    });

    y = doc.lastAutoTable.finalY + 6;
  });

  y = checkPageBreak(doc, y, { threshold: 260 });
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
