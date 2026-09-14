// setting/kelola-ujian/JadwalPengawasTab.js
// Sub-fitur "Jadwal & Pengawas" dari Manajemen Ujian.
// Alur: pilih tahun ajaran -> kelola daftar sesi ujian (tanggal, jam, mapel)
// di tab "Jadwal Sesi" -> assign guru pengawas per ruangan untuk tiap sesi
// di tab "Pengawas". Ruangan yang tersedia diambil dari hasil Pembagian
// Ruangan (tabel peserta_ujian) -- kalau belum diproses, tampilkan
// peringatan untuk proses ruangan dulu.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  X,
  CalendarClock,
  CalendarDays,
  Users,
  Loader2,
  Shuffle,
  GripVertical,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagianRuanganSupabase";
import {
  ambilRuanganUjian,
  ambilDaftarGuru,
  ambilJadwalSesi,
  simpanJadwalSesi,
  simpanJadwalSesiBulk,
  hapusJadwalSesi,
  ambilPengawasUntukJadwal,
  tambahPengawas,
  hapusPengawas,
  kelompokkanJadwalPerHari,
  terapkanRotasiPengawasHarian,
} from "./jadwalPengawasSupabase";

// Template waktu default dipakai "Generate Rentang Tanggal" -- weekday
// (Senin-Jumat) beda durasi dari weekend (Sabtu-Minggu), sesuai pola
// edaran jadwal ujian resmi sekolah. Admin masih bisa edit tiap baris
// sebelum disimpan, ini cuma titik awal biar gak isi dari kosong.
const DEFAULT_WAKTU_WEEKDAY = [
  { waktu_mulai: "07:30", waktu_selesai: "09:30" },
  { waktu_mulai: "10:00", waktu_selesai: "11:30" },
];
const DEFAULT_WAKTU_WEEKEND = [
  { waktu_mulai: "07:30", waktu_selesai: "09:00" },
  { waktu_mulai: "09:30", waktu_selesai: "11:00" },
];

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

const emptyJadwalForm = {
  tanggal: "",
  sesi_ke: 1,
  waktu_mulai: "",
  waktu_selesai: "",
  mata_pelajaran: "",
};

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

const JadwalPengawasTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [daftarRuangan, setDaftarRuangan] = useState([]);
  const [daftarGuru, setDaftarGuru] = useState([]);
  const [daftarJadwal, setDaftarJadwal] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [tabAktif, setTabAktif] = useState("jadwal"); // "jadwal" | "pengawas"

  const [showModalJadwal, setShowModalJadwal] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState(null);
  const [formJadwal, setFormJadwal] = useState(emptyJadwalForm);
  const [savingJadwal, setSavingJadwal] = useState(false);

  const [jadwalPengawasAktif, setJadwalPengawasAktif] = useState(null);
  const [pengawasPerRuangan, setPengawasPerRuangan] = useState({});
  const [loadingPengawas, setLoadingPengawas] = useState(false);
  const [guruTerpilihBaru, setGuruTerpilihBaru] = useState({});
  const [menambahPengawas, setMenambahPengawas] = useState(null);

  // ---- Rotasi Otomatis: base assignment sesi pertama 1 hari, sesi
  // berikutnya di hari yang sama otomatis digeser +1 ruangan (wrap). ----
  const [showModalRotasi, setShowModalRotasi] = useState(false);
  const [tanggalRotasi, setTanggalRotasi] = useState("");
  const [guruPerRuanganRotasi, setGuruPerRuanganRotasi] = useState({});
  const [savingRotasi, setSavingRotasi] = useState(false);

  // ---- Isi Pengawas Banyak Hari: susun pool guru per tanggal (urutan
  // pool = urutan ruangan), lalu terapkan rotasi ke SEMUA tanggal yang
  // pool-nya udah lengkap sekaligus, 1x klik. Pool per tanggal murni
  // manual, gak ada template mingguan -- tiap tanggal berdiri sendiri
  // supaya gampang diubah kalau ada guru yang tiba-tiba gabisa. ----
  const [showModalPoolBanyakHari, setShowModalPoolBanyakHari] = useState(false);
  const [poolPerTanggal, setPoolPerTanggal] = useState({});
  const [guruTerpilihPoolBaru, setGuruTerpilihPoolBaru] = useState({});
  const [dragInfoPool, setDragInfoPool] = useState(null);
  const [savingPoolBanyakHari, setSavingPoolBanyakHari] = useState(false);

  // ---- Generate Rentang Tanggal: bikin banyak sesi sekaligus dari
  // tanggal mulai-selesai (inklusif, TIDAK skip Sabtu/Minggu -- periode
  // ujian kadang emang nembus weekend). Hasil generate jadi draft lokal
  // dulu (belum ke DB), semua field masih bisa diedit / dihapus / hari
  // tertentu bisa di-exclude sebelum "Simpan Semua". ----
  const [showModalGenerate, setShowModalGenerate] = useState(false);
  const [rentangMulai, setRentangMulai] = useState("");
  const [rentangSelesai, setRentangSelesai] = useState("");
  const [draftSesi, setDraftSesi] = useState([]);
  const [savingBulk, setSavingBulk] = useState(false);

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

  // Begitu tahun ajaran fix, ambil/bikin record `ujian` (idempotent, sama
  // seperti Pembagian Ruangan -- kapasitas default cuma dipakai kalau
  // admin buka Jadwal & Pengawas duluan sebelum Pembagian Ruangan).
  useEffect(() => {
    if (!tahunAjaranId) {
      setUjian(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingUjian(true);
      try {
        const kapasitasDefault = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.defaultKapasitas || 40;
        const rec = await getOrCreateUjian(supabase, jenisUjian, tahunAjaranId, kapasitasDefault);
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

  const openAddJadwal = () => {
    setEditingJadwal(null);
    setFormJadwal(emptyJadwalForm);
    setShowModalJadwal(true);
  };

  const openEditJadwal = (jadwal) => {
    setEditingJadwal(jadwal);
    setFormJadwal({
      tanggal: jadwal.tanggal,
      sesi_ke: jadwal.sesi_ke,
      waktu_mulai: jadwal.waktu_mulai || "",
      waktu_selesai: jadwal.waktu_selesai || "",
      mata_pelajaran: jadwal.mata_pelajaran,
    });
    setShowModalJadwal(true);
  };

  const closeModalJadwal = () => {
    setShowModalJadwal(false);
    setEditingJadwal(null);
    setFormJadwal(emptyJadwalForm);
  };

  const handleSubmitJadwal = async (e) => {
    e.preventDefault();
    if (!formJadwal.tanggal || !formJadwal.mata_pelajaran.trim()) {
      showToast?.("Tanggal dan mata pelajaran wajib diisi", "error");
      return;
    }
    setSavingJadwal(true);
    try {
      await simpanJadwalSesi(supabase, {
        id: editingJadwal?.id,
        ujian_id: ujian.id,
        tanggal: formJadwal.tanggal,
        sesi_ke: Number(formJadwal.sesi_ke) || 1,
        waktu_mulai: formJadwal.waktu_mulai || null,
        waktu_selesai: formJadwal.waktu_selesai || null,
        mata_pelajaran: formJadwal.mata_pelajaran.trim(),
      });
      showToast?.(editingJadwal ? "Jadwal diperbarui" : "Jadwal ditambahkan", "success");
      closeModalJadwal();
      muatData();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan jadwal: " + err.message, "error");
    } finally {
      setSavingJadwal(false);
    }
  };

  const handleHapusJadwal = async (jadwal) => {
    if (
      !window.confirm(
        `Hapus jadwal "${jadwal.mata_pelajaran}" (${jadwal.tanggal})? Data pengawas untuk sesi ini juga akan ikut terhapus.`
      )
    )
      return;
    try {
      await hapusJadwalSesi(supabase, jadwal.id);
      showToast?.("Jadwal dihapus", "success");
      if (jadwalPengawasAktif === jadwal.id) setJadwalPengawasAktif(null);
      muatData();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus jadwal: " + err.message, "error");
    }
  };

  useEffect(() => {
    if (tabAktif !== "pengawas" || !jadwalPengawasAktif) return;
    (async () => {
      setLoadingPengawas(true);
      try {
        const data = await ambilPengawasUntukJadwal(supabase, jadwalPengawasAktif);
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
    })();
  }, [tabAktif, jadwalPengawasAktif, daftarRuangan, showToast]);

  useEffect(() => {
    if (tabAktif === "pengawas" && !jadwalPengawasAktif && daftarJadwal.length > 0) {
      setJadwalPengawasAktif(daftarJadwal[0].id);
    }
  }, [tabAktif, jadwalPengawasAktif, daftarJadwal]);

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

  const jadwalTerurut = useMemo(
    () =>
      [...daftarJadwal].sort((a, b) =>
        a.tanggal === b.tanggal ? a.sesi_ke - b.sesi_ke : a.tanggal.localeCompare(b.tanggal)
      ),
    [daftarJadwal]
  );

  // Grouping jadwal per hari, dipakai buat pilihan tanggal di modal Rotasi
  // Otomatis -- 1 hari bisa punya beberapa sesi (jam ke 1, 2, dst).
  const jadwalPerHari = useMemo(() => kelompokkanJadwalPerHari(daftarJadwal), [daftarJadwal]);

  const daftarRuanganUrut = useMemo(
    () => [...daftarRuangan].sort((a, b) => a.nomor_ruangan - b.nomor_ruangan),
    [daftarRuangan]
  );

  const openModalRotasi = () => {
    setTanggalRotasi(jadwalPerHari[0]?.tanggal || "");
    setGuruPerRuanganRotasi({});
    setShowModalRotasi(true);
  };

  const closeModalRotasi = () => {
    setShowModalRotasi(false);
    setTanggalRotasi("");
    setGuruPerRuanganRotasi({});
  };

  const sesiHariTerpilih = useMemo(
    () => jadwalPerHari.find((h) => h.tanggal === tanggalRotasi)?.sesi || [],
    [jadwalPerHari, tanggalRotasi]
  );

  const handleTerapkanRotasi = async () => {
    if (daftarRuanganUrut.length === 0) {
      showToast?.("Belum ada data ruangan untuk ujian ini", "error");
      return;
    }
    const guruIdSesiPertama = daftarRuanganUrut.map(
      (r) => guruPerRuanganRotasi[r.nomor_ruangan] || ""
    );
    const belumLengkap = guruIdSesiPertama.some((g) => !g);
    if (belumLengkap) {
      showToast?.("Semua ruangan harus diisi guru pengawas dulu", "error");
      return;
    }
    if (sesiHariTerpilih.length === 0) {
      showToast?.("Tanggal ini belum punya sesi jadwal", "error");
      return;
    }

    setSavingRotasi(true);
    try {
      const jumlahTersimpan = await terapkanRotasiPengawasHarian(
        supabase,
        sesiHariTerpilih,
        daftarRuanganUrut.map((r) => r.nomor_ruangan),
        guruIdSesiPertama
      );
      showToast?.(
        `Rotasi diterapkan: ${jumlahTersimpan} penugasan pengawas tersimpan untuk ${sesiHariTerpilih.length} sesi`,
        "success"
      );
      closeModalRotasi();
      // Refresh tampilan pengawas sesi yang lagi aktif (kalau termasuk hari ini)
      if (jadwalPengawasAktif && sesiHariTerpilih.some((s) => s.id === jadwalPengawasAktif)) {
        setLoadingPengawas(true);
        try {
          const data = await ambilPengawasUntukJadwal(supabase, jadwalPengawasAktif);
          const grouped = {};
          daftarRuangan.forEach((r) => (grouped[r.nomor_ruangan] = []));
          data.forEach((p) => {
            if (!grouped[p.nomor_ruangan]) grouped[p.nomor_ruangan] = [];
            grouped[p.nomor_ruangan].push(p);
          });
          setPengawasPerRuangan(grouped);
        } finally {
          setLoadingPengawas(false);
        }
      }
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menerapkan rotasi: " + err.message, "error");
    } finally {
      setSavingRotasi(false);
    }
  };

  const openModalPoolBanyakHari = () => {
    setPoolPerTanggal({});
    setGuruTerpilihPoolBaru({});
    setDragInfoPool(null);
    setShowModalPoolBanyakHari(true);
  };

  const closeModalPoolBanyakHari = () => {
    setShowModalPoolBanyakHari(false);
    setPoolPerTanggal({});
    setGuruTerpilihPoolBaru({});
    setDragInfoPool(null);
  };

  const tambahGuruPool = (tanggal, guruId) => {
    setPoolPerTanggal((prev) => {
      const current = prev[tanggal] || [];
      if (current.includes(guruId) || current.length >= daftarRuanganUrut.length) return prev;
      return { ...prev, [tanggal]: [...current, guruId] };
    });
  };

  const hapusGuruPool = (tanggal, guruId) => {
    setPoolPerTanggal((prev) => ({
      ...prev,
      [tanggal]: (prev[tanggal] || []).filter((id) => id !== guruId),
    }));
  };

  // Geser posisi guru dalam pool 1 tanggal -- posisi = urutan ruangan,
  // jadi geser ke atas/bawah = tukar dia bakal jadi pengawas ruangan
  // berapa pas "Terapkan Semua" dipanggil.
  const pindahkanGuruPool = (tanggal, dariIdx, keIdx) => {
    setPoolPerTanggal((prev) => {
      const arr = [...(prev[tanggal] || [])];
      if (
        dariIdx === keIdx ||
        dariIdx < 0 ||
        keIdx < 0 ||
        dariIdx >= arr.length ||
        keIdx >= arr.length
      ) {
        return prev;
      }
      const [dipindah] = arr.splice(dariIdx, 1);
      arr.splice(keIdx, 0, dipindah);
      return { ...prev, [tanggal]: arr };
    });
  };

  const handleTerapkanPoolBanyakHari = async () => {
    const jumlahRuangan = daftarRuanganUrut.length;
    if (jumlahRuangan === 0) {
      showToast?.("Belum ada data ruangan untuk ujian ini", "error");
      return;
    }
    const tanggalLengkap = jadwalPerHari.filter(
      (h) => (poolPerTanggal[h.tanggal] || []).length === jumlahRuangan
    );
    if (tanggalLengkap.length === 0) {
      showToast?.("Belum ada tanggal yang pool-nya lengkap (semua ruangan terisi)", "error");
      return;
    }

    setSavingPoolBanyakHari(true);
    let totalHari = 0;
    let totalPenugasan = 0;
    const gagal = [];
    try {
      for (const h of tanggalLengkap) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const jumlah = await terapkanRotasiPengawasHarian(
            supabase,
            h.sesi,
            daftarRuanganUrut.map((r) => r.nomor_ruangan),
            poolPerTanggal[h.tanggal]
          );
          totalHari += 1;
          totalPenugasan += jumlah;
        } catch (err) {
          console.error(err);
          gagal.push(formatHariTanggal(h.tanggal));
        }
      }

      if (totalHari > 0) {
        showToast?.(
          `${totalHari} hari diterapkan (${totalPenugasan} penugasan pengawas tersimpan)` +
            (gagal.length > 0 ? `, gagal: ${gagal.join(", ")}` : ""),
          gagal.length > 0 ? "error" : "success"
        );
      } else {
        showToast?.("Gagal menerapkan semua hari: " + gagal.join(", "), "error");
      }

      closeModalPoolBanyakHari();

      if (jadwalPengawasAktif) {
        setLoadingPengawas(true);
        try {
          const data = await ambilPengawasUntukJadwal(supabase, jadwalPengawasAktif);
          const grouped = {};
          daftarRuangan.forEach((r) => (grouped[r.nomor_ruangan] = []));
          data.forEach((p) => {
            if (!grouped[p.nomor_ruangan]) grouped[p.nomor_ruangan] = [];
            grouped[p.nomor_ruangan].push(p);
          });
          setPengawasPerRuangan(grouped);
        } finally {
          setLoadingPengawas(false);
        }
      }
    } finally {
      setSavingPoolBanyakHari(false);
    }
  };

  // Set "tanggal|sesi_ke" yang udah ada di DB, buat auto-skip pas
  // generate biar gak dobel kalau rentang yang dipilih overlap sama
  // jadwal yang udah pernah ditambah (manual atau generate sebelumnya).
  const jadwalSudahAdaSet = useMemo(
    () => new Set(daftarJadwal.map((j) => `${j.tanggal}|${j.sesi_ke}`)),
    [daftarJadwal]
  );

  const openModalGenerate = () => {
    setRentangMulai("");
    setRentangSelesai("");
    setDraftSesi([]);
    setShowModalGenerate(true);
  };

  const closeModalGenerate = () => {
    setShowModalGenerate(false);
    setRentangMulai("");
    setRentangSelesai("");
    setDraftSesi([]);
  };

  const generateDraftSesi = () => {
    if (!rentangMulai || !rentangSelesai) {
      showToast?.("Isi tanggal mulai dan selesai dulu", "error");
      return;
    }
    const mulai = new Date(`${rentangMulai}T00:00:00`);
    const selesai = new Date(`${rentangSelesai}T00:00:00`);
    if (selesai < mulai) {
      showToast?.("Tanggal selesai harus setelah tanggal mulai", "error");
      return;
    }

    const rows = [];
    let dilewati = 0;
    const cursor = new Date(mulai);
    while (cursor <= selesai) {
      const tahun = cursor.getFullYear();
      const bulan = String(cursor.getMonth() + 1).padStart(2, "0");
      const hari = String(cursor.getDate()).padStart(2, "0");
      const tanggal = `${tahun}-${bulan}-${hari}`;
      const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
      const template = isWeekend ? DEFAULT_WAKTU_WEEKEND : DEFAULT_WAKTU_WEEKDAY;

      template.forEach((t, i) => {
        const sesiKe = i + 1;
        if (jadwalSudahAdaSet.has(`${tanggal}|${sesiKe}`)) {
          dilewati += 1;
          return;
        }
        rows.push({
          key: `${tanggal}-${sesiKe}-${Math.random().toString(36).slice(2, 7)}`,
          tanggal,
          sesi_ke: sesiKe,
          waktu_mulai: t.waktu_mulai,
          waktu_selesai: t.waktu_selesai,
          mata_pelajaran: "",
          included: true,
        });
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    setDraftSesi(rows);
    if (dilewati > 0) {
      showToast?.(
        `${dilewati} sesi dilewati karena tanggal & jam itu sudah ada jadwalnya`,
        "success"
      );
    }
  };

  const toggleTanggalDraft = (tanggal, included) => {
    setDraftSesi((prev) => prev.map((r) => (r.tanggal === tanggal ? { ...r, included } : r)));
  };

  const updateDraftSesi = (key, field, value) => {
    setDraftSesi((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const hapusDraftSesi = (key) => {
    setDraftSesi((prev) => prev.filter((r) => r.key !== key));
  };

  const tambahDraftSesiHari = (tanggal) => {
    setDraftSesi((prev) => {
      const sesiHariIni = prev.filter((r) => r.tanggal === tanggal);
      const sesiKeBaru =
        sesiHariIni.length > 0 ? Math.max(...sesiHariIni.map((r) => r.sesi_ke)) + 1 : 1;
      const rowBaru = {
        key: `${tanggal}-${sesiKeBaru}-${Math.random().toString(36).slice(2, 7)}`,
        tanggal,
        sesi_ke: sesiKeBaru,
        waktu_mulai: "",
        waktu_selesai: "",
        mata_pelajaran: "",
        included: true,
      };
      const idxTerakhir = prev.map((r) => r.tanggal).lastIndexOf(tanggal);
      if (idxTerakhir === -1) return [...prev, rowBaru];
      const salinan = [...prev];
      salinan.splice(idxTerakhir + 1, 0, rowBaru);
      return salinan;
    });
  };

  const draftPerHari = useMemo(() => {
    const perHari = {};
    draftSesi.forEach((r) => {
      if (!perHari[r.tanggal]) perHari[r.tanggal] = [];
      perHari[r.tanggal].push(r);
    });
    return Object.entries(perHari)
      .map(([tanggal, sesi]) => ({
        tanggal,
        sesi: [...sesi].sort((a, b) => a.sesi_ke - b.sesi_ke),
      }))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [draftSesi]);

  const jumlahDraftTerpilih = draftSesi.filter((r) => r.included).length;

  const handleSimpanBulk = async () => {
    const rowsTerpilih = draftSesi.filter((r) => r.included);
    if (rowsTerpilih.length === 0) {
      showToast?.("Tidak ada sesi yang dicentang untuk disimpan", "error");
      return;
    }
    const belumLengkap = rowsTerpilih.find((r) => !r.mata_pelajaran.trim());
    if (belumLengkap) {
      showToast?.(
        `Mata pelajaran ${formatHariTanggal(belumLengkap.tanggal)} Jam Ke ${belumLengkap.sesi_ke} belum diisi`,
        "error"
      );
      return;
    }

    setSavingBulk(true);
    try {
      const jumlah = await simpanJadwalSesiBulk(supabase, ujian.id, rowsTerpilih);
      showToast?.(`${jumlah} sesi jadwal tersimpan`, "success");
      closeModalGenerate();
      muatData();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan jadwal massal: " + err.message, "error");
    } finally {
      setSavingBulk(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
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

      {ujian && !loadingData && (
        <>
          {daftarRuangan.length === 0 && (
            <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
              Belum ada data ruangan untuk tahun ajaran ini. Proses dulu{" "}
              <strong>Pembagian Ruangan</strong> supaya daftar ruangan tersedia di sini.
            </div>
          )}

          <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setTabAktif("jadwal")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === "jadwal"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <CalendarClock size={15} /> Jadwal Sesi
            </button>
            <button
              onClick={() => setTabAktif("pengawas")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === "pengawas"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Users size={15} /> Pengawas
            </button>
          </div>

          {tabAktif === "jadwal" && (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={openAddJadwal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                >
                  <Plus size={16} /> Tambah Sesi
                </button>
                <button
                  onClick={openModalGenerate}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm font-medium rounded-xl transition-all active:scale-95"
                >
                  <CalendarDays size={16} /> Generate Rentang Tanggal
                </button>
              </div>

              {jadwalTerurut.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Belum ada jadwal sesi.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-gray-600 dark:text-gray-400">
                        <th className="py-2 pr-3 font-medium">Hari/Tanggal</th>
                        <th className="py-2 pr-3 font-medium">Jam Ke</th>
                        <th className="py-2 pr-3 font-medium">Waktu</th>
                        <th className="py-2 pr-3 font-medium">Mata Pelajaran</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {jadwalTerurut.map((j, idx) => {
                        const tanggalSama = idx > 0 && jadwalTerurut[idx - 1].tanggal === j.tanggal;
                        return (
                          <tr key={j.id} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="py-2 pr-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {tanggalSama ? "" : formatHariTanggal(j.tanggal)}
                            </td>
                            <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">
                              {j.sesi_ke}
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {j.waktu_mulai && j.waktu_selesai
                                ? `${j.waktu_mulai}–${j.waktu_selesai}`
                                : "-"}
                            </td>
                            <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-100">
                              {j.mata_pelajaran}
                            </td>
                            <td className="py-2 text-right whitespace-nowrap">
                              <button
                                onClick={() => openEditJadwal(j)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleHapusJadwal(j)}
                                className="text-red-600 dark:text-red-400 hover:underline"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tabAktif === "pengawas" && (
            <div>
              {daftarJadwal.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Belum ada jadwal sesi. Tambahkan dulu di tab "Jadwal Sesi".
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={openModalRotasi}
                      disabled={daftarRuanganUrut.length === 0}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                    >
                      <Shuffle size={16} /> Rotasi Otomatis
                    </button>
                    <button
                      onClick={openModalPoolBanyakHari}
                      disabled={daftarRuanganUrut.length === 0}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 text-sm font-medium rounded-xl transition-all active:scale-95"
                    >
                      <Users size={16} /> Isi Pengawas Banyak Hari
                    </button>
                  </div>

                  <div className="mb-4 max-w-sm">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Pilih Sesi
                    </label>
                    <select
                      value={jadwalPengawasAktif ?? ""}
                      onChange={(e) => setJadwalPengawasAktif(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    >
                      {jadwalTerurut.map((j) => (
                        <option key={j.id} value={j.id}>
                          {formatHariTanggal(j.tanggal)} - Jam Ke {j.sesi_ke} - {j.mata_pelajaran}
                        </option>
                      ))}
                    </select>
                  </div>

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
                              <p className="text-[11px] text-gray-400 italic">Belum ada pengawas</p>
                            )}
                            {(pengawasPerRuangan[r.nomor_ruangan] || []).map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5"
                              >
                                <span className="text-gray-700 dark:text-gray-300">{p.nama}</span>
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
                              <option value="">Pilih guru...</option>
                              {daftarGuru.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.full_name}
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
            </div>
          )}
        </>
      )}

      {showModalJadwal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                {editingJadwal ? "Edit Sesi" : "Tambah Sesi"}
              </h2>
              <button
                onClick={closeModalJadwal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitJadwal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formJadwal.tanggal}
                  onChange={(e) => setFormJadwal({ ...formJadwal, tanggal: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Jam Ke
                </label>
                <input
                  type="number"
                  min={1}
                  value={formJadwal.sesi_ke}
                  onChange={(e) => setFormJadwal({ ...formJadwal, sesi_ke: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    value={formJadwal.waktu_mulai}
                    onChange={(e) => setFormJadwal({ ...formJadwal, waktu_mulai: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="time"
                    value={formJadwal.waktu_selesai}
                    onChange={(e) =>
                      setFormJadwal({ ...formJadwal, waktu_selesai: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Mata Pelajaran
                </label>
                <input
                  value={formJadwal.mata_pelajaran}
                  onChange={(e) => setFormJadwal({ ...formJadwal, mata_pelajaran: e.target.value })}
                  placeholder="mis. Matematika"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModalJadwal}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingJadwal}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingJadwal ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalRotasi && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Rotasi Otomatis Pengawas
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Isi pengawas untuk sesi PERTAMA hari ini. Sesi berikutnya otomatis digeser +1
                  ruangan (ruangan terakhir muter balik ke Ruang 1).
                </p>
              </div>
              <button
                onClick={closeModalRotasi}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-3"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 pt-3 overflow-y-auto">
              <div className="mb-4 max-w-xs">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Hari
                </label>
                <select
                  value={tanggalRotasi}
                  onChange={(e) => setTanggalRotasi(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  {jadwalPerHari.map((h) => (
                    <option key={h.tanggal} value={h.tanggal}>
                      {formatHariTanggal(h.tanggal)} ({h.sesi.length} sesi)
                    </option>
                  ))}
                </select>
              </div>

              {sesiHariTerpilih.length > 0 && (
                <div className="mb-4 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-[11px] text-gray-600 dark:text-gray-400">
                  Sesi hari ini:{" "}
                  {sesiHariTerpilih
                    .map((s) => `Jam Ke ${s.sesi_ke} (${s.mata_pelajaran})`)
                    .join(", ")}
                </div>
              )}

              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Pengawas Sesi Pertama (Jam Ke {sesiHariTerpilih[0]?.sesi_ke ?? "-"}) per Ruangan
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {daftarRuanganUrut.map((r) => (
                  <div key={r.nomor_ruangan} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-16 flex-shrink-0">
                      Ruang {r.nomor_ruangan}
                    </span>
                    <select
                      value={guruPerRuanganRotasi[r.nomor_ruangan] || ""}
                      onChange={(e) =>
                        setGuruPerRuanganRotasi((prev) => ({
                          ...prev,
                          [r.nomor_ruangan]: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    >
                      <option value="">Pilih guru...</option>
                      {daftarGuru.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={closeModalRotasi}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTerapkanRotasi}
                disabled={savingRotasi}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingRotasi ? "Menerapkan..." : "Terapkan Rotasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalPoolBanyakHari && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Isi Pengawas Banyak Hari
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Susun daftar guru per tanggal, urutan = urutan ruangan (geser buat tukar posisi).
                  Tanggal yang udah {daftarRuanganUrut.length}/{daftarRuanganUrut.length} langsung
                  diterapkan pas klik "Terapkan Semua".
                </p>
              </div>
              <button
                onClick={closeModalPoolBanyakHari}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-3"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 pt-3 overflow-y-auto space-y-4">
              {jadwalPerHari.length === 0 && (
                <p className="text-xs text-gray-400 italic">Belum ada jadwal sesi.</p>
              )}
              {jadwalPerHari.map((h) => {
                const pool = poolPerTanggal[h.tanggal] || [];
                const jumlahRuangan = daftarRuanganUrut.length;
                const guruDipakai = new Set(pool);
                return (
                  <div
                    key={h.tanggal}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {formatHariTanggal(h.tanggal)}
                      </p>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          pool.length === jumlahRuangan
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400"
                        }`}
                      >
                        {pool.length}/{jumlahRuangan}
                      </span>
                    </div>

                    {pool.length > 0 && (
                      <div className="space-y-1 mb-2.5">
                        {pool.map((guruId, idx) => {
                          const guru = daftarGuru.find((g) => g.id === guruId);
                          return (
                            <div
                              key={guruId}
                              draggable
                              onDragStart={() =>
                                setDragInfoPool({ tanggal: h.tanggal, index: idx })
                              }
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (dragInfoPool && dragInfoPool.tanggal === h.tanggal) {
                                  pindahkanGuruPool(h.tanggal, dragInfoPool.index, idx);
                                }
                                setDragInfoPool(null);
                              }}
                              className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5 cursor-move"
                            >
                              <GripVertical size={13} className="text-gray-400 flex-shrink-0" />
                              <span className="w-16 flex-shrink-0 text-gray-500 dark:text-gray-400">
                                Ruang {daftarRuanganUrut[idx]?.nomor_ruangan ?? "-"}
                              </span>
                              <span className="flex-1 text-gray-700 dark:text-gray-300">
                                {guru?.full_name || "-"}
                              </span>
                              <button
                                onClick={() => hapusGuruPool(h.tanggal, guruId)}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {pool.length < jumlahRuangan && (
                      <div className="flex gap-1.5">
                        <select
                          value={guruTerpilihPoolBaru[h.tanggal] || ""}
                          onChange={(e) =>
                            setGuruTerpilihPoolBaru((prev) => ({
                              ...prev,
                              [h.tanggal]: e.target.value,
                            }))
                          }
                          className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                        >
                          <option value="">Pilih guru...</option>
                          {daftarGuru
                            .filter((g) => !guruDipakai.has(g.id))
                            .map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.full_name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => {
                            const guruId = guruTerpilihPoolBaru[h.tanggal];
                            if (!guruId) {
                              showToast?.("Pilih guru dulu", "error");
                              return;
                            }
                            tambahGuruPool(h.tanggal, guruId);
                            setGuruTerpilihPoolBaru((prev) => ({ ...prev, [h.tanggal]: "" }));
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={closeModalPoolBanyakHari}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTerapkanPoolBanyakHari}
                disabled={savingPoolBanyakHari}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingPoolBanyakHari ? "Menerapkan..." : "Terapkan Semua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalGenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Generate Jadwal dari Rentang Tanggal
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Isi tanggal mulai & selesai, 2 sesi/hari dibuatkan otomatis (waktu nyesuain
                  weekday/weekend). Semua masih bisa diedit atau dihapus sebelum disimpan.
                </p>
              </div>
              <button
                onClick={closeModalGenerate}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-3"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 pt-3 overflow-y-auto">
              <div className="flex flex-wrap items-end gap-3 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={rentangMulai}
                    onChange={(e) => setRentangMulai(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={rentangSelesai}
                    onChange={(e) => setRentangSelesai(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateDraftSesi}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all active:scale-95"
                >
                  Generate
                </button>
              </div>

              {draftSesi.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Belum ada draft. Isi rentang tanggal lalu klik Generate.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-gray-600 dark:text-gray-400">
                        <th className="py-2 pr-2 font-medium w-8"></th>
                        <th className="py-2 pr-3 font-medium">Hari/Tanggal</th>
                        <th className="py-2 pr-3 font-medium">Jam Ke</th>
                        <th className="py-2 pr-3 font-medium">Waktu</th>
                        <th className="py-2 pr-3 font-medium">Mata Pelajaran</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftPerHari.map((h) => (
                        <React.Fragment key={h.tanggal}>
                          {h.sesi.map((r, i) => (
                            <tr
                              key={r.key}
                              className={`border-t border-gray-100 dark:border-gray-700 ${
                                !r.included ? "opacity-40" : ""
                              }`}
                            >
                              {i === 0 && (
                                <td rowSpan={h.sesi.length} className="py-2 pr-2 align-top">
                                  <input
                                    type="checkbox"
                                    checked={h.sesi.every((s) => s.included)}
                                    onChange={(e) =>
                                      toggleTanggalDraft(h.tanggal, e.target.checked)
                                    }
                                  />
                                </td>
                              )}
                              {i === 0 && (
                                <td
                                  rowSpan={h.sesi.length}
                                  className="py-2 pr-3 align-top whitespace-nowrap text-gray-700 dark:text-gray-300"
                                >
                                  {formatHariTanggal(h.tanggal)}
                                </td>
                              )}
                              <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">
                                {r.sesi_ke}
                              </td>
                              <td className="py-2 pr-3 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="time"
                                    value={r.waktu_mulai}
                                    onChange={(e) =>
                                      updateDraftSesi(r.key, "waktu_mulai", e.target.value)
                                    }
                                    className="w-24 px-1.5 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                                  />
                                  <span className="text-gray-400">–</span>
                                  <input
                                    type="time"
                                    value={r.waktu_selesai}
                                    onChange={(e) =>
                                      updateDraftSesi(r.key, "waktu_selesai", e.target.value)
                                    }
                                    className="w-24 px-1.5 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                                  />
                                </div>
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="text"
                                  value={r.mata_pelajaran}
                                  placeholder="mis. Matematika"
                                  onChange={(e) =>
                                    updateDraftSesi(r.key, "mata_pelajaran", e.target.value)
                                  }
                                  className="w-full min-w-[9rem] px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                                />
                              </td>
                              <td className="py-2 text-right whitespace-nowrap">
                                <button
                                  onClick={() => hapusDraftSesi(r.key)}
                                  className="text-red-600 dark:text-red-400 hover:underline"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td></td>
                            <td></td>
                            <td colSpan={4} className="pb-2">
                              <button
                                type="button"
                                onClick={() => tambahDraftSesiHari(h.tanggal)}
                                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                + Tambah sesi di hari ini
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={closeModalGenerate}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpanBulk}
                disabled={savingBulk || jumlahDraftTerpilih === 0}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingBulk ? "Menyimpan..." : `Simpan ${jumlahDraftTerpilih} Sesi`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JadwalPengawasTab;
