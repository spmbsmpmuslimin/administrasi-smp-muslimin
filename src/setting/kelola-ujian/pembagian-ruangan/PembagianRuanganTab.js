// setting/kelola-ujian/pembagian-ruangan/PembagianRuanganTab.js
// Komponen isi untuk urusan RUANGAN + PESERTA. Alur aslinya: pilih tahun
// ajaran -> "Proses Pembagian" (preview dulu, belum nyimpen) -> quota manual
// -> "Simpan ke Database". Proses ulang aman dipanggil berkali-kali (lihat
// simpanPembagianRuangan di pembagianRuanganSupabase.js -- data lama dihapus
// dulu tiap simpan).
//
// PENTING: sejak kartu sub-fitur disusun ulang biar isinya nyambung sama
// judulnya, komponen ini dipakai lewat prop `mode`:
//   - JadwalRuanganTab.js   (kartu "Jadwal, Peserta & Pembagian Ruangan")
//       mode="ruangan" -> Komposisi Ruangan + tabel quota + Preview Per
//       Ruangan + Export Daftar Peserta + tombol Simpan. Ketiga tab bawah
//       (edit/preview/export) sengaja 1 komponen yang sama, jadi hasil
//       editan quota langsung kelihatan di Preview MAUPUN keexport,
//       WYSIWYG, walaupun belum diklik "Simpan ke Database" (lihat
//       handleExportExcel/handleExportPdf).
//   - mode="peserta" (READ-ONLY dari data yang sudah TERSIMPAN di DB, tanpa
//       tombol proses/simpan) sengaja DIPERTAHANKAN di kode ini walau per
//       sekarang belum ada kartu yang memakainya -- Export sudah pindah
//       total ke mode "ruangan" di atas. Aman dihapus belakangan kalau
//       beneran gak kepake lagi.
//
// Prop `viewPaksa`/`tabPaksa` bikin tab bar internal disembunyiin & tab aktif
// ditentuin parent. Kalau `onBack` nggak dikirim, tombol balik & header jenis
// ujian juga disembunyiin. Tanpa prop-prop itu, komponen ini tetap jalan utuh
// seperti sebelum dipisah (mode="full").
//
// Kelas peserta per jenis ujian (PSAS = 7-9, PSAT = 7-8, PSAJ = 9 saja)
// SUDAH otomatis difilter di prosesPembagianRuangan() lewat
// KONFIGURASI_JENIS_UJIAN[jenisUjian].grades -- jadi sengaja TIDAK ada
// dropdown "pilih kelas" manual di UI ini.

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  RefreshCw,
  Save,
  Users,
  DoorOpen,
  Plus,
  Trash2,
  Table2,
  Eye,
  Armchair,
  FileSpreadsheet,
  FileText,
  Loader2,
  LayoutGrid,
  AlertTriangle,
  Unlock,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  ambilSiswaPerKelas,
  getOrCreateUjian,
  cariUjian,
  prosesPembagianRuangan,
  simpanPembagianRuangan,
  hitungDampakSimpan,
  ambilPembagianTersimpan,
  resetUntukProsesUlang,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagianRuanganSupabase";
import {
  bagiRuanganPerJenjang,
  bangunMatrixKomposisi,
  VERSI_SKEMA_LIST,
  versiSkemaValid,
  normalisasiVersiSkema,
  normalisasiVersiSkemaTersimpan,
  labelVersiSkema,
} from "./bagiRuanganPerJenjang";
import { terapkanQuotaManual, hitungTotalPerKelas } from "./bagiRuangan";
import { exportDaftarPesertaUjian } from "./daftarPesertaExcelExport";
import { exportDaftarPesertaUjianPdf } from "./daftarPesertaPdfExport";
import { bangunPetaNoPeserta } from "./noPeserta";
import DenahDuduk from "./DenahDuduk";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester (kelas 7-9)",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun (kelas 7-8)",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang (kelas 9)",
};

// Pilihan algoritma pembagian ruangan sekarang di-import dari
// bagiRuanganPerJenjang.js (VERSI_SKEMA_LIST) supaya cuma ada 1 sumber
// kebenaran -- dulu daftarnya ditulis ulang di sini dan gampang ketinggalan
// tiap ada versi baru. versi_skema tersimpan di record `ujian` pas pertama
// kali diproses & disimpan -- gak bisa diganti lagi setelah itu lewat
// sub-fitur ini (lihat versiSkemaTerkunci di bawah).

// 2 tab level PALING ATAS: "Komposisi Ruangan" (bandingin semua versi dulu,
// murni preview, belum proses/simpan apa-apa) dan "Pembagian Ruangan"
// (alur asli: proses -> quota manual -> simpan). Beda sama TAB_LIST di
// bawah, yang itu sub-tab DI DALAM "Pembagian Ruangan" doang.
const VIEW_TAB_LIST = [
  { id: "komposisi", label: "Komposisi Ruangan", icon: LayoutGrid },
  { id: "pembagian", label: "Pembagian Ruangan", icon: DoorOpen },
];

// Definisi 4 tab di bagian bawah (dulu masing-masing ditulis manual jadi
// blok JSX yang identik kecuali label/ikon) -- sekarang cukup 1 array
// yang di-map, biar kalau nambah/ubah tab nggak perlu copy-paste style-nya lagi.
//
// "denah" (Denah Duduk) DITARUH di antara "preview" dan "export" --
// baca data yang PERSIS sama kayak "preview" (hasilLive + petaNoPeserta,
// diurutkan no_kursi), cuma disusun jadi grid kursi (representasi visual
// posisi duduk fisik) bukan tabel daftar. Read-only, sama kayak "preview",
// jadi di semua tempat kode ini yang nge-cek `tabAktif !== "preview" &&
// tabAktif !== "export"` buat nyembunyiin kontrol proses/simpan, "denah"
// juga ikut disembunyiin (lihat kondisi-kondisi itu di bawah).
const TAB_LIST = [
  { id: "edit", label: "Pembagian Ruangan", icon: Table2 },
  { id: "preview", label: "Preview Per Ruangan", icon: Eye },
  { id: "denah", label: "Denah Duduk", icon: Armchair },
  { id: "export", label: "Export Daftar Peserta", icon: FileSpreadsheet },
];

// Cari kolom yang paling masuk akal buat label tahun ajaran, karena kita
// nggak tau pasti nama kolomnya (year / tahun_ajaran / name / dst)
function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

// Tanda tangan (signature) tabel quota -- string yang SAMA kalau isi quotanya
// sama, apa pun urutan ruangan/kelasnya. Dipakai buat ngecek "ada perubahan
// yang belum disimpan?" (bandingin quota di layar vs quota terakhir yang
// dimuat dari / disimpan ke database). Ruangan yang total quotanya 0
// diabaikan karena handleSimpan() juga membuang ruangan kosong, jadi ruangan
// kosong yang ditambah lalu dibiarkan nggak dianggap perubahan.
function buatSignaturQuota(quotaPerRuangan) {
  if (!quotaPerRuangan) return "";
  return JSON.stringify(
    quotaPerRuangan
      .map((r) => ({
        nomor: r.nomor_ruangan,
        isi: Object.entries(r.quota || {})
          .map(([kelas, jumlah]) => [kelas, Number(jumlah) || 0])
          .filter(([, jumlah]) => jumlah > 0)
          .sort(([a], [b]) => a.localeCompare(b)),
      }))
      .filter((r) => r.isi.length > 0)
      .sort((a, b) => a.nomor - b.nomor)
  );
}

// Warna aksen per versi skema, dipakai buat nge-highlight kelas yang MASUK
// ke suatu ruangan (jumlah > 0) di TabelMatrixJenjang -- beda warna per versi
// biar pas gonta-ganti sub-tab (Silang Jenjang / Rotasi Penuh / Rantai
// Muter) langsung kekasih keliatan beda tanpa perlu baca ulang label-nya.
// Kelas yang GAK masuk (jumlah 0) sengaja diredupkan (abu-abu, gak bold)
// biar kontrasnya jelas sama yang masuk.
const AKSEN_WARNA_VERSI = {
  silang: {
    isi: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    kosong: "text-gray-300 dark:text-gray-600",
  },
  rotasi: {
    isi: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    kosong: "text-gray-300 dark:text-gray-600",
  },
  rantai: {
    isi: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    kosong: "text-gray-300 dark:text-gray-600",
  },
};
const AKSEN_WARNA_DEFAULT = AKSEN_WARNA_VERSI.rotasi;

