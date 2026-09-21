// setting/kelola-ujian/jadwal-pengawas/JadwalPengawasTab.js
// Komponen isi untuk kartu "Daftar & Jadwal Pengawas". Punya 4 tab internal:
// 1. "Daftar Pengawas" (key "daftar") -- kode singkat per guru (embed dari
//    DaftarPengawasTab.js).
// 2. "Kelola Jadwal Pengawas" (key "pengawas") -- assign guru pengawas per
//    ruangan untuk tiap hari (dulu berlabel "Jadwal Ngawas").
// 3. "Rekap"           -- preview semua hari & sesi sekaligus.
// 4. "Jadwal Pengawas" (key "lihat") -- tampilan lihat/cetak + export Excel &
//    PDF landscape, plus tabel Daftar Kode Pengawas (JadwalPengawasLihatView.js).
//
// CATATAN (restrukturisasi Sep 2026) -- tab "Jadwal Sesi" (kelola tanggal/
// jam/mapel) yang DULU ada di sini SUDAH PINDAH jadi kartu top-level sendiri
// "Jadwal Ujian" (lihat JadwalUjianTab.js). Kartu itu SEKARANG yang bikin
// record `ujian` (draft, lewat getOrCreateUjianDraft) begitu Tahun Ajaran
// dipilih -- duluan sebelum Pembagian Ruangan diproses -- karena di real
// dunia jadwal ujian biasanya udah given dari sekolah/dinas, gak perlu
// nunggu urusan ruangan kelar. Komponen INI cuma KONSUMEN data jadwal (baca
// `daftarJadwal` buat nyusun tampilan pengawas/rekap/cetak), BUKAN yang
// nentuin/nulis jadwal sesi lagi.
//
// PENTING: komponen ini NGGAK lagi dipakai utuh di satu layar -- yang
// manggil cuma PesertaPengawasTab.js (kartu "Daftar & Jadwal Pengawas")
// lewat tabPaksa="daftar"|"pengawas"|"rekap"|"lihat". Prop `tabPaksa` bikin
// tab bar internal disembunyiin & tab aktif ditentuin parent. Kalau `onBack`
// nggak dikirim, tombol balik & header jenis ujian juga disembunyiin, karena
// kartu pemanggilnya udah punya sendiri. Tanpa dua prop itu (dipanggil
// langsung), komponen ini tetap jalan (minus tab Jadwal Sesi yang udah pindah).
//
// Ruangan yang tersedia diambil dari hasil Pembagian Ruangan (tabel
// peserta_ujian) -- kalau belum diproses, tampilkan peringatan untuk
// proses ruangan dulu. Beda sama kartu "Jadwal Ujian" & "Panitia Ujian" yang
// sengaja independen, kartu INI (assign pengawas ke ruangan) TETAP butuh
// ruangan sudah dibagi -- makanya gate `!ujian || !ujian.versi_skema` di
// bawah SENGAJA nolak record `ujian` yang masih draft juga, bukan cuma yang
// belum ada sama sekali.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  X,
  Users,
  Loader2,
  Shuffle,
  ClipboardList,
  Table2,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  cariUjian,
  KONFIGURASI_JENIS_UJIAN,
} from "../pembagian-ruangan/pembagianRuanganSupabase";
import {
  ambilRuanganUjian,
  ambilDaftarGuru,
  ambilJadwalSesi,
  mataPelajaranUntukJenjang,
  mataPelajaranUntukRuangan,
  ambilPengawasUntukJadwal,
  tambahPengawas,
  hapusPengawas,
  kelompokkanJadwalPerHari,
  terapkanRotasiPengawasHarian,
  cariPenugasanPengawasTidakValid,
  bersihkanPenugasanPengawasTidakValid,
} from "./jadwalPengawasSupabase";
import DaftarPengawasTab from "./DaftarPengawasTab";
import JadwalPengawasLihatView from "./JadwalPengawasLihatView";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

/**
 * Format tanggal (string "YYYY-MM-DD" dari Supabase) jadi "Nama Hari,
 * DD-MM-YYYY" -- mengikuti format kolom "Hari/Tanggal" di edaran jadwal
 * ujian resmi sekolah. Pakai parsing manual (bukan `new Date(tanggal)`
 * langsung) supaya tidak kena pergeseran timezone di browser.
 */
function formatHariTanggal(tanggal) {
  if (!tanggal) return "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const tgl = new Date(tahun, bulan - 1, hari);
  const namaHari = tgl.toLocaleDateString("id-ID", { weekday: "long" });
  const tanggalFormat = `${String(hari).padStart(2, "0")}-${String(bulan).padStart(2, "0")}-${tahun}`;
  return `${namaHari}, ${tanggalFormat}`;
}

/**
 * Fisher-Yates shuffle -- dipakai supaya urutan guru ke ruangan acak.
 * Ditaruh di luar komponen karena pure function (tidak butuh state/props),
 * supaya tidak di-recreate tiap render.
 */
