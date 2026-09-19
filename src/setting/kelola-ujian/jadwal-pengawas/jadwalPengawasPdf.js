// setting/kelola-ujian/jadwal-pengawas/jadwalPengawasPdf.js
// Export Jadwal Pengawas ke PDF landscape A4.
// Layout sama dengan Excel: halaman 1 = jadwal, halaman 2 = Daftar Kode Pengawas.
// Butuh paket `jspdf` + `jspdf-autotable`  (npm i jspdf jspdf-autotable)

const MARGIN = 8; // mm

/** Bikin dokumen PDF-nya saja (tanpa save) -- dipisah supaya gampang dites. */
export async function buatDokumenPdfJadwalPengawas(data) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const lebarHalaman = doc.internal.pageSize.getWidth();
  const lebarPakai = lebarHalaman - MARGIN * 2;

  // ---- Judul ----
  data.judul.forEach((teks, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(i === 0 ? 13 : 10.5);
    doc.text(teks, lebarHalaman / 2, 12 + i * 5.5, { align: "center" });
  });

  // ---- Lebar kolom: 4 kolom tetap, sisanya dibagi rata ke kolom ruangan ----
  const lebarTetap = { 0: 30, 1: 20, 2: 12, 3: 40 };
  const totalTetap = Object.values(lebarTetap).reduce((a, b) => a + b, 0);
  const jumlahRuangan = data.nomorRuangan.length;
  const lebarRuangan = jumlahRuangan > 0 ? (lebarPakai - totalTetap) / jumlahRuangan : 0;

  const columnStyles = { ...Object.fromEntries(Object.entries(lebarTetap).map(([k, w]) => [k, { cellWidth: w }])) };
  for (let i = 0; i < jumlahRuangan; i++) {
    columnStyles[4 + i] = { cellWidth: lebarRuangan, halign: "center" };
  }
  columnStyles[0].halign = "left";
  columnStyles[1].halign = "center";
  columnStyles[2].halign = "center";
  columnStyles[3].halign = "left";

  // ---- Tabel jadwal ----
  const body = data.baris.map((b) => {
    const sel = [];
    // Sel Hari/Tanggal cuma di sesi pertama, digabung vertikal (rowSpan).
    if (b.spanHari > 0) {
      sel.push({ content: b.tanggalLabel, rowSpan: b.spanHari, styles: { valign: "middle" } });
    }
    sel.push(b.waktu, String(b.jamKe), b.mapel, ...b.kodePerRuangan);
    return sel;
  });

  autoTable(doc, {
    startY: 28,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Hari/Tanggal", "Waktu", "Jam ke", "Mata Pelajaran", ...data.nomorRuangan.map((n) => `R. ${n}`)]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 1.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
    columnStyles,
  });

  // ---- Halaman 2: Daftar Kode Pengawas (selalu halaman baru) ----
  doc.addPage();
  [data.judul[0], data.judul[1], "DAFTAR KODE PENGAWAS"].forEach((teks, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(i === 0 ? 13 : 10.5);
    doc.text(teks, lebarHalaman / 2, 12 + i * 5.5, { align: "center" });
  });

  const lebarKode = 120;
  autoTable(doc, {
    startY: 28,
    margin: { left: (lebarHalaman - lebarKode) / 2, right: (lebarHalaman - lebarKode) / 2 },
    tableWidth: lebarKode,
    head: [["No", "Nama Pengawas", "Kode"]],
    body: data.daftarKode.map((k) => [String(k.no), k.nama, k.kode]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 1.6,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 90, halign: "left" },
      2: { cellWidth: 16, halign: "center" },
    },
  });

  return doc;
}

export async function exportJadwalPengawasPdf(data) {
  const doc = await buatDokumenPdfJadwalPengawas(data);
  doc.save(`${data.namaFile}.pdf`);
}