// Render 1 tabel matrix (Ruang x Kelas) buat 1 jenjang, gaya sama kayak
// file Excel referensi awal: baris = ruang, kolom = kelas asal, + baris
// "Cek Total" (dijumlah dari hasil pembagian) & "Data Asli" (jumlah siswa
// kelas itu sebelum dibagi) buat validasi visual -- kalau 2 baris itu gak
// pas di 1 kolom, kolomnya di-highlight merah (harusnya nggak pernah
// kejadian selama algoritmanya bener, tapi tetep dicek biar keliatan
// kalau ada yang aneh).
//
// `versiAktif` nentuin warna aksen buat kelas yang MASUK ke tiap ruangan
// (lihat AKSEN_WARNA_VERSI di atas) -- kelas yang jumlahnya 0 di suatu
// ruangan diredupkan, biar langsung kebaca kelas mana aja yang beneran
// nyampur di ruangan itu tanpa harus mindai angka satu-satu.
const TabelMatrixJenjang = ({ data, versiAktif }) => {
  const { jenjang, urutanKelas, ruang, cekTotal, dataAsli } = data;
  const aksen = AKSEN_WARNA_VERSI[versiAktif] || AKSEN_WARNA_DEFAULT;
  return (
    <div className="mb-6">
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Jenjang {jenjang}</p>
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-xs sm:text-sm border-collapse rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="text-left py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600">
                Ruangan
              </th>
              {urutanKelas.map((kelas) => (
                <th
                  key={kelas}
                  className="text-center py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600"
                >
                  {kelas}
                </th>
              ))}
              <th className="text-center py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {ruang.map((r, idx) => (
              <tr
                key={r.nomor_ruangan}
                className={`border-b border-gray-200 dark:border-gray-700 ${
                  idx % 2 === 1 ? "bg-gray-50 dark:bg-gray-800/40" : "bg-white dark:bg-gray-800"
                }`}
              >
                <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  Ruang {r.nomor_ruangan}
                </td>
                {urutanKelas.map((kelas) => {
                  const jumlah = r.perKelas[kelas] || 0;
                  return (
                    <td key={kelas} className="text-center py-2 px-3">
                      {jumlah > 0 ? (
                        <span
                          className={`inline-block min-w-[2rem] px-2 py-0.5 rounded-md font-bold ${aksen.isi}`}
                        >
                          {jumlah}
                        </span>
                      ) : (
                        <span className={`font-normal ${aksen.kosong}`}>0</span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center py-2 px-3 font-bold text-gray-900 dark:text-white">
                  {r.total}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800/60">
              <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">Cek Total</td>
              {urutanKelas.map((kelas) => {
                const pas = (cekTotal[kelas] || 0) === (dataAsli[kelas] || 0);
                return (
                  <td key={kelas} className="text-center py-2 px-3">
                    <span
                      className={`inline-block min-w-[2rem] px-2 py-0.5 rounded-md font-bold ${
                        pas
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      }`}
                    >
                      {cekTotal[kelas] || 0}
                    </span>
                  </td>
                );
              })}
              <td></td>
            </tr>
            <tr className="bg-indigo-50 dark:bg-indigo-900/30">
              <td className="py-2 px-3 font-bold text-indigo-800 dark:text-indigo-300">
                Data Asli (Total Siswa)
              </td>
              {urutanKelas.map((kelas) => (
                <td
                  key={kelas}
                  className="text-center py-2 px-3 font-extrabold text-indigo-800 dark:text-indigo-300"
                >
                  {dataAsli[kelas] || 0}
                </td>
              ))}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// jenisUjian sekarang datang dari level atas (JenisUjianMenuTab / pemilihan
// PSAS-PSAT-PSAJ) -- sudah fixed di sini, jadi tidak ada lagi dropdown buat
// gonta-ganti jenis ujian di dalam sub-fitur ini.
const PembagianRuanganTab = ({
  jenisUjian,
  showToast,
  onBack,
  // "full"    = semua tab (dipakai kalau komponen ini dibuka sebagai layar sendiri)
  // "ruangan" = cuma bagian PENYUSUNAN ruangan: Komposisi + Pembagian (quota)
  //             + tombol Simpan. Dipakai di kartu "Jadwal, Peserta & Pembagian Ruangan".
  // "peserta" = cuma bagian PESERTA: Preview Per Ruangan + Export Daftar
  //             Peserta, read-only dari data yang SUDAH tersimpan di DB.
  //             Sengaja DIPERTAHANKAN buat kompatibilitas, tapi per
  //             sekarang gak ada kartu yang pakai mode ini lagi (Export
  //             udah pindah ke mode "ruangan" di kartu "Jadwal &
  //             Pembagian Ruangan").
  mode = "full",
  // Kalau parent ngirim viewPaksa/tabPaksa, tab bar internal disembunyiin dan
  // tab aktif ditentuin parent -- biar nggak ada 2-3 baris tab numpuk waktu
  // komponen ini di-embed di kartu yang udah punya tab bar sendiri.
  viewPaksa = null,
  tabPaksa = null,
  // Opsional. Dipanggil dengan true/false tiap status "ada perubahan yang
  // belum disimpan" berubah, supaya parent (mis. JadwalRuanganTab) bisa
  // nanya konfirmasi sebelum user pindah layar dan ngebuang perubahan itu.
  onDirtyChange,
}) => {
  const modePeserta = mode === "peserta";
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [kapasitas, setKapasitas] = useState(
    KONFIGURASI_JENIS_UJIAN[jenisUjian]?.defaultKapasitas || 40
  );
  // "" = admin BELUM milih versi. Sengaja gak dikasih nilai awal: gak ada
  // versi default di sistem ini, panitia yang mesti milih sesuai kebutuhan
  // ujian (lihat catatan di bagiRuanganPerJenjang.js). Tombol "Proses
  // Pembagian" dikunci selama ini masih kosong.
  const [versiSkema, setVersiSkema] = useState("");
  // true kalau ujian utk kombinasi jenisUjian+tahunAjaranId ini SUDAH ada
  // record-nya di DB (udah pernah diproses & disimpan) -- versi_skema
  // record itu gak bisa diganti lagi lewat sub-fitur ini, jadi radio-nya
  // dikunci & cuma nampilin versi yang beneran kepake.
  const [versiSkemaTerkunci, setVersiSkemaTerkunci] = useState(false);
  // Modal konfirmasi buat tombol "Proses Ulang dengan Versi Lain" -- aksi
  // eksplisit yang disebut di komentar getOrCreateUjian() (lihat
  // resetUntukProsesUlang di pembagianRuanganSupabase.js). Checkbox wajib
  // dicentang dulu baru tombol konfirmasi di modal aktif, biar admin bener-
  // bener baca peringatannya sebelum data lama kehapus. versiBaruDipilih
  // dipilih LANGSUNG di modal (bukan lewat radio utama) karena
  // resetUntukProsesUlang sekarang update versi_skema di tempat, sekali
  // jalan -- gak ada lagi jeda "kebuka dulu baru radio-nya bisa dipencet".
  const [prosesUlangModalOpen, setProsesUlangModalOpen] = useState(false);
  const [konfirmasiProsesUlang, setKonfirmasiProsesUlang] = useState(false);
  const [memProsesUlang, setMemProsesUlang] = useState(false);
  // "" = belum milih. Diisi pas modal dibuka dengan versi PERTAMA yang
  // BUKAN versi yang lagi kepake -- bukan "default versi", tapi karena
  // aksi modal ini emang "ganti ke versi lain", jadi nyodorin versi yang
  // sama persis kayak sekarang gak ada gunanya. Admin bebas milih lainnya.
  const [versiBaruDipilih, setVersiBaruDipilih] = useState("");

  // Tab level PALING ATAS: "komposisi" (bandingin V1 vs V2, preview doang)
  // atau "pembagian" (alur proses -> quota manual -> simpan, default).
  const [viewInternal, setViewInternal] = useState("pembagian");
  const viewAktif = viewPaksa || viewInternal;
  const setViewAktif = setViewInternal;
  // Hasil bangunMatrixKomposisi() buat SEMUA versi sekaligus:
  // { silang: [...], rotasi: [...], rantai: [...] }, masing-masing array
  // per jenjang. null = belum pernah dihitung.
  const [komposisiData, setKomposisiData] = useState(null);
  const [memuatKomposisi, setMemuatKomposisi] = useState(false);
  // tahunAjaranId waktu komposisiData terakhir dihitung -- dipakai buat
  // deteksi "udah basi" (tahun ajaran diganti) tanpa perlu useEffect+reset
  // terpisah; render tinggal bandingin ini sama tahunAjaranId yang aktif.
  const [komposisiUntukTahunAjaran, setKomposisiUntukTahunAjaran] = useState(null);
  // Sub-tab DI DALAM tab Komposisi Ruangan: lagi liatin versi yang mana.
  // Sub-tab mana yang kebuka duluan di tab Komposisi. Ini MURNI pilihan
  // tampilan (tab preview harus nampilin sesuatu), BUKAN versi yang bakal
  // kepake -- milih versi beneran tetap lewat radio di tab Pembagian atau
  // tombol "Pakai ... untuk Pembagian Ruangan" di bawah matrix.
  const [komposisiVersiAktif, setKomposisiVersiAktif] = useState(VERSI_SKEMA_LIST[0].value);

  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);
  const [memproses, setMemproses] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  // Loading khusus buat proses "narik data tersimpan" pas tab ini dibuka /
  // tahun ajaran diganti -- beda dari `memproses` (itu buat generate ulang
  // manual lewat tombol "Proses Pembagian").
  const [memuatTersimpan, setMemuatTersimpan] = useState(false);

  // hasilAsli = hasil bagiRuangan() ASLI (auto-generate, proporsional),
  // dipakai sebagai "sumber siswa" waktu quota manual diterapkan --
  // TIDAK ditampilkan langsung, cuma dipakai di belakang layar.
  const [hasilAsli, setHasilAsli] = useState(null);
  // quotaPerRuangan = yang admin lihat & edit di tabel: [{ nomor_ruangan, quota: { "7A": 14, ... } }]
  const [quotaPerRuangan, setQuotaPerRuangan] = useState(null);
  // Signature (lihat buatSignaturQuota) quota terakhir yang SUDAH ada di
  // database -- diisi pas data tersimpan dimuat & setelah Simpan berhasil.
  // null = belum ada yang tersimpan buat tahun ajaran ini. Dibandingin sama
  // quotaPerRuangan buat deteksi perubahan yang belum disimpan.
  const [quotaTersimpan, setQuotaTersimpan] = useState(null);
  // targetPerKelas = total siswa per kelas (dari hasilAsli) -- angka yang
  // harus dipenuhi PAS oleh jumlah quota manual admin per kelas.
  const [targetPerKelas, setTargetPerKelas] = useState({});
  const [daftarKelas, setDaftarKelas] = useState([]);
  // Tab yang lagi aktif di bagian bawah: "edit" (tabel isi quota) atau
  // "preview" (lihat 1 ruangan sekaligus, format bersih -- fondasi buat
  // nanti dipakai cetak per ruangan).
  const [tabInternal, setTabInternal] = useState(modePeserta ? "export" : "edit");
  const tabAktif = tabPaksa || tabInternal;
  const setTabAktif = setTabInternal;
  // SUDAH GAK DIPAKAI DI RENDER -- dulu ini nyimpen ruangan yang lagi
  // dipilih di dropdown tab Preview (1 ruangan tampil per waktu). Sekarang
  // tab Preview nampilin SEMUA ruangan sekaligus ditumpuk, jadi gak perlu
  // "ruangan aktif" lagi. Sengaja TIDAK dihapus (beserta semua
  // setRuanganPreviewAktif(...) di file ini) buat minimalisir resiko
  // nyentuh bagian lain yang gak ada hubungannya sama perubahan ini --
  // aman dibiarkan nganggur, cuma nyimpen state yang gak kebaca lagi.
  const [ruanganPreviewAktif, setRuanganPreviewAktif] = useState(null); // eslint-disable-line no-unused-vars
  // Tab "Denah Duduk": ruangan mana yang lagi ditampilin. State TERPISAH
  // dari ruanganPreviewAktif (walau sama-sama "lagi liat ruangan yang
  // mana") -- pola sama kayak ruanganExport, biar masing-masing tab inget
  // pilihan ruangan terakhirnya sendiri kalau admin gonta-ganti tab.
  const [ruanganDenahAktif, setRuanganDenahAktif] = useState(null);
  // Jumlah kolom kursi buat grid di tab "Denah Duduk" -- MURNI pengaturan
  // tampilan (gak disimpan ke DB, gak ngaruh ke algoritma pembagian),
  // admin bebas nyesuaiin sama bentuk fisik ruangan aslinya. Default 4
  // dipilih karena kebanyakan ruang kelas di sekolah ini muat sekitar situ.
  const [jumlahKolomDenah, setJumlahKolomDenah] = useState(4);
  // Tab "Export Daftar": ruangan mana yang mau diexport. "semua" = semua
  // ruangan jadi 1 file (1 sheet per ruangan), selain itu isinya nomor ruangan.
  const [ruanganExport, setRuanganExport] = useState("semua");
  const [mengexport, setMengexport] = useState(false);
  const [mengexportPdf, setMengexportPdf] = useState(false);

  // Tahun ajaran yang relevan sama jenis ujian yang dipilih (PSAS = semester
  // ganjil/1, PSAT & PSAJ = semester genap/2). Kalau nggak ada yang cocok,
  // fallback tampilin semua biar admin tetap bisa pilih manual.
  const semesterDibutuhkan = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.semester;
  const tahunAjaranTerfilter = daftarTahunAjaran.filter(
    (ta) => String(ta.semester) === semesterDibutuhkan
  );
  const opsiTahunAjaran =
    tahunAjaranTerfilter.length > 0 ? tahunAjaranTerfilter : daftarTahunAjaran;

  useEffect(() => {
    (async () => {
      try {
        const data = await ambilDaftarTahunAjaran();
        setDaftarTahunAjaran(data);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat daftar tahun ajaran", "error");
      } finally {
        setLoadingTahunAjaran(false);
      }
    })();
  }, [showToast]);

  // Begitu data tahun ajaran kemuat, pastikan tahunAjaranId yang aktif
  // selalu ada di daftar opsi yang lagi ditampilin (jenisUjian sendiri
  // sudah fixed dari prop, jadi tidak perlu lagi jadi dependency di sini).
  useEffect(() => {
    if (opsiTahunAjaran.length === 0) {
      setTahunAjaranId("");
      return;
    }
    const masihAda = opsiTahunAjaran.some((ta) => ta.id === tahunAjaranId);
    if (!masihAda) {
      // Prioritaskan yang is_active kalau ada
      const aktif = opsiTahunAjaran.find((ta) => ta.is_active);
      setTahunAjaranId((aktif || opsiTahunAjaran[0]).id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarTahunAjaran]);

  // Begitu tahunAjaranId siap (termasuk pas tab ini pertama kali dibuka
  // atau admin balik lagi setelah sempat pindah ke card lain), coba tarik
  // dulu data yang SUDAH TERSIMPAN di peserta_ujian buat kombinasi
  // jenisUjian + tahunAjaranId ini. Kalau ada, langsung isi hasilAsli +
  // quotaPerRuangan dari situ -- jadi admin lihat lagi hasil yang udah
  // disimpan, bukan form kosong kayak awal. Kalau belum pernah
  // diproses/disimpan sama sekali, biarin kosong seperti semula (nunggu
  // admin pencet "Proses Pembagian").
  useEffect(() => {
    if (!tahunAjaranId) return;
    let dibatalkan = false;
    (async () => {
      setMemuatTersimpan(true);
      setHasilAsli(null);
      setQuotaPerRuangan(null);
      setQuotaTersimpan(null);
      setVersiSkemaTerkunci(false);
      try {
        const ujian = await cariUjian(supabase, jenisUjian, tahunAjaranId);
        // !ujian.versi_skema mencakup record DRAFT (dibikin dari kartu
        // "Jadwal Ujian" / "Panitia Ujian" lewat getOrCreateUjianDraft,
        // SEBELUM Pembagian Ruangan pernah diproses) -- draft itu harus
        // diperlakukan sama kayak "belum ada record sama sekali" di
        // sini, biar dropdown versi skema TETAP kebuka bebas & form
        // TETAP kosong nunggu diproses, bukan ke-lock keliru.
        if (!ujian || !ujian.versi_skema) return; // belum pernah diproses buat kombinasi ini
        // normalisasi: record lama nyimpen "v1"/"v2" yang artinya Rotasi
        // Penuh / Rantai Muter -- sekarang V2/V3, kodenya "rotasi"/"rantai"
        // pakai ...Tersimpan(): kolom yang KOSONG di record lama artinya
        // "warisan sebelum versi_skema kepakai" (= campur merata), bukan
        // "belum dipilih" -- beda arti sama input kosong dari admin.
        setVersiSkema(normalisasiVersiSkemaTersimpan(ujian.versi_skema) || "");
        setVersiSkemaTerkunci(true);
        const tersimpan = await ambilPembagianTersimpan(supabase, ujian.id);
        if (dibatalkan || tersimpan.length === 0) return;

        setKapasitas(ujian.kapasitas_ruangan || kapasitas);
        setHasilAsli(tersimpan);
        setTargetPerKelas(hitungTotalPerKelas(tersimpan));
        setDaftarKelas(
          [...new Set(tersimpan.flatMap((r) => r.siswa.map((s) => s.asal_kelas)))].sort()
        );
        const quotaTermuat = tersimpan.map((r) => {
          const quota = {};
          r.siswa.forEach((s) => {
            quota[s.asal_kelas] = (quota[s.asal_kelas] || 0) + 1;
          });
          return { nomor_ruangan: r.nomor_ruangan, quota };
        });
        setQuotaPerRuangan(quotaTermuat);
        setQuotaTersimpan(buatSignaturQuota(quotaTermuat));
        setRuanganPreviewAktif(tersimpan[0]?.nomor_ruangan ?? null);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat data tersimpan: " + err.message, "error");
      } finally {
        if (!dibatalkan) setMemuatTersimpan(false);
      }
    })();
    return () => {
      dibatalkan = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaranId, jenisUjian]);

  // Hitung V1 & V2 SEKALIGUS (murni di memori, gak nyentuh DB) buat
  // ditampilin berdampingan di tab "Komposisi Ruangan" -- beda dari
  // handleProses di bawah yang cuma proses 1 versi (yang lagi dipilih di
  // radio) dan itu yang bakal disimpan.
  const handleLihatKomposisi = async () => {
    if (!tahunAjaranId) {
      showToast?.("Pilih tahun ajaran dulu", "error");
      return;
    }
    setMemuatKomposisi(true);
    try {
      const allowedGrades = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.grades || null;
      const dataSiswaPerKelas = await ambilSiswaPerKelas(supabase, tahunAjaranId, allowedGrades);
      // Dihitung buat SEMUA versi di VERSI_SKEMA_LIST, jadi nambah versi
      // baru nanti gak perlu nyentuh fungsi ini lagi.
      const semuaKomposisi = {};
      VERSI_SKEMA_LIST.forEach((opsi) => {
        const hasil = bagiRuanganPerJenjang(dataSiswaPerKelas, opsi.value);
        semuaKomposisi[opsi.value] = bangunMatrixKomposisi(hasil, dataSiswaPerKelas);
      });
      setKomposisiData(semuaKomposisi);
      setKomposisiUntukTahunAjaran(tahunAjaranId);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat komposisi ruangan: " + err.message, "error");
    } finally {
      setMemuatKomposisi(false);
    }
  };

  // Dipanggil dari tombol "Pakai versi ini" di tab Komposisi Ruangan --
  // set radio versiSkema di tab Pembagian Ruangan, terus langsung pindah
  // ke tab itu biar admin tinggal klik "Proses Pembagian". Gak ngapa-
  // ngapain kalau versinya udah terkunci (ujian ini udah pernah diproses).
  const handlePilihVersi = (value) => {
    if (versiSkemaTerkunci) {
      showToast?.(
        "Versi udah terkunci ke " +
          labelVersiSkema(versiSkema) +
          " -- ujian ini sudah pernah diproses/disimpan",
        "error"
      );
      return;
    }
    setVersiSkema(value);
    setViewAktif("pembagian");
  };

  // true kalau quota di layar beda dari yang ada di database (atau belum
  // pernah disimpan sama sekali). Mode "peserta" read-only, jadi nggak
  // pernah dianggap ada perubahan.
  const adaPerubahanBelumDisimpan = useMemo(
    () =>
      !modePeserta &&
      quotaPerRuangan != null &&
      buatSignaturQuota(quotaPerRuangan) !== quotaTersimpan,
    [modePeserta, quotaPerRuangan, quotaTersimpan]
  );

  // Kabari parent (JadwalRuanganTab) supaya tombol "Kembali"-nya bisa nanya
  // konfirmasi.
  useEffect(() => {
    onDirtyChange?.(adaPerubahanBelumDisimpan);
  }, [adaPerubahanBelumDisimpan, onDirtyChange]);

  // Refresh / tutup tab browser: minta konfirmasi bawaan browser selama ada
  // perubahan yang belum disimpan. (Browser menampilkan teks standarnya
  // sendiri, teks kustom diabaikan.)
  useEffect(() => {
    if (!adaPerubahanBelumDisimpan) return undefined;
    const cegahTutup = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", cegahTutup);
    return () => window.removeEventListener("beforeunload", cegahTutup);
  }, [adaPerubahanBelumDisimpan]);

  const handleGantiTahunAjaran = (idBaru) => {
    if (
      adaPerubahanBelumDisimpan &&
      idBaru !== tahunAjaranId &&
      !window.confirm(
        "Ada pembagian ruangan atau quota yang belum disimpan. Kalau ganti tahun ajaran, perubahan itu hilang. Tetap ganti?"
      )
    ) {
      return;
    }
    setTahunAjaranId(idBaru);
  };

  const handleProses = async () => {
    if (!tahunAjaranId) {
      showToast?.("Pilih tahun ajaran dulu", "error");
      return;
    }
    // Guard: kapasitas <= 0 (misal field dikosongin admin) bikin
    // bagiRuangan() looping tanpa henti -- ditangkep di sini dulu sebelum
    // sempat manggil algoritmanya.
    if (!Number.isFinite(kapasitas) || kapasitas <= 0) {
      showToast?.("Kapasitas per ruangan harus angka positif", "error");
      return;
    }
    // Gak ada versi default -- kalau admin belum milih, berhenti di sini
    // dan minta dipilih dulu (prosesPembagianRuangan juga bakal nge-throw,
    // tapi mendingan ketemu pesan yang jelas daripada error mentah).
    if (!versiSkemaValid(versiSkema)) {
      showToast?.("Pilih versi algoritma pembagian dulu", "error");
      return;
    }
    if (
      adaPerubahanBelumDisimpan &&
      !window.confirm(
        "Pembagian & quota yang sedang tampil belum disimpan. Kalau diproses ulang, semuanya diganti hasil otomatis yang baru. Lanjut proses?"
      )
    ) {
      return;
    }
    setMemproses(true);
    setHasilAsli(null);
    setQuotaPerRuangan(null);
    try {
      const hasil = await prosesPembagianRuangan(
        supabase,
        tahunAjaranId,
        jenisUjian,
        kapasitas,
        versiSkema
      );
      if (hasil.length === 0) {
        showToast?.("Tidak ada siswa aktif ditemukan untuk kombinasi ini", "error");
      }
      setHasilAsli(hasil);
      setTargetPerKelas(hitungTotalPerKelas(hasil));
      setDaftarKelas([...new Set(hasil.flatMap((r) => r.siswa.map((s) => s.asal_kelas)))].sort());
      // quota awal = breakdown hasil auto-generate, admin tinggal geser2 dari sini
      setQuotaPerRuangan(
        hasil.map((r) => {
          const quota = {};
          r.siswa.forEach((s) => {
            quota[s.asal_kelas] = (quota[s.asal_kelas] || 0) + 1;
          });
          return { nomor_ruangan: r.nomor_ruangan, quota };
        })
      );
      setRuanganPreviewAktif(hasil[0]?.nomor_ruangan ?? null);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memproses pembagian ruangan: " + err.message, "error");
    } finally {
      setMemproses(false);
    }
  };

  // Buka modal peringatan -- belum ngapa-ngapain ke DB, cuma nampilin modal.
  // Default pilihan versi baru = versi PERTAMA di VERSI_SKEMA_LIST yang
  // BUKAN versi yang lagi kepake, biar admin nggak keklik "ganti versi" tapi
  // ternyata milih versi yang sama persis kayak sebelumnya.
  const handleBukaProsesUlangModal = () => {
    setKonfirmasiProsesUlang(false);
    const versiSaatIni = normalisasiVersiSkema(versiSkema);
    const opsiLain = VERSI_SKEMA_LIST.find((o) => o.value !== versiSaatIni);
    setVersiBaruDipilih(opsiLain?.value || "");
    setProsesUlangModalOpen(true);
  };

  const handleBatalProsesUlangModal = () => {
    setProsesUlangModalOpen(false);
    setKonfirmasiProsesUlang(false);
  };

  // Eksekusi beneran: hapus peserta_ujian + SEMUA penugasan ujian_pengawas
  // lama, lalu update versi_skema di tempat ke versiBaruDipilih (lewat
  // resetUntukProsesUlang -- baris ujian itu sendiri & ujian_jadwal TIDAK
  // dihapus, lihat catatan di fungsi itu), terus reset state lokal hasil
  // pembagian yang lagi ditampilin (karena udah nggak valid lagi buat
  // versi baru) biar admin tinggal pencet "Proses Pembagian" buat generate
  // ulang pakai versi yang baru dipilih. Penugasan pengawas ikut dihapus
  // otomatis (bukan cuma diperingatkan) karena nomor_ruangan gak dijamin
  // berarti sama antar versi skema -- lihat catatan FIX di
  // resetUntukProsesUlang().
  const handleKonfirmasiProsesUlang = async () => {
    if (!konfirmasiProsesUlang || !tahunAjaranId) return;
    setMemProsesUlang(true);
    try {
      const { jumlahPengawasTerhapus } = await resetUntukProsesUlang(
        supabase,
        jenisUjian,
        tahunAjaranId,
        versiBaruDipilih
      );
      setVersiSkema(normalisasiVersiSkema(versiBaruDipilih) || "");
      setHasilAsli(null);
      setQuotaPerRuangan(null);
      setQuotaTersimpan(null);
      setTargetPerKelas({});
      setDaftarKelas([]);
      setRuanganPreviewAktif(null);
      setProsesUlangModalOpen(false);
      setKonfirmasiProsesUlang(false);
      const infoPengawas =
        jumlahPengawasTerhapus > 0
          ? ` ${jumlahPengawasTerhapus} penugasan pengawas lama ikut dihapus (nomor ruangan sudah gak sama) -- assign ulang lewat "Jadwal Ngawas".`
          : "";
      showToast?.(
        `Versi diganti ke ${labelVersiSkema(versiBaruDipilih)} -- data ruangan lama sudah dihapus, klik "Proses Pembagian" untuk generate ulang.${infoPengawas}`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast?.("Gagal proses ulang: " + err.message, "error");
    } finally {
      setMemProsesUlang(false);
    }
  };

  // Total quota per kelas SAAT INI (setelah admin ubah2), buat dibandingin
  // sama targetPerKelas -- ini yang nentuin tombol Simpan boleh diklik atau nggak.
  // Di-useMemo biar konsisten sama derived state lain di file ini (hasilLive,
  // petaNoPeserta) -- cuma dihitung ulang kalau quotaPerRuangan beneran berubah.
  const totalPerKelasSaatIni = useMemo(() => {
    const totals = {};
    (quotaPerRuangan || []).forEach((r) => {
      Object.entries(r.quota).forEach(([kelas, jumlah]) => {
        totals[kelas] = (totals[kelas] || 0) + (Number(jumlah) || 0);
      });
    });
    return totals;
  }, [quotaPerRuangan]);

  const quotaValid = useMemo(
    () =>
      quotaPerRuangan != null &&
      daftarKelas.every(
        (kelas) => (totalPerKelasSaatIni[kelas] || 0) === (targetPerKelas[kelas] || 0)
      ),
    [quotaPerRuangan, daftarKelas, totalPerKelasSaatIni, targetPerKelas]
  );

  const handleUbahQuota = (nomorRuangan, kelas, valueBaru) => {
    setQuotaPerRuangan((prev) =>
      prev.map((r) =>
        r.nomor_ruangan === nomorRuangan
          ? {
              ...r,
              quota: {
                ...r.quota,
                [kelas]: Math.max(0, Number(valueBaru) || 0),
              },
            }
          : r
      )
    );
  };

  const handleTambahRuangan = () => {
    setQuotaPerRuangan((prev) => {
      const nomorBaru = Math.max(0, ...prev.map((r) => r.nomor_ruangan)) + 1;
      const quotaKosong = Object.fromEntries(daftarKelas.map((k) => [k, 0]));
      return [...prev, { nomor_ruangan: nomorBaru, quota: quotaKosong }];
    });
  };

  const handleHapusRuangan = (nomorRuangan) => {
    setQuotaPerRuangan((prev) => prev.filter((r) => r.nomor_ruangan !== nomorRuangan));
    setRuanganPreviewAktif((prev) => (prev === nomorRuangan ? null : prev));
    setRuanganDenahAktif((prev) => (prev === nomorRuangan ? null : prev));
  };

  // hasilLive = siswa SPESIFIK yang beneran masuk tiap ruangan sesuai quota
  // yang lagi di-set admin SAAT INI (dihitung ulang tiap quota berubah,
  // dipakai buat tab "Preview Per Ruangan").
  const hasilLive = useMemo(() => {
    if (!hasilAsli || !quotaPerRuangan) return [];
    return terapkanQuotaManual(hasilAsli, quotaPerRuangan);
  }, [hasilAsli, quotaPerRuangan]);

  const handleSimpan = async () => {
    if (!hasilAsli || !quotaPerRuangan || !quotaValid) return;
    setMenyimpan(true);
    try {
      const hasilFinal = terapkanQuotaManual(hasilAsli, quotaPerRuangan).filter(
        (r) => r.siswa.length > 0
      );
      const ujian = await getOrCreateUjian(
        supabase,
        jenisUjian,
        tahunAjaranId,
        kapasitas,
        versiSkema
      );
      // Kalau pembagian ini sudah pernah disimpan, hitung dulu apa yang
      // ikut basi (kartu yang sudah dicetak, penugasan pengawas) dan
      // minta konfirmasi -- simpan ulang gak cuma nimpa satu tabel.
      const dampak = await hitungDampakSimpan(supabase, ujian.id, hasilFinal);
      if (dampak.adaDataTersimpan && dampak.adaPerubahan) {
        const baris = ["Pembagian ruangan ini sudah pernah disimpan. Kalau disimpan ulang:", ""];
        if (dampak.jumlahPindahRuangan > 0)
          baris.push(`• ${dampak.jumlahPindahRuangan} siswa pindah ruangan`);
        if (dampak.jumlahSiswaBaru > 0)
          baris.push(`• ${dampak.jumlahSiswaBaru} siswa baru masuk daftar peserta`);
        if (dampak.jumlahSiswaHilang > 0)
          baris.push(`• ${dampak.jumlahSiswaHilang} siswa keluar dari daftar peserta`);
        if (dampak.ruanganHilang.length > 0)
          baris.push(`• Ruangan ${dampak.ruanganHilang.join(", ")} tidak ada lagi`);
        if (dampak.jumlahNomorBerubah > 0)
          baris.push(
            `• ${dampak.jumlahNomorBerubah} siswa nomor pesertanya berubah -> Kartu Peserta & daftar peserta yang sudah dicetak harus dicetak ulang`
          );
        if (dampak.jumlahPengawasTerdampak > 0)
          baris.push(
            `• ${dampak.jumlahPengawasTerdampak} dari ${dampak.jumlahPengawas} penugasan pengawas ada di ruangan yang isinya berubah (ruangan ${[
              ...new Set([...dampak.ruanganBerubah, ...dampak.ruanganHilang]),
            ].join(", ")}) -> cek lagi Jadwal Pengawas`
          );
        baris.push("", "Lanjut simpan?");
        if (!window.confirm(baris.join("\n"))) return; // finally di bawah yang reset menyimpan
      }

      const jumlah = await simpanPembagianRuangan(
        supabase,
        ujian.id,
        hasilFinal,
        labelTahunAjaranAktif
      );
      setQuotaTersimpan(buatSignaturQuota(quotaPerRuangan));
      showToast?.(`Berhasil disimpan: ${jumlah} siswa ke ${hasilFinal.length} ruangan`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan ke database: " + err.message, "error");
    } finally {
      setMenyimpan(false);
    }
  };

  // Label tahun ajaran yang lagi dipilih (mis. "2026/2027"), dipakai di
  // letterhead file Excel. Diambil dari record academic_years yang lagi
  // aktif di dropdown -- bukan diketik manual, biar ikut kebawa otomatis
  // kalau tahun ajarannya ganti.
  const labelTahunAjaranAktif = useMemo(() => {
    const ta = daftarTahunAjaran.find((t) => t.id === tahunAjaranId);
    return ta ? labelTahunAjaran(ta) : "";
  }, [daftarTahunAjaran, tahunAjaranId]);

  // Peta No. Peserta buat tab "Preview Per Ruangan" -- dihitung dari
  // hasilLive UTUH (semua ruangan, bukan cuma yang lagi dipilih di
  // dropdown) biar nomornya urut lintas ruangan, PERSIS sama kayak yang
  // dipakai di daftarPesertaExcelExport.js.
  const petaNoPeserta = useMemo(
    () => bangunPetaNoPeserta(hasilLive, labelTahunAjaranAktif),
    [hasilLive, labelTahunAjaranAktif]
  );

  const handleExportExcel = async () => {
    setMengexport(true);
    try {
      // hasilLive dikirim UTUH (bukan difilter di sini) walaupun yang dicetak
      // cuma 1 ruangan -- nomor peserta urut lintas ruangan, jadi fungsi
      // export butuh lihat semuanya dulu baru motong.
      //
      // Sengaja pakai hasilLive (bukan narik ulang dari DB) supaya yang
      // keexport PERSIS yang lagi keliatan di layar, termasuk kalau admin
      // baru ngubah quota dan belum sempat klik "Simpan ke Database".
      await exportDaftarPesertaUjian({
        semuaRuangan: hasilLive,
        nomorRuangan: ruanganExport === "semua" ? null : Number(ruanganExport),
        jenisUjian,
        tahunAjaran: labelTahunAjaranAktif,
        showToast,
      });
    } catch (err) {
      console.error(err);
      showToast?.("Gagal export Excel: " + err.message, "error");
    } finally {
      setMengexport(false);
    }
  };

  // Sama persis alurnya dengan handleExportExcel di atas -- cuma manggil
  // fungsi PDF-nya, dan hasilLive yang dikirim juga UTUH (bukan difilter
  // duluan) karena nomor peserta harus urut lintas ruangan.
  const handleExportPdf = async () => {
    setMengexportPdf(true);
    try {
      await exportDaftarPesertaUjianPdf({
        semuaRuangan: hasilLive,
        nomorRuangan: ruanganExport === "semua" ? null : Number(ruanganExport),
        jenisUjian,
        tahunAjaran: labelTahunAjaranAktif,
        showToast,
      });
    } catch (err) {
      console.error(err);
      showToast?.("Gagal export PDF: " + err.message, "error");
    } finally {
      setMengexportPdf(false);
    }
  };

  const totalSiswaQuota = Object.values(totalPerKelasSaatIni).reduce((sum, v) => sum + v, 0);

  // Sub-tab mana aja yang boleh tampil, tergantung `mode`:
  // - "ruangan" butuh ketiga-tiganya: tabel quota ("edit") + "preview" +
  //   "export" -- ketiganya sengaja 1 komponen yang sama: apa yang diedit
  //   di tab quota langsung kelihatan di preview MAUPUN keexport, TERMASUK
  //   perubahan yang belum disimpan (WYSIWYG -- lihat komentar di
  //   handleExportExcel/handleExportPdf).
  // - "peserta" cuma butuh "export" (baca data yang sudah tersimpan di DB)
  //   -- dipertahankan buat kompatibilitas kalau nanti ada yang butuh versi
  //   read-only-nya lagi, tapi per sekarang gak ada kartu yang pakai mode
  //   ini (Export udah pindah ke kartu "Jadwal, Peserta & Pembagian Ruangan").
  // - "full" tetap ketiga-tiganya, kayak sebelum kartu dipisah.
  const tabTampil = TAB_LIST.filter((tab) => {
    if (mode === "ruangan") return true;
    if (modePeserta) return tab.id === "export";
    return true;
  });

  return (
    <div className={onBack ? "p-4 sm:p-6" : ""}>
      {/* Tombol balik & header jenis ujian cuma dipasang kalau komponen ini
      dibuka sebagai layar sendiri (onBack ada). Waktu di-embed di dalam kartu,
      kartu-nya yang udah punya tombol balik & header -- biar nggak dobel. */}
      {onBack && (
        <>
          <button
            onClick={() => {
              if (
                adaPerubahanBelumDisimpan &&
                !window.confirm(
                  "Ada pembagian ruangan atau quota yang belum disimpan. Kalau kembali sekarang, perubahan itu hilang. Tetap kembali?"
                )
              ) {
                return;
              }
              onBack();
            }}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
          >
            <ChevronLeft size={16} /> Kembali ke Sub-fitur
          </button>

          <div className="mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Jenis Ujian</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
            </p>
          </div>
        </>
      )}

      {/* Form pilihan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Tahun Ajaran
          </label>
          <select
            value={tahunAjaranId}
            onChange={(e) => handleGantiTahunAjaran(e.target.value)}
            disabled={loadingTahunAjaran}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          >
            {loadingTahunAjaran && <option>Memuat...</option>}
            {!loadingTahunAjaran && opsiTahunAjaran.length === 0 && (
              <option value="">Belum ada tahun ajaran</option>
            )}
            {opsiTahunAjaran.map((ta) => (
              <option key={ta.id} value={ta.id}>
                {labelTahunAjaran(ta)} - Semester{" "}
                {ta.semester === 1 || ta.semester === "1" ? "Ganjil" : "Genap"}
                {ta.is_active ? " (Aktif)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Kapasitas cuma relevan waktu MENYUSUN ruangan. Di mode "peserta"
        (read-only dari DB) field ini disembunyiin biar nggak bikin ngira
        bisa diubah dari sini. Sama alasannya field ini disembunyiin pas
        tabAktif === "preview" ATAU "denah" ATAU "export" -- ketiganya cuma
        lihat/nyetak data yang UDAH diproses, kapasitas gak ngaruh apa-apa
        lagi di situ. */}
        {!modePeserta &&
          tabAktif !== "preview" &&
          tabAktif !== "denah" &&
          tabAktif !== "export" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Kapasitas per Ruangan
              </label>
              <input
                type="number"
                min={1}
                // value dikosongin (bukan "0") pas kapasitas lagi 0/kosong -- kalau
                // dipaksa selalu jadi angka, field-nya nempelin "0" di depan tiap
                // admin ngetik ulang abis clear (bug klasik controlled number input).
                value={kapasitas === 0 ? "" : kapasitas}
                onChange={(e) => {
                  const nilai = e.target.value;
                  setKapasitas(nilai === "" ? 0 : Number(nilai));
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
          )}
      </div>

      {/* Tab level PALING ATAS: bandingin V1 vs V2 dulu di "Komposisi
          Ruangan" (preview doang, belum proses/simpan apa-apa), atau
          langsung ke alur "Pembagian Ruangan" (proses -> quota manual ->
          simpan). Beda sama TAB_LIST di bawah, yang itu sub-tab DI DALAM
          "Pembagian Ruangan". */}
      {!viewPaksa && (
        <div className="flex flex-wrap gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
          {VIEW_TAB_LIST.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewAktif(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  viewAktif === tab.id
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {viewAktif === "komposisi" && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Bandingkan hasil {VERSI_SKEMA_LIST.length} versi algoritma sebelum diproses beneran --
            V1 (Silang Jenjang) vs V2 (Rotasi Penuh) vs V3 (Rantai Muter). Murni hitungan preview di
            memori, belum nyimpen apa-apa ke database.
          </p>

          {!tahunAjaranId && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
              Pilih tahun ajaran dulu di atas.
            </p>
          )}

          {tahunAjaranId && (!komposisiData || komposisiUntukTahunAjaran !== tahunAjaranId) && (
            <button
              onClick={handleLihatKomposisi}
              disabled={memuatKomposisi}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
            >
              <RefreshCw size={16} className={memuatKomposisi ? "animate-spin" : ""} />
              {memuatKomposisi ? "Menghitung..." : "Lihat Komposisi Ruangan"}
            </button>
          )}

          {komposisiData && komposisiUntukTahunAjaran === tahunAjaranId && (
            <>
              {/* Sub-tab: lagi liatin matrix versi mana */}
              <div className="flex flex-wrap gap-1 mb-4 mt-1 border-b border-gray-200 dark:border-gray-700">
                {VERSI_SKEMA_LIST.map((opsi) => (
                  <button
                    key={opsi.value}
                    onClick={() => setKomposisiVersiAktif(opsi.value)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      komposisiVersiAktif === opsi.value
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {opsi.label}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {VERSI_SKEMA_LIST.find((o) => o.value === komposisiVersiAktif)?.deskripsi}
              </p>

              {komposisiData[komposisiVersiAktif].map((matrixJenjang) => (
                <TabelMatrixJenjang
                  key={matrixJenjang.jenjang}
                  data={matrixJenjang}
                  versiAktif={komposisiVersiAktif}
                />
              ))}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handlePilihVersi(komposisiVersiAktif)}
                  disabled={versiSkemaTerkunci}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                >
                  Pakai {VERSI_SKEMA_LIST.find((o) => o.value === komposisiVersiAktif)?.label} untuk
                  Pembagian Ruangan
                </button>

                <button
                  onClick={handleLihatKomposisi}
                  disabled={memuatKomposisi}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {memuatKomposisi
                    ? "Menghitung ulang..."
                    : "Hitung ulang (kalau data siswa berubah)"}
                </button>
              </div>

              {versiSkemaTerkunci && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Versi udah terkunci ke {labelVersiSkema(versiSkema)} -- ujian ini sudah pernah
                  diproses/disimpan, jadi pilihan di sini nggak berpengaruh lagi.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {viewAktif === "pembagian" && (
        <>
          {/* Semua kontrol PENYUSUNAN (versi algoritma + tombol proses) cuma
          muncul di mode "ruangan"/"full", dan CUMA di tab "edit" (halaman
          "Pembagian Ruangan" yang sebenernya nyusun/nyimpen). Di mode
          "peserta" data cuma dibaca dari DB, nggak diproses ulang -- dan
          di tab "preview" ("Preview Per Ruangan"), "denah" (Denah Duduk),
          ATAU "export" (Export Daftar Peserta) halamannya cuma
          nampilin/nyetak hasil yang UDAH diproses, jadi kontrol milih
          versi/kapasitas/tombol proses di sini gak relevan lagi & cuma
          bikin bingung. */}
          {!modePeserta &&
            tabAktif !== "preview" &&
            tabAktif !== "denah" &&
            tabAktif !== "export" && (
              <>
                {/* Versi algoritma -- terkunci begitu ujian ini punya record tersimpan
              (lihat versiSkemaTerkunci), karena versi_skema cuma boleh dipilih
              sekali pas record ujian pertama kali dibikin. */}
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Versi Algoritma Pembagian <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Wajib dipilih -- nggak ada versi bawaan. Sesuaikan sama kebutuhan ujian ini;
                    bandingkan dulu hasilnya di tab <strong>Komposisi Ruangan</strong> kalau ragu.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {VERSI_SKEMA_LIST.map((opsi) => (
                      <label
                        key={opsi.value}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                          versiSkema === opsi.value
                            ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        } ${
                          versiSkemaTerkunci
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="versiSkema"
                          value={opsi.value}
                          checked={versiSkema === opsi.value}
                          disabled={versiSkemaTerkunci}
                          onChange={(e) => setVersiSkema(e.target.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {opsi.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {opsi.deskripsi}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {!versiSkemaTerkunci && !versiSkemaValid(versiSkema) && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Belum ada versi yang dipilih -- pilih salah satu di atas buat mengaktifkan
                      tombol "Proses Pembagian".
                    </p>
                  )}
                  {versiSkemaTerkunci && (
                    <div className="mt-2">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Versi terkunci — ujian ini sudah pernah diproses/disimpan dengan versi{" "}
                        <span className="font-semibold">{labelVersiSkema(versiSkema)}</span>.{" "}
                        {tabAktif === "preview" || tabAktif === "denah"
                          ? 'Ganti versi cuma bisa dilakukan lewat tombol "Proses Ulang dengan Versi Lain" di tab Pembagian Ruangan (sengaja gak ditampilin di sini biar gak salah klik pas cuma mau lihat-lihat), karena itu bakal menghapus data ruangan yang udah tersimpan.'
                          : 'Ganti versi cuma bisa dilakukan lewat tombol "Proses Ulang dengan Versi Lain" di bawah, karena itu bakal menghapus data ruangan yang udah tersimpan.'}
                      </p>
                    </div>
                  )}
                </div>

                {memuatTersimpan && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Memuat data tersimpan...
                  </p>
                )}

                {/* 2 tombol aksi utama disejajarkan biar sama-sama kelihatan --
              dulu "Proses Ulang dengan Versi Lain" cuma link teks kecil
              nyempil di dalam kotak peringatan amber di atas, gampang
              kelewat. Sekarang ukurannya disamain sama "Proses Pembagian",
              warnanya merah biar kontras jelas dari indigo (aksi ini
              destruktif -- hapus data lama -- jadi sengaja beda warna,
              bukan cuma beda ukuran).

              Tombol MERAH sengaja DISEMBUNYIIN pas tabAktif === "preview"
              ATAU "denah" (halaman "Preview Per Ruangan" / "Denah Duduk"
              yang diakses lewat tabPaksa dari JadwalRuanganTab.js) -- di
              situ gak ada tab switcher buat pindah balik ke tab "Pembagian
              Ruangan" (disembunyiin selama tabPaksa kepasang), jadi kalau
              tombol reset-destruktif ini nongol di sana, admin yang cuma
              mau LIAT daftar/denah peserta per ruangan bisa gak sengaja
              mencet tombol yang bakal ngehapus data tersimpan. */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleProses}
                    disabled={memproses || memuatTersimpan || !versiSkemaValid(versiSkema)}
                    title={
                      versiSkemaValid(versiSkema)
                        ? undefined
                        : "Pilih versi algoritma pembagian dulu"
                    }
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                  >
                    <RefreshCw size={16} className={memproses ? "animate-spin" : ""} />
                    {memproses ? "Memproses..." : "Proses Pembagian (Preview)"}
                  </button>

                  {versiSkemaTerkunci && tabAktif !== "preview" && tabAktif !== "denah" && (
                    <button
                      onClick={handleBukaProsesUlangModal}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                    >
                      <Unlock size={16} />
                      Proses Ulang dengan Versi Lain
                    </button>
                  )}
                </div>
              </>
            )}

          {/* Mode "peserta": nggak ada tombol proses, jadi kasih tau statusnya
          langsung -- lagi narik data, atau emang belum pernah disimpan. */}
          {modePeserta && memuatTersimpan && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" /> Memuat data peserta...
            </p>
          )}
          {modePeserta && !memuatTersimpan && !quotaPerRuangan && tahunAjaranId && (
            <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
              Belum ada pembagian ruangan yang tersimpan untuk tahun ajaran ini. Susun & simpan dulu
              di sub-fitur <strong>Jadwal &amp; Pembagian Ruangan</strong> &rarr; tab{" "}
              <strong>Pembagian Ruangan</strong>, baru daftar peserta bisa dipreview & diexport dari
              sini.
            </div>
          )}

          {/* Tabel quota manual -- hasil auto-generate ditampilkan di sini,
          admin boleh ubah angkanya per kelas per ruangan sebelum disimpan. */}
          {quotaPerRuangan && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <DoorOpen size={16} /> {quotaPerRuangan.length} ruangan
                </span>
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <Users size={16} /> {totalSiswaQuota} siswa
                </span>
                {adaPerubahanBelumDisimpan && !modePeserta && (
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={13} />
                    Belum disimpan ke database
                  </span>
                )}
              </div>

              {/* Tab switcher: Pembagian Ruangan <-> Preview Per Ruangan <-> Export.
              flex-wrap supaya 3 tab ini nggak kepotong/nyempil di layar HP sempit. */}
              {!tabPaksa && tabTampil.length > 1 && (
                <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
                  {tabTampil.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setTabAktif(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                          tabAktif === tab.id
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                      >
                        <Icon size={15} /> {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {tabAktif === "edit" && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Angka di bawah hasil auto-generate (proporsional) -- boleh diubah manual per
                    kelas per ruangan sesuai kebutuhan. Total tiap kolom kelas harus PAS sama jumlah
                    siswa kelas itu sebelum bisa disimpan.
                  </p>

                  <div className="overflow-x-auto mb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
                    <table className="w-full text-xs sm:text-sm border-collapse rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="text-left py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600">
                            Ruangan
                          </th>
                          {daftarKelas.map((kelas) => (
                            <th
                              key={kelas}
                              className="text-center py-2.5 px-1 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600"
                            >
                              {kelas}
                            </th>
                          ))}
                          <th className="text-center py-2.5 px-2 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600">
                            Total
                          </th>
                          <th className="border-b border-gray-300 dark:border-gray-600"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotaPerRuangan.map((r, idx) => {
                          const totalRuanganIni = Object.values(r.quota).reduce(
                            (sum, v) => sum + (Number(v) || 0),
                            0
                          );
                          return (
                            <tr
                              key={r.nomor_ruangan}
                              className={`border-b border-gray-200 dark:border-gray-700 ${
                                idx % 2 === 1
                                  ? "bg-gray-50 dark:bg-gray-800/40"
                                  : "bg-white dark:bg-gray-800"
                              }`}
                            >
                              <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                Ruang {r.nomor_ruangan}
                              </td>
                              {daftarKelas.map((kelas) => (
                                <td key={kelas} className="py-1.5 px-0.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={!r.quota[kelas] ? "" : r.quota[kelas]}
                                    onChange={(e) =>
                                      handleUbahQuota(r.nomor_ruangan, kelas, e.target.value)
                                    }
                                    className="w-10 sm:w-11 text-center px-1 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 font-semibold text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>
                              ))}
                              <td
                                className={`text-center px-2 font-bold ${
                                  totalRuanganIni > kapasitas
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {totalRuanganIni}
                              </td>
                              <td className="text-center px-1">
                                <button
                                  onClick={() => handleHapusRuangan(r.nomor_ruangan)}
                                  title="Hapus ruangan ini"
                                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {/* Baris target & selisih, buat bantu admin liat kolom mana yang belum pas */}
                        <tr className="border-t-2 border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800/60">
                          <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">
                            Target
                          </td>
                          {daftarKelas.map((kelas) => {
                            const sudah = totalPerKelasSaatIni[kelas] || 0;
                            const target = targetPerKelas[kelas] || 0;
                            const pas = sudah === target;
                            return (
                              <td key={kelas} className="text-center px-0.5 py-2">
                                <span
                                  className={`inline-block min-w-[2rem] px-1 py-0.5 text-[11px] rounded-md font-bold ${
                                    pas
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                  }`}
                                >
                                  {sudah}/{target}
                                </span>
                              </td>
                            );
                          })}
                          <td></td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleTambahRuangan}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-5"
                  >
                    <Plus size={15} /> Tambah Ruangan
                  </button>
                </>
              )}

              {tabAktif === "preview" && (
                <div className="mb-5">
                  {quotaPerRuangan.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      Belum ada ruangan.
                    </p>
                  ) : (
                    <>
                      {/* Dulu dropdown "Pilih Ruangan" (1 ruangan tampil per
                      waktu, ganti-ganti pake <select>) -- diubah jadi semua
                      ruangan ditumpuk sekaligus dalam 1 halaman biar gak perlu
                      toggle buat lihat semua data. Chip navigasi di bawah ini
                      cuma shortcut scroll (anchor link polos, tanpa state),
                      berguna kalau ruangannya banyak. State `ruanganPreviewAktif`
                      udah gak dipakai buat render di sini lagi (lihat komentar
                      di deklarasinya), tapi sengaja gak dihapus dari state
                      lain-lain di file ini biar minim resiko ubah bagian yang
                      gak ada hubungannya sama perubahan ini. */}
                      {quotaPerRuangan.length > 1 && (
                        // Dulu <a href="#ruang-preview-...">, TERNYATA ke-intercept
                        // sama router aplikasi (klik malah balik ke Dashboard,
                        // bukan scroll ke section-nya) -- diganti <button> +
                        // scrollIntoView manual biar gak nyentuh URL/routing sama
                        // sekali. Layout dipaksa jadi PERSIS 2 baris SEIMBANG
                        // (bukan flex-wrap yang jumlah per barisnya ngikut lebar
                        // layar) -- jumlah kolom = ceil(total ruangan / 2), jadi
                        // 18 ruangan -> 9+9, 12 ruangan -> 6+6, dst otomatis.
                        <div
                          className="grid gap-1.5 mb-4"
                          style={{
                            gridTemplateColumns: `repeat(${Math.ceil(
                              quotaPerRuangan.length / 2
                            )}, minmax(0, 1fr))`,
                          }}
                        >
                          {quotaPerRuangan.map((r) => (
                            <button
                              key={r.nomor_ruangan}
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById(`ruang-preview-${r.nomor_ruangan}`)
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  })
                              }
                              className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 truncate"
                            >
                              Ruang {String(r.nomor_ruangan).padStart(2, "0")}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="space-y-6">
                        {quotaPerRuangan.map((ruang) => {
                          const siswaRuanganIni =
                            hasilLive.find((h) => h.nomor_ruangan === ruang.nomor_ruangan)?.siswa ||
                            [];

                          // Urut pakai no_kursi (= no_peserta yang disimpan ke
                          // DB) -- sama persis dengan urutan di
                          // daftarPesertaExcelExport.js, biar preview ini
                          // benar-benar cerminan hasil Excel-nya.
                          const siswaTerurut = [...siswaRuanganIni].sort(
                            (a, b) => (a.no_kursi || 0) - (b.no_kursi || 0)
                          );

                          return (
                            <div
                              key={ruang.nomor_ruangan}
                              id={`ruang-preview-${ruang.nomor_ruangan}`}
                              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 scroll-mt-4"
                            >
                              {/* Kop dokumen -- meniru letterhead di file Excel */}
                              <div className="text-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                  DAFTAR PESERTA{" "}
                                  {(JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian).toUpperCase()}
                                </p>
                                {labelTahunAjaranAktif && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    TAHUN AJARAN {labelTahunAjaranAktif}
                                  </p>
                                )}
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                                  RUANG {String(ruang.nomor_ruangan).padStart(2, "0")}
                                </p>
                              </div>

                              {siswaTerurut.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">
                                  Belum ada siswa di ruangan ini.
                                </p>
                              ) : (
                                <>
                                  <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-600">
                                    <table className="w-full text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-700">
                                          <th className="py-2 pl-3 pr-3 w-10 text-left font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                                            No
                                          </th>
                                          <th className="py-2 pr-3 text-center font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                                            No. Peserta
                                          </th>
                                          <th className="py-2 pr-3 text-left font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                                            Nama Peserta
                                          </th>
                                          <th className="py-2 pr-3 text-center font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                                            Kelas
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {siswaTerurut.map((s, idx) => (
                                          <tr
                                            key={s.id}
                                            className={`border-b border-gray-200 dark:border-gray-700 ${
                                              idx % 2 === 1
                                                ? "bg-gray-50 dark:bg-gray-800/40"
                                                : "bg-white dark:bg-gray-800"
                                            }`}
                                          >
                                            <td className="py-1.5 pl-3 pr-3 font-medium text-gray-900 dark:text-white">
                                              {idx + 1}
                                            </td>
                                            <td className="py-1.5 pr-3 text-center font-medium text-gray-900 dark:text-white">
                                              {petaNoPeserta.get(String(s.id)) || "-"}
                                            </td>
                                            <td className="py-1.5 pr-3 font-semibold text-gray-900 dark:text-white truncate">
                                              {s.nama || "-"}
                                            </td>
                                            <td className="py-1.5 pr-3 text-center font-medium text-gray-900 dark:text-white">
                                              {s.asal_kelas || "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <p className="text-right text-sm text-gray-500 dark:text-gray-400 mt-3">
                                    {siswaRuanganIni.length} siswa
                                  </p>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab "Denah Duduk" -- logic & render-nya sekarang di file
              terpisah DenahDuduk.js (grid MEJA isi 2 siswa/meja, larangan
              1 meja sekelas, urutan pengisian ke belakang dulu baru geser
              kolom). Sumber data yang dikirim tetap PERSIS sama kayak tab
              "Preview" (hasilLive + petaNoPeserta). */}
              {tabAktif === "denah" && (
                <div className="mb-5">
                  <DenahDuduk
                    quotaPerRuangan={quotaPerRuangan}
                    ruanganAktif={ruanganDenahAktif}
                    onRuanganChange={setRuanganDenahAktif}
                    hasilLive={hasilLive}
                    petaNoPeserta={petaNoPeserta}
                    jumlahKolom={jumlahKolomDenah}
                    onJumlahKolomChange={setJumlahKolomDenah}
                    jenisUjianLabel={(JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian).toUpperCase()}
                    labelTahunAjaranAktif={labelTahunAjaranAktif}
                  />
                </div>
              )}

              {tabAktif === "export" && (
                <div className="mb-5">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Export daftar peserta ke Excel — buat ditempel di pintu ruangan & pegangan
                    pengawas.{" "}
                    {modePeserta
                      ? "Isinya mengikuti pembagian ruangan yang TERSIMPAN di database. Kalau baru ngubah quota di sub-fitur Jadwal, Peserta & Pembagian Ruangan, simpan dulu di sana, lalu buka ulang tab ini."
                      : "Isinya mengikuti pembagian yang sedang tampil di layar, termasuk perubahan quota yang belum disimpan."}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
                    <div className="flex-1 sm:max-w-xs">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ruangan
                      </label>
                      <select
                        value={ruanganExport}
                        onChange={(e) => setRuanganExport(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      >
                        <option value="semua">Semua Ruangan (1 file, 1 sheet per ruangan)</option>
                        {quotaPerRuangan.map((r) => (
                          <option key={r.nomor_ruangan} value={r.nomor_ruangan}>
                            Ruang {String(r.nomor_ruangan).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleExportExcel}
                      disabled={mengexport || hasilLive.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                    >
                      {mengexport ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <FileSpreadsheet size={16} />
                      )}
                      {mengexport ? "Menyiapkan file..." : "Download Excel"}
                    </button>

                    <button
                      onClick={handleExportPdf}
                      disabled={mengexportPdf || hasilLive.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                    >
                      {mengexportPdf ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <FileText size={16} />
                      )}
                      {mengexportPdf ? "Menyiapkan file..." : "Download PDF"}
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      Isi file
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Kop SMP Muslimin Cililin, judul{" "}
                      <span className="font-medium">
                        Daftar Peserta{" "}
                        {JENIS_UJIAN_LABEL[jenisUjian]?.split(" - ")[1] || jenisUjian}
                      </span>
                      , Tahun Ajaran {labelTahunAjaranAktif || "-"}, nomor ruangan, lalu tabel: No,
                      No. Peserta, Nama Peserta, Kelas -- sama persis kayak tab Preview Per Ruangan.
                    </p>
                  </div>
                </div>
              )}

              {/* Warning "belum pas" & tombol Simpan SENGAJA cuma muncul di
              tab "edit" (Pembagian Ruangan) -- itu satu-satunya tempat baris
              "Target" ada & satu-satunya tempat quota beneran diubah. Di tab
              "preview"/"export" datanya cuma dibaca (read-only/cetak), jadi
              kalau 2 elemen ini ikut nongol di situ cuma bikin bingung: warning
              nunjuk ke baris Target yang gak ada di layar, dan tombol Simpan
              serasa ada yang perlu disimpan padahal enggak. Sama alasannya
              kayak tombol merah "Proses Ulang dengan Versi Lain" di atas yang
              udah lebih dulu disembunyiin pas preview/export. */}
              {!modePeserta && tabAktif === "edit" && !quotaValid && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                  Total per kelas belum pas dengan jumlah siswa aktif -- cek baris "Target" di atas
                  (kolom yang merah berarti belum sesuai).
                </p>
              )}

              {!modePeserta && tabAktif === "edit" && (
                <button
                  onClick={handleSimpan}
                  disabled={menyimpan || !quotaValid}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                >
                  <Save size={16} />
                  {menyimpan ? "Menyimpan..." : "Simpan ke Database"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal konfirmasi "Proses Ulang dengan Versi Lain" -- aksi eksplisit
      yang bikin resetUntukProsesUlang() beneran jalan (hapus data ruangan
      lama). Checkbox wajib dicentang dulu baru tombol konfirmasi aktif. */}
      {prosesUlangModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle
                className="text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5"
                size={22}
              />
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100">
                  Proses Ulang dengan Versi Lain?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Ini bakal <span className="font-semibold">menghapus permanen</span> data ruangan &
                  no. peserta yang sudah tersimpan untuk{" "}
                  <span className="font-semibold">
                    {JENIS_UJIAN_LABEL[jenisUjian]?.split(" - ")[0] || jenisUjian} —{" "}
                    {labelTahunAjaranAktif || "-"}
                  </span>
                  . Nomor ruangan lama bisa berubah/hilang begitu diproses ulang pakai versi lain.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Semua <span className="font-semibold">penugasan pengawas</span> (Jadwal Ngawas)
                  untuk ujian ini juga <span className="font-semibold">ikut terhapus otomatis</span>{" "}
                  -- karena nomor ruangan lama belum tentu berarti sama setelah ganti versi. Jadwal
                  sesi (tanggal/jam/ mata pelajaran) tetap aman, tapi pengawas per ruangan perlu
                  di-assign ulang lewat "Jadwal Ngawas" setelah proses ulang ini. Kartu Ujian yang
                  sudah dicetak sebelumnya juga jadi tidak berlaku lagi.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pilih versi baru:
              </p>
              <div className="space-y-2">
                {VERSI_SKEMA_LIST.map((opsi) => (
                  <label
                    key={opsi.value}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-sm ${
                      versiBaruDipilih === opsi.value
                        ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="versiBaruProsesUlang"
                      checked={versiBaruDipilih === opsi.value}
                      onChange={() => setVersiBaruDipilih(opsi.value)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {opsi.label}
                      </span>
                      {normalisasiVersiSkema(versiSkema) === opsi.value && (
                        <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
                          (versi sekarang)
                        </span>
                      )}
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {opsi.deskripsi}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={konfirmasiProsesUlang}
                onChange={(e) => setKonfirmasiProsesUlang(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Saya paham data ruangan & SEMUA penugasan pengawas lama akan terhapus, dan siap
                assign ulang Jadwal Pengawas serta cetak ulang Kartu Ujian setelahnya.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleKonfirmasiProsesUlang}
                disabled={
                  !konfirmasiProsesUlang || memProsesUlang || !versiSkemaValid(versiBaruDipilih)
                }
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-bold transition min-h-[44px]"
              >
                {memProsesUlang ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Unlock size={16} />
                )}
                {memProsesUlang ? "Memproses..." : "Ganti Versi & Hapus Data Lama"}
              </button>
              <button
                onClick={handleBatalProsesUlangModal}
                disabled={memProsesUlang}
                className="px-5 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition min-h-[44px] disabled:opacity-60"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PembagianRuanganTab;