function acakUrutan(arr) {
  const hasil = [...arr];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

const JadwalPengawasTab = ({ jenisUjian, showToast, onBack, tabPaksa = null }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [daftarRuangan, setDaftarRuangan] = useState([]);
  const [daftarGuru, setDaftarGuru] = useState([]);
  const [daftarJadwal, setDaftarJadwal] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Jaring pengaman: penugasan pengawas (ujian_pengawas) yang nomor_ruangan-nya
  // udah gak valid lagi buat komposisi ruangan sekarang (lihat
  // cariPenugasanPengawasTidakValid() di jadwalPengawasSupabase.js). Normalnya
  // selalu kosong karena resetUntukProsesUlang() udah otomatis bersihin --
  // ini cuma buat nangkep kasus di luar jalur normal (data lama / edit manual).
  const [penugasanTidakValid, setPenugasanTidakValid] = useState([]);
  const [sedangBersihkanPenugasan, setSedangBersihkanPenugasan] = useState(false);

  // Tab internal komponen ini: "daftar" | "pengawas" | "rekap" | "lihat".
  // Kalau parent ngirim prop `tabPaksa`, tab bar internal disembunyiin dan
  // tab aktif ditentuin sepenuhnya sama parent -- dipakai waktu komponen ini
  // di-embed di kartu (PesertaPengawasTab) yang punya tab bar sendiri, biar
  // nggak ada 2 baris tab numpuk.
  const [tabInternal, setTabInternal] = useState("daftar");
  const tabAktif = tabPaksa || tabInternal;
  const setTabAktif = setTabInternal;

  const [jadwalPengawasAktif, setJadwalPengawasAktif] = useState(null);
  const [pengawasPerRuangan, setPengawasPerRuangan] = useState({});
  const [loadingPengawas, setLoadingPengawas] = useState(false);
  const [guruTerpilihBaru, setGuruTerpilihBaru] = useState({});
  const [menambahPengawas, setMenambahPengawas] = useState(null);

  // ---- Tampilan "Pengawas" sekarang PER HARI (bukan per sesi lepas) --
  // pilih 1 hari pelaksanaan dulu, baru tentukan siapa yang piket ngawas
  // hari itu. Sesi kedua & seterusnya di hari yang sama otomatis kebagi
  // lewat rotasi +1 ruangan (logic sama seperti sebelumnya, cuma sekarang
  // jadi tampilan utama, bukan modal terpisah). ----
  const [hariAktif, setHariAktif] = useState(null);
  const [modeGenerate, setModeGenerate] = useState(false); // true = lagi nampilin checklist guru
  const [guruTerpilihGenerate, setGuruTerpilihGenerate] = useState([]); // array guru_id
  const [sedangGenerate, setSedangGenerate] = useState(false);

  // ---- Tab "Rekap" -- preview semua hari & semua sesi sekaligus, jadi
  // panitia tidak perlu klik satu-satu dropdown sesi buat ngecek semua
  // jadwal sebelum di-print. Disimpan per jadwal_id (bukan per hari)
  // supaya gampang dipetakan ke tiap kolom sesi di tabel rekap. ----
  const [rekapPerJadwal, setRekapPerJadwal] = useState({}); // { [jadwalId]: { [nomor_ruangan]: [{id, nama}] } }
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [hariRekapAktif, setHariRekapAktif] = useState(null);

  // Jenjang peserta ujian ini (PSAS: 7/8/9, PSAT: 7/8, PSAJ: 9 saja) --
  // dipakai buat nentuin input override mata pelajaran kelas 8/9 mana yang
  // perlu ditampilkan di form Tambah/Edit Sesi (gak semua jenis ujian
  // punya kelas 8 atau 9).
  const gradesUjianIni = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.grades || ["7", "8", "9"];

  const semesterDibutuhkan = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.semester;
  // Kalau jenis ujian tidak dikenal (semesterDibutuhkan undefined), filter
  // tidak akan cocok sama sekali -- sengaja fallback ke semua tahun ajaran
  // supaya user tetap bisa pilih manual daripada dropdown kosong.
  const tahunAjaranTerfilter = daftarTahunAjaran.filter(
    (ta) => String(ta.semester) === semesterDibutuhkan
  );
  const opsiTahunAjaran =
    tahunAjaranTerfilter.length > 0 ? tahunAjaranTerfilter : daftarTahunAjaran;

  // Grouping jadwal per hari -- dipakai buat daftar hari di tab
  // "Pengawas" (1 hari bisa punya beberapa sesi: jam ke 1, 2, dst).
  // Dideklarasikan di awal (bukan dekat pemakaian JSX-nya) supaya efek
  // yang menentukan hari aktif default di bawah bisa memakainya.
  const jadwalPerHari = useMemo(() => kelompokkanJadwalPerHari(daftarJadwal), [daftarJadwal]);

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

  useEffect(() => {
    if (opsiTahunAjaran.length === 0) {
      setTahunAjaranId("");
      return;
    }
    const masihAda = opsiTahunAjaran.some((ta) => ta.id === tahunAjaranId);
    if (!masihAda) {
      const aktif = opsiTahunAjaran.find((ta) => ta.is_active);
      setTahunAjaranId((aktif || opsiTahunAjaran[0]).id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarTahunAjaran]);

  // Begitu tahun ajaran fix, CARI record `ujian` yang udah ada (bukan bikin
  // baru -- kartu ini cuma konsumen data pembagian ruangan, bukan yang
  // nentuin versi_skema). Record `ujian` bisa aja udah ada dalam bentuk
  // DRAFT (dibikin dari kartu "Jadwal Ujian" / "Panitia Ujian", versi_skema
  // masih null) -- itu SENGAJA dianggap "belum siap" di sini juga (lihat
  // pengecekan `!ujian || !ujian.versi_skema` di bawah), karena assign
  // pengawas ke ruangan beneran butuh Pembagian Ruangan udah diproses &
  // disimpan, bukan cuma record-nya ada.
  useEffect(() => {
    if (!tahunAjaranId) {
      setUjian(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingUjian(true);
      try {
        const rec = await cariUjian(supabase, jenisUjian, tahunAjaranId);
        if (!cancelled) setUjian(rec);
      } catch (err) {
        console.error(err);
        if (!cancelled) showToast?.("Gagal memuat data ujian: " + err.message, "error");
      } finally {
        if (!cancelled) setLoadingUjian(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tahunAjaranId, jenisUjian, showToast]);

  const muatData = useCallback(async () => {
    if (!ujian?.id) return;
    setLoadingData(true);
    try {
      const [ruangan, guru, jadwal] = await Promise.all([
        ambilRuanganUjian(supabase, ujian.id),
        ambilDaftarGuru(supabase),
        ambilJadwalSesi(supabase, ujian.id),
      ]);
      setDaftarRuangan(ruangan);
      setDaftarGuru(guru);
      setDaftarJadwal(jadwal);

      // Jaring pengaman: cek ada gak penugasan pengawas yang nomor_ruangan-nya
      // udah gak nyambung sama komposisi ruangan sekarang. Gagal di langkah
      // ini SENGAJA gak nge-throw ke luar (cuma logged) -- ini cuma
      // pengecekan tambahan, bukan alur inti, jadi gak boleh nge-block
      // tampilan Jadwal Sesi/Daftar Pengawas cuma gara-gara query ini error.
      try {
        const nomorValid = ruangan.map((r) => r.nomor_ruangan);
        const jadwalIds = jadwal.map((j) => j.id);
        const tidakValid = await cariPenugasanPengawasTidakValid(supabase, jadwalIds, nomorValid);
        setPenugasanTidakValid(tidakValid);
      } catch (errCek) {
        console.error("Gagal cek penugasan pengawas tidak valid:", errCek);
      }
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data jadwal & pengawas: " + err.message, "error");
    } finally {
      setLoadingData(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatData();
  }, [muatData]);

  // Handler tombol "Bersihkan Sekarang" di banner peringatan -- hapus semua
  // baris ujian_pengawas basi yang ketahuan lewat cariPenugasanPengawasTidakValid(),
  // lalu refresh state terkait (banner, list pengawas sesi aktif, rekap)
  // biar UI langsung nunjukin hasil bersih tanpa perlu reload manual.
  const handleBersihkanPenugasanTidakValid = async () => {
    if (penugasanTidakValid.length === 0) return;
    setSedangBersihkanPenugasan(true);
    try {
      const idList = penugasanTidakValid.map((p) => p.id);
      const jumlah = await bersihkanPenugasanPengawasTidakValid(supabase, idList);
      setPenugasanTidakValid([]);
      if (jadwalPengawasAktif) await muatPengawasUntukJadwal(jadwalPengawasAktif);
      if (tabAktif === "rekap" || tabAktif === "lihat") await muatRekapSemua();
      showToast?.(`${jumlah} penugasan pengawas basi berhasil dibersihkan.`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal membersihkan penugasan pengawas: " + err.message, "error");
    } finally {
      setSedangBersihkanPenugasan(false);
    }
  };

  /**
   * Ambil pengawas untuk 1 jadwal & kelompokkan per nomor ruangan.
   * Dipakai di 2 tempat (efek saat ganti sesi aktif, dan setelah generate
   * rotasi harian), jadi diekstrak supaya tidak duplikat.
   */
  const muatPengawasUntukJadwal = useCallback(
    async (jadwalId) => {
      if (!jadwalId) return;
      setLoadingPengawas(true);
      try {
        const data = await ambilPengawasUntukJadwal(supabase, jadwalId);
        const grouped = {};
        daftarRuangan.forEach((r) => (grouped[r.nomor_ruangan] = []));
        data.forEach((p) => {
          if (!grouped[p.nomor_ruangan]) grouped[p.nomor_ruangan] = [];
          grouped[p.nomor_ruangan].push(p);
        });
        setPengawasPerRuangan(grouped);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat data pengawas: " + err.message, "error");
      } finally {
        setLoadingPengawas(false);
      }
    },
    [daftarRuangan, showToast]
  );

  useEffect(() => {
    if (tabAktif !== "pengawas" || !jadwalPengawasAktif) return;
    muatPengawasUntukJadwal(jadwalPengawasAktif);
  }, [tabAktif, jadwalPengawasAktif, muatPengawasUntukJadwal]);

  /**
   * Versi "borongan" dari muatPengawasUntukJadwal -- ambil pengawas untuk
   * SEMUA sesi (semua hari) sekaligus, dipetakan per jadwal_id. Dipakai
   * khusus tab "Rekap" supaya satu tabel per hari bisa langsung nunjukin
   * semua sesi tanpa harus gonta-ganti dropdown dulu.
   */
  const muatRekapSemua = useCallback(async () => {
    if (daftarJadwal.length === 0) return;
    setLoadingRekap(true);
    try {
      const hasilPerJadwal = await Promise.all(
        daftarJadwal.map((j) => ambilPengawasUntukJadwal(supabase, j.id))
      );
      const map = {};
      daftarJadwal.forEach((j, idx) => {
        const grouped = {};
        hasilPerJadwal[idx].forEach((p) => {
          if (!grouped[p.nomor_ruangan]) grouped[p.nomor_ruangan] = [];
          grouped[p.nomor_ruangan].push(p);
        });
        map[j.id] = grouped;
      });
      setRekapPerJadwal(map);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat rekap pengawas: " + err.message, "error");
    } finally {
      setLoadingRekap(false);
    }
  }, [daftarJadwal, showToast]);

  // Muat ulang tiap kali tab "Rekap" dibuka -- termasuk setelah admin
  // baru generate/koreksi di tab "Kelola Jadwal Pengawas" lalu balik ke sini, jadi
  // rekap selalu nunjukin data paling baru.
  useEffect(() => {
    // Tab "lihat" (Jadwal Pengawas) butuh data yang sama dengan Rekap.
    if (tabAktif !== "rekap" && tabAktif !== "lihat") return;
    muatRekapSemua();
  }, [tabAktif, muatRekapSemua]);

  // Default hari aktif = hari pertama yang punya jadwal. Reset juga kalau
  // hari aktif sekarang udah tidak valid (mis. sesi hari itu dihapus),
  // biar tidak nunjuk ke tanggal yang sudah tidak ada.
  useEffect(() => {
    if (tabAktif !== "pengawas" || jadwalPerHari.length === 0) return;
    const hariMasihValid = jadwalPerHari.some((h) => h.tanggal === hariAktif);
    if (!hariAktif || !hariMasihValid) {
      setHariAktif(jadwalPerHari[0].tanggal);
    }
  }, [tabAktif, jadwalPerHari, hariAktif]);

  // Sama kayak default hari aktif di tab "Kelola Jadwal Pengawas" di atas, tapi
  // buat state hari yang dipakai tab "Rekap" -- dipisah state-nya
  // (bukan gantian pakai hariAktif) supaya pilihan hari di 2 tab ini
  // independen satu sama lain.
  useEffect(() => {
    if (tabAktif !== "rekap" || jadwalPerHari.length === 0) return;
    const hariMasihValid = jadwalPerHari.some((h) => h.tanggal === hariRekapAktif);
    if (!hariRekapAktif || !hariMasihValid) {
      setHariRekapAktif(jadwalPerHari[0].tanggal);
    }
  }, [tabAktif, jadwalPerHari, hariRekapAktif]);

  // Begitu hari aktif berubah, tampilan pengawas ngikut ke sesi PERTAMA
  // hari itu (base assignment) -- efek ambilPengawasUntukJadwal di atas
  // yang bergantung ke jadwalPengawasAktif otomatis jalan lagi.
  useEffect(() => {
    if (!hariAktif) return;
    const sesiHari = jadwalPerHari.find((h) => h.tanggal === hariAktif)?.sesi || [];
    setJadwalPengawasAktif(sesiHari[0]?.id ?? null);
    setModeGenerate(false);
    setGuruTerpilihGenerate([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hariAktif]);

  const handleTambahPengawas = async (nomorRuangan) => {
    const guruId = guruTerpilihBaru[nomorRuangan];
    if (!guruId) {
      showToast?.("Pilih guru dulu", "error");
      return;
    }
    const sudahAda = (pengawasPerRuangan[nomorRuangan] || []).some((p) => p.guru_id === guruId);
    if (sudahAda) {
      showToast?.("Guru ini sudah jadi pengawas di ruangan ini", "error");
      return;
    }
    setMenambahPengawas(nomorRuangan);
    try {
      const baru = await tambahPengawas(supabase, jadwalPengawasAktif, nomorRuangan, guruId);
      const guru = daftarGuru.find((g) => g.id === guruId);
      setPengawasPerRuangan((prev) => ({
        ...prev,
        [nomorRuangan]: [...(prev[nomorRuangan] || []), { ...baru, nama: guru?.full_name }],
      }));
      setGuruTerpilihBaru((prev) => ({ ...prev, [nomorRuangan]: "" }));
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menambah pengawas: " + err.message, "error");
    } finally {
      setMenambahPengawas(null);
    }
  };

  const handleHapusPengawas = async (nomorRuangan, pengawasId) => {
    try {
      await hapusPengawas(supabase, pengawasId);
      setPengawasPerRuangan((prev) => ({
        ...prev,
        [nomorRuangan]: (prev[nomorRuangan] || []).filter((p) => p.id !== pengawasId),
      }));
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus pengawas: " + err.message, "error");
    }
  };

  const daftarRuanganUrut = useMemo(
    () => [...daftarRuangan].sort((a, b) => a.nomor_ruangan - b.nomor_ruangan),
    [daftarRuangan]
  );

  // Sesi-sesi di hari yang lagi aktif (dari daftar hari di tab Pengawas)
  const sesiHariAktif = useMemo(
    () => jadwalPerHari.find((h) => h.tanggal === hariAktif)?.sesi || [],
    [jadwalPerHari, hariAktif]
  );

  const bukaModeGenerate = () => {
    // Kalau hari ini udah pernah di-generate, pre-check guru yang lagi
    // assigned sekarang (urutan sesuai nomor ruangan) biar admin tinggal
    // koreksi, bukan mulai dari kosong.
    const guruSekarang = daftarRuanganUrut
      .map((r) => (pengawasPerRuangan[r.nomor_ruangan] || [])[0]?.guru_id)
      .filter(Boolean);
    setGuruTerpilihGenerate(guruSekarang);
    setModeGenerate(true);
  };

  const batalModeGenerate = () => {
    setModeGenerate(false);
    setGuruTerpilihGenerate([]);
  };

  const toggleGuruTerpilih = (guruId) => {
    setGuruTerpilihGenerate((prev) => {
      if (prev.includes(guruId)) return prev.filter((id) => id !== guruId);
      // Batasi jumlah centang = jumlah ruangan. Lebih dari itu tidak akan
      // bisa di-apply (validasi handleGenerateHari), jadi cegah di awal
      // supaya user tidak bingung kenapa tombolnya disabled.
      if (prev.length >= daftarRuanganUrut.length) return prev;
      return [...prev, guruId];
    });
  };

  // "Centang Semua" -- sistem ngewajibin jumlah guru dicentang PAS SAMA
  // dengan jumlah ruangan (lihat validasi handleGenerateHari), jadi ini
  // BUKAN literal "centang semua guru pengawas" (bisa kelebihan & malah
  // nge-block tombol Acak & Terapkan). Yang dilakukan: isi otomatis dari
  // urutan Daftar Pengawas sampai PAS jumlah ruangan tercapai -- jadi
  // shortcut biar admin gak perlu klik satu-satu. Kalau udah penuh pas
  // dipencet, jadi toggle "Batalkan Semua" (ngosongin lagi).
  const semuaGuruGenerateTerisi =
    daftarRuanganUrut.length > 0 && guruTerpilihGenerate.length === daftarRuanganUrut.length;

  const toggleCentangSemuaGenerate = () => {
    if (semuaGuruGenerateTerisi) {
      setGuruTerpilihGenerate([]);
    } else {
      setGuruTerpilihGenerate(daftarGuru.slice(0, daftarRuanganUrut.length).map((g) => g.id));
    }
  };

  const handleGenerateHari = async () => {
    const jumlahRuangan = daftarRuanganUrut.length;
    if (jumlahRuangan === 0) {
      showToast?.("Belum ada data ruangan untuk ujian ini", "error");
      return;
    }
    if (guruTerpilihGenerate.length !== jumlahRuangan) {
      showToast?.(
        `Jumlah guru yang dicentang harus pas ${jumlahRuangan} (jumlah ruangan) -- sekarang ${guruTerpilihGenerate.length}`,
        "error"
      );
      return;
    }
    if (sesiHariAktif.length === 0) {
      showToast?.("Hari ini belum punya sesi jadwal", "error");
      return;
    }

    setSedangGenerate(true);
    try {
      const guruIdAcak = acakUrutan(guruTerpilihGenerate);
      const jumlahTersimpan = await terapkanRotasiPengawasHarian(
        supabase,
        sesiHariAktif,
        daftarRuanganUrut.map((r) => r.nomor_ruangan),
        guruIdAcak
      );
      showToast?.(
        `Pengawas hari ini berhasil di-generate: ${jumlahTersimpan} penugasan untuk ${sesiHariAktif.length} sesi`,
        "success"
      );
      batalModeGenerate();
      // Refresh tampilan pengawas sesi yang lagi ditampilin (pakai helper
      // yang sama seperti efek, jadi tidak duplikat logika grouping).
      if (jadwalPengawasAktif) await muatPengawasUntukJadwal(jadwalPengawasAktif);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal generate pengawas: " + err.message, "error");
    } finally {
      setSedangGenerate(false);
    }
  };

  // ... (JSX sama seperti sebelumnya, tidak ada perubahan tampilan)
  return (
    <div className={onBack ? "p-4 sm:p-6" : ""}>
      {/* Tombol balik & header jenis ujian cuma dipasang kalau komponen ini
      dibuka sebagai layar sendiri (onBack ada). Waktu di-embed di dalam kartu,
      kartu-nya yang udah punya tombol balik & header -- biar nggak dobel. */}
      {onBack && (
        <>
          <button
            onClick={onBack}
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

      <div className="mb-5 max-w-xs">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Tahun Ajaran
        </label>
        <select
          value={tahunAjaranId}
          onChange={(e) => setTahunAjaranId(e.target.value)}
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

      {(loadingUjian || loadingData) && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
          <Loader2 size={14} className="animate-spin" /> Memuat data...
        </p>
      )}

      {(!ujian || !ujian.versi_skema) && !loadingUjian && tahunAjaranId && (
        <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
          Data ujian untuk tahun ajaran ini belum diproses. Proses dulu{" "}
          <strong>Pembagian Ruangan</strong> (pilih versi skema & simpan) sebelum lanjut ke sini.
        </div>
      )}

      {ujian && ujian.versi_skema && !loadingData && (
        <>
          {daftarRuangan.length === 0 && (
            <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
              Belum ada data ruangan untuk tahun ajaran ini. Proses dulu{" "}
              <strong>Pembagian Ruangan</strong> supaya daftar ruangan tersedia di sini.
            </div>
          )}

          {penugasanTidakValid.length > 0 && (
            <div className="p-3 mb-5 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">
                    {penugasanTidakValid.length} penugasan pengawas nempel ke nomor ruangan yang
                    sudah tidak ada di komposisi ruangan sekarang.
                  </p>
                  <p className="mt-1">
                    Biasanya ini kejadian karena versi skema pernah diganti di luar tombol "Proses
                    Ulang dengan Versi Lain" (mis. edit langsung ke database), atau data peninggalan
                    dari sebelum pembersihan otomatis ada. Ruangan:{" "}
                    <span className="font-medium">
                      {[...new Set(penugasanTidakValid.map((p) => p.nomor_ruangan))]
                        .sort((a, b) => a - b)
                        .join(", ")}
                    </span>
                    .
                  </p>
                  <button
                    onClick={handleBersihkanPenugasanTidakValid}
                    disabled={sedangBersihkanPenugasan}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
                  >
                    {sedangBersihkanPenugasan ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    {sedangBersihkanPenugasan ? "Membersihkan..." : "Bersihkan Sekarang"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!tabPaksa && (
            <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setTabAktif("daftar")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tabAktif === "daftar"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <ClipboardList size={15} /> Daftar Pengawas
              </button>
              <button
                onClick={() => setTabAktif("pengawas")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tabAktif === "pengawas"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Users size={15} /> Kelola Jadwal Pengawas
              </button>
              <button
                onClick={() => setTabAktif("rekap")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tabAktif === "rekap"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Table2 size={15} /> Rekap
              </button>
              <button
                onClick={() => setTabAktif("lihat")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tabAktif === "lihat"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Printer size={15} /> Jadwal Pengawas
              </button>
            </div>
          )}

          {tabAktif === "daftar" && (
            <DaftarPengawasTab
              jenisUjian={jenisUjian}
              showToast={showToast}
              embedded
              onPerubahan={muatData}
            />
          )}

          {tabAktif === "pengawas" && (
            <div>
              {daftarJadwal.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Belum ada jadwal sesi. Isi dulu di kartu "Jadwal Ujian".
                </p>
              ) : (
                <>
                  {/* ---- Pilih hari pelaksanaan ---- */}
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Pilih hari pelaksanaan:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {jadwalPerHari.map((h) => (
                      <button
                        key={h.tanggal}
                        onClick={() => setHariAktif(h.tanggal)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          hariAktif === h.tanggal
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700"
                        }`}
                      >
                        {formatHariTanggal(h.tanggal)}
                        <span className="opacity-70"> ({h.sesi.length} sesi)</span>
                      </button>
                    ))}
                  </div>

                  {hariAktif && (
                    <>
                      {/* ---- Panel generate (checklist guru + acak) ----
                          Ditampilin inline (bukan modal/popup) -- checklist-nya
                          TANPA batas tinggi/scroll internal (dulu max-h-56 bikin
                          harus digeser-geser dalam kotak sempit buat liat semua
                          nama guru). Sekarang tingginya ngikutin isi, jadi scroll
                          halaman biasa aja yang jalan kalau daftar gurunya panjang. */}
                      {modeGenerate ? (
                        <div className="p-4 mb-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                              Pilih guru piket {formatHariTanggal(hariAktif)}
                            </p>
                            <button
                              onClick={batalModeGenerate}
                              className="text-emerald-700 dark:text-emerald-400 hover:opacity-70"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              Centang tepat <strong>{daftarRuanganUrut.length} guru</strong> (jumlah
                              ruangan hari ini) -- nanti diacak & disebar otomatis 1 guru per
                              ruangan, berlaku juga untuk sesi berikutnya hari ini (rotasi geser +1
                              ruangan).
                            </p>
                            {daftarGuru.length > 0 && (
                              <button
                                onClick={toggleCentangSemuaGenerate}
                                disabled={daftarRuanganUrut.length === 0}
                                className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50 transition-colors"
                              >
                                {semuaGuruGenerateTerisi ? "Batalkan Semua" : "Centang Semua"}
                              </button>
                            )}
                          </div>

                          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 mb-3 p-2 rounded-lg bg-white dark:bg-gray-800">
                            {daftarGuru.map((g) => {
                              const terpilih = guruTerpilihGenerate.includes(g.id);
                              const limitTercapai =
                                !terpilih &&
                                guruTerpilihGenerate.length >= daftarRuanganUrut.length;
                              return (
                                <label
                                  key={g.id}
                                  className={`flex items-center gap-2 text-xs px-1.5 py-1 mb-1 rounded break-inside-avoid ${
                                    limitTercapai
                                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={terpilih}
                                    disabled={limitTercapai}
                                    onChange={() => toggleGuruTerpilih(g.id)}
                                    className="rounded border-gray-300"
                                  />
                                  {g.kode_pengawas
                                    ? `${g.kode_pengawas} - ${g.full_name}`
                                    : g.full_name}
                                </label>
                              );
                            })}
                          </div>

                          {/* Sticky di dalam viewport pas discroll, biar tombol "Acak &
                              Terapkan" tetap keliatan walau lagi scroll checklist yang panjang. */}
                          <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 pt-2 pb-1 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-between">
                            <span
                              className={`text-xs font-medium ${
                                guruTerpilihGenerate.length === daftarRuanganUrut.length
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {guruTerpilihGenerate.length} / {daftarRuanganUrut.length} dicentang
                            </span>
                            <button
                              onClick={handleGenerateHari}
                              disabled={
                                sedangGenerate ||
                                guruTerpilihGenerate.length !== daftarRuanganUrut.length
                              }
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all active:scale-95"
                            >
                              <Shuffle size={14} />
                              {sedangGenerate ? "Menerapkan..." : "Acak & Terapkan"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={bukaModeGenerate}
                          disabled={daftarRuanganUrut.length === 0}
                          className="flex items-center gap-2 px-4 py-2.5 mb-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                        >
                          <Shuffle size={16} />
                          {Object.values(pengawasPerRuangan).some((arr) => arr.length > 0)
                            ? "Generate Ulang Hari Ini"
                            : "Generate Pengawas Hari Ini"}
                        </button>
                      )}

                      {/* ---- Hasil per ruangan (sesi yang lagi dilihat) + koreksi manual ---- */}
                      {sesiHariAktif.length > 1 && (
                        <div className="mb-3 max-w-sm">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Lihat/koreksi sesi
                          </label>
                          <select
                            value={jadwalPengawasAktif ?? ""}
                            onChange={(e) => setJadwalPengawasAktif(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                          >
                            {sesiHariAktif.map((j) => (
                              <option key={j.id} value={j.id}>
                                Jam Ke {j.sesi_ke} - {j.mata_pelajaran}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {loadingPengawas ? (
                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                          <Loader2 size={14} className="animate-spin" /> Memuat data pengawas...
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {daftarRuangan.map((r) => (
                            <div
                              key={r.nomor_ruangan}
                              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                  Ruang {r.nomor_ruangan}
                                </p>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {r.jumlah_siswa} siswa
                                </span>
                              </div>

                              <div className="space-y-1.5 mb-3">
                                {(pengawasPerRuangan[r.nomor_ruangan] || []).length === 0 && (
                                  <p className="text-[11px] text-gray-400 italic">
                                    Belum ada pengawas
                                  </p>
                                )}
                                {(pengawasPerRuangan[r.nomor_ruangan] || []).map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5"
                                  >
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {p.nama}
                                    </span>
                                    <button
                                      onClick={() => handleHapusPengawas(r.nomor_ruangan, p.id)}
                                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-1.5">
                                <select
                                  value={guruTerpilihBaru[r.nomor_ruangan] || ""}
                                  onChange={(e) =>
                                    setGuruTerpilihBaru((prev) => ({
                                      ...prev,
                                      [r.nomor_ruangan]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                                >
                                  <option value="">Ganti guru (koreksi manual)...</option>
                                  {daftarGuru.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.kode_pengawas
                                        ? `${g.kode_pengawas} - ${g.full_name}`
                                        : g.full_name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleTambahPengawas(r.nomor_ruangan)}
                                  disabled={menambahPengawas === r.nomor_ruangan}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {tabAktif === "lihat" && (
            <JadwalPengawasLihatView
              jenisUjian={jenisUjian}
              tahunAjaran={opsiTahunAjaran.find((ta) => ta.id === tahunAjaranId)}
              daftarJadwal={daftarJadwal}
              daftarRuangan={daftarRuangan}
              daftarGuru={daftarGuru}
              rekapPerJadwal={rekapPerJadwal}
              grades={gradesUjianIni}
              loading={loadingRekap}
              showToast={showToast}
            />
          )}

          {tabAktif === "rekap" && (
            <div>
              {daftarJadwal.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Belum ada jadwal sesi. Isi dulu di kartu "Jadwal Ujian".
                </p>
              ) : loadingRekap ? (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Memuat rekap pengawas...
                </p>
              ) : (
                <>
                  {/* ---- Pilih hari pelaksanaan -- pola sama persis kayak
                      selector hari di tab "Kelola Jadwal Pengawas", biar konsisten:
                      nama-nama hari tampil sebagai tombol di atas, lalu
                      cuma rekap hari yang dipilih yang ditampilkan di
                      bawahnya (dulu semua hari ditumpuk sekaligus). ---- */}
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Pilih hari pelaksanaan:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {jadwalPerHari.map((h) => (
                      <button
                        key={h.tanggal}
                        onClick={() => setHariRekapAktif(h.tanggal)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          hariRekapAktif === h.tanggal
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700"
                        }`}
                      >
                        {formatHariTanggal(h.tanggal)}
                        <span className="opacity-70"> ({h.sesi.length} sesi)</span>
                      </button>
                    ))}
                  </div>

                  {hariRekapAktif &&
                    (() => {
                      const hariTerpilih = jadwalPerHari.find((h) => h.tanggal === hariRekapAktif);
                      if (!hariTerpilih) return null;
                      const sesiHariIni = [...hariTerpilih.sesi].sort(
                        (a, b) => a.sesi_ke - b.sesi_ke
                      );

                      if (daftarRuanganUrut.length === 0) {
                        return (
                          <p className="text-xs text-gray-400 italic">
                            Belum ada data ruangan untuk ujian ini.
                          </p>
                        );
                      }

                      return (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm border-collapse">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-600 dark:text-gray-400">
                                  <th className="py-2.5 px-3 font-medium whitespace-nowrap sticky left-0 bg-gray-50 dark:bg-gray-700/50">
                                    Ruang
                                  </th>
                                  {sesiHariIni.map((s) => (
                                    <th
                                      key={s.id}
                                      className="py-2.5 px-3 font-medium whitespace-nowrap border-l border-gray-200 dark:border-gray-700"
                                    >
                                      Jam Ke {s.sesi_ke}
                                      <span className="block font-normal text-[11px] text-gray-500 dark:text-gray-400">
                                        {s.mata_pelajaran}
                                        {s.waktu_mulai && s.waktu_selesai
                                          ? ` (${s.waktu_mulai}–${s.waktu_selesai})`
                                          : ""}
                                      </span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {daftarRuanganUrut.map((r, idx) => (
                                  <tr
                                    key={r.nomor_ruangan}
                                    className={`border-t border-gray-100 dark:border-gray-700 ${
                                      idx % 2 === 1 ? "bg-gray-50/60 dark:bg-gray-800/40" : ""
                                    }`}
                                  >
                                    <td
                                      className={`py-2.5 px-3 font-medium whitespace-nowrap text-gray-800 dark:text-gray-100 sticky left-0 ${
                                        idx % 2 === 1
                                          ? "bg-gray-50/60 dark:bg-gray-800/40"
                                          : "bg-white dark:bg-gray-800"
                                      }`}
                                    >
                                      Ruang {r.nomor_ruangan}
                                      {r.jenjang && (
                                        <span className="block text-sm font-normal text-gray-500 dark:text-gray-400">
                                          Kelas {r.jenjang}
                                        </span>
                                      )}
                                    </td>
                                    {sesiHariIni.map((s) => {
                                      const pengawas =
                                        rekapPerJadwal[s.id]?.[r.nomor_ruangan] || [];
                                      // Ruang ini bisa berisi >1 jenjang (versi rantai/silang),
                                      // jadi mapel yang berlaku juga bisa >1 sekaligus -- lihat
                                      // mataPelajaranUntukRuangan() di jadwalPengawasSupabase.js.
                                      const mapelPerJenjang = mataPelajaranUntukRuangan(
                                        s,
                                        r.jenjangSet
                                      );
                                      const adaOverride = mapelPerJenjang.some(
                                        (m) => m.mapel !== s.mata_pelajaran
                                      );
                                      return (
                                        <td
                                          key={s.id}
                                          className="py-2.5 px-3 text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700"
                                        >
                                          {adaOverride && (
                                            <div className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
                                              {mapelPerJenjang.map((m) => (
                                                <span key={m.mapel} className="block">
                                                  {m.mapel}
                                                  {r.jenjangSet && r.jenjangSet.length > 1
                                                    ? ` (kls ${m.jenjang.join(",")})`
                                                    : ""}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          {pengawas.length === 0 ? (
                                            <span className="text-gray-400 italic">Belum ada</span>
                                          ) : (
                                            pengawas.map((p) => p.nama).join(", ")
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                </>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default JadwalPengawasTab;
