// setting/kelola-ujian/jadwal-pengawas/jadwalPengawasExcel.js
// Export Jadwal Pengawas ke .xlsx (landscape, muat 1 halaman lebar).
// Halaman 1 (sheet "Jadwal Pengawas"): judul + tabel jadwal.
// Halaman 2 (sheet "Daftar Kode Pengawas"): judul + tabel No | Nama | Kode.
// Butuh paket `exceljs`  (npm i exceljs)

const KOLOM_TETAP = 4; // Hari/Tanggal, Waktu, Jam ke, Mata Pelajaran

const GARIS = { style: "thin", color: { argb: "FF000000" } };
const BORDER = { top: GARIS, left: GARIS, bottom: GARIS, right: GARIS };
const FONT = { name: "Arial", size: 10 };

function rapikanSel(sel, { bold = false, tengah = true, fill = false } = {}) {
  sel.font = { ...FONT, bold };
  sel.alignment = {
    horizontal: tengah ? "center" : "left",
    vertical: "middle",
    wrapText: true,
  };
  sel.border = BORDER;
  if (fill) sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
}

/** Bikin workbook-nya saja (tanpa download) -- dipisah supaya gampang dites. */
export async function buatWorkbookJadwalPengawas(data) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jadwal Pengawas", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0, // tinggi bebas, lebar dipaksa 1 halaman
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  const jumlahRuangan = data.nomorRuangan.length;
  const totalKolom = KOLOM_TETAP + jumlahRuangan;

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 13;
  ws.getColumn(3).width = 7;
  ws.getColumn(4).width = 26;
  for (let c = KOLOM_TETAP + 1; c <= totalKolom; c++) ws.getColumn(c).width = 7;

  // ---- Judul (3 baris, di tengah, melebar sepanjang tabel) ----
  data.judul.forEach((teks, i) => {
    const r = i + 1;
    ws.mergeCells(r, 1, r, totalKolom);
    const sel = ws.getCell(r, 1);
    sel.value = teks;
    sel.font = { ...FONT, bold: true, size: i === 0 ? 13 : 11 };
    sel.alignment = { horizontal: "center", vertical: "middle" };
  });

  // ---- Header tabel jadwal ----
  const barisHeader = data.judul.length + 2;
  const header = [
    "Hari/Tanggal",
    "Waktu",
    "Jam ke",
    "Mata Pelajaran",
    ...data.nomorRuangan.map((n) => `R. ${n}`),
  ];
  header.forEach((teks, i) => {
    const sel = ws.getCell(barisHeader, i + 1);
    sel.value = teks;
    rapikanSel(sel, { bold: true, fill: true });
  });
  ws.getRow(barisHeader).height = 20;

  // ---- Isi jadwal ----
  let r = barisHeader + 1;
  data.baris.forEach((b) => {
    const nilai = [b.tanggalLabel, b.waktu, b.jamKe, b.mapel, ...b.kodePerRuangan];
    nilai.forEach((v, i) => {
      const sel = ws.getCell(r, i + 1);
      // Baris lanjutan dalam 1 hari: JANGAN nulis kolom A (sel itu bagian dari
      // merge, nulis "" di sini bakal menimpa label hari di baris pertama).
      if (!(i === 0 && b.spanHari === 0)) sel.value = v;
      rapikanSel(sel, { tengah: i !== 3 && i !== 0 });
    });
    ws.getRow(r).height = b.mapel.length > 30 ? 30 : 20;
    if (b.spanHari > 1) ws.mergeCells(r, 1, r + b.spanHari - 1, 1);
    r += 1;
  });

  // ---- Halaman 2: Daftar Kode Pengawas ----
  // Sheet TERPISAH (bukan page break) karena Excel mengabaikan page break
  // manual kalau "Fit to page" aktif -- sheet sendiri pasti tercetak di
  // halaman sendiri, dan tetap ikut ke-export bareng dalam 1 file.
  const ws2 = wb.addWorksheet("Daftar Kode Pengawas", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });
  ws2.getColumn(1).width = 7;
  ws2.getColumn(2).width = 64;
  ws2.getColumn(3).width = 12;

  // Judul diulang (2 baris pertama sama dengan halaman 1) + judul daftar.
  [data.judul[0], data.judul[1], "DAFTAR KODE PENGAWAS"].forEach((teks, i) => {
    ws2.mergeCells(i + 1, 1, i + 1, 3);
    const sel = ws2.getCell(i + 1, 1);
    sel.value = teks;
    sel.font = { ...FONT, bold: true, size: i === 0 ? 13 : 11 };
    sel.alignment = { horizontal: "center", vertical: "middle" };
  });

  const barisHeader2 = 5;
  ["No", "Nama Pengawas", "Kode"].forEach((teks, i) => {
    const sel = ws2.getCell(barisHeader2, i + 1);
    sel.value = teks;
    rapikanSel(sel, { bold: true, fill: true });
  });
  ws2.getRow(barisHeader2).height = 20;

  data.daftarKode.forEach((k, i) => {
    const baris = barisHeader2 + 1 + i;
    [k.no, k.nama, k.kode].forEach((v, c) => {
      const sel = ws2.getCell(baris, c + 1);
      sel.value = v;
      rapikanSel(sel, { tengah: c !== 1 });
    });
    ws2.getCell(baris, 2).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws2.getRow(baris).height = 18;
  });

  return wb;
}

/** Bikin + langsung download file .xlsx di browser. */
export async function exportJadwalPengawasExcel(data) {
  const wb = await buatWorkbookJadwalPengawas(data);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.namaFile}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
