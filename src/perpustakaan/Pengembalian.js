//[file name]: Pengembalian.js
import React, { useState, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Search,
  X,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Wallet,
  History,
  Inbox,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const DENDA_PER_HARI = 1000; // Rp per hari keterlambatan, sesuaikan kebijakan perpustakaan

const toISODate = (date) => date.toISOString().slice(0, 10);
const today = new Date();

const hitungTelatHari = (tanggalJatuhTempo, tanggalAcuan = toISODate(today)) => {
  const jatuhTempo = new Date(tanggalJatuhTempo);
  const acuan = new Date(tanggalAcuan);
  const selisihMs = acuan.setHours(0, 0, 0, 0) - jatuhTempo.setHours(0, 0, 0, 0);
  const hari = Math.round(selisihMs / (1000 * 60 * 60 * 24));
  return hari > 0 ? hari : 0;
};

const formatTanggal = (isoStr) => {
  if (!isoStr) return "-";
  return new Date(isoStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatRupiah = (angka) => `Rp${Number(angka || 0).toLocaleString("id-ID")}`;

const KONDISI_BUKU = ["Baik", "Rusak Ringan", "Rusak Berat", "Hilang"];

const mapMenunggu = (r) => ({
  id: r.id,
  judulBuku: r.judul_buku_snapshot,
  namaPeminjam: r.nama_peminjam,
  noAnggota: r.no_anggota,
  tanggalPinjam: r.tanggal_pinjam,
  tanggalJatuhTempo: r.tanggal_jatuh_tempo,
});

const mapRiwayat = (r) => ({
  id: r.id,
  judulBuku: r.judul_buku_snapshot,
  namaPeminjam: r.nama_peminjam,
  noAnggota: r.no_anggota,
  tanggalPinjam: r.tanggal_pinjam,
  tanggalJatuhTempo: r.tanggal_jatuh_tempo,
  tanggalKembali: r.tanggal_kembali,
  telatHari: hitungTelatHari(r.tanggal_jatuh_tempo, r.tanggal_kembali || toISODate(today)),
  denda: r.denda,
  kondisi: r.kondisi_buku || "Baik",
  catatan: r.catatan || "",
});

const Pengembalian = ({ darkMode = false }) => {
  const [menunggu, setMenunggu] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [tab, setTab] = useState("menunggu"); // "menunggu" | "riwayat"
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [stats, setStats] = useState({
    totalMenunggu: 0,
    totalTerlambat: 0,
    dikembalikanHariIni: 0,
    totalDenda: 0,
  });

  const [prosesTarget, setProsesTarget] = useState(null);
  const [kondisi, setKondisi] = useState("Baik");
  const [denda, setDenda] = useState(0);
  const [catatan, setCatatan] = useState("");
  const [formError, setFormError] = useState("");

  // ---------- Debounce search ----------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ---------- Fetch data sesuai tab aktif ----------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const kw = debouncedSearch.replace(/[%,]/g, "");

      if (tab === "menunggu") {
        let query = supabase
          .from("peminjaman")
          .select("*")
          .eq("status", "dipinjam")
          .order("tanggal_jatuh_tempo", { ascending: true });

        if (kw) {
          query = query.or(
            `judul_buku_snapshot.ilike.%${kw}%,nama_peminjam.ilike.%${kw}%,no_anggota.ilike.%${kw}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        setMenunggu((data || []).map(mapMenunggu));
      } else {
        let query = supabase
          .from("peminjaman")
          .select("*")
          .eq("status", "dikembalikan")
          .order("tanggal_kembali", { ascending: false })
          .limit(300);

        if (kw) {
          query = query.or(
            `judul_buku_snapshot.ilike.%${kw}%,nama_peminjam.ilike.%${kw}%,no_anggota.ilike.%${kw}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        setRiwayat((data || []).map(mapRiwayat));
      }
    } catch (err) {
      console.error("Gagal memuat data pengembalian:", err);
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Fetch statistik (agregat semua data, gak kena filter search) ----------
  const fetchStats = useCallback(async () => {
    try {
      const todayStr = toISODate(today);

      const [menungguRes, terlambatRes, riwayatHariIniRes, dendaRes] = await Promise.all([
        supabase
          .from("peminjaman")
          .select("*", { count: "exact", head: true })
          .eq("status", "dipinjam"),
        supabase
          .from("peminjaman")
          .select("*", { count: "exact", head: true })
          .eq("status", "dipinjam")
          .lt("tanggal_jatuh_tempo", todayStr),
        supabase
          .from("peminjaman")
          .select("*", { count: "exact", head: true })
          .eq("status", "dikembalikan")
          .eq("tanggal_kembali", todayStr),
        supabase.from("peminjaman").select("denda").eq("status", "dikembalikan"),
      ]);

      const totalDenda = (dendaRes.data || []).reduce((sum, r) => sum + Number(r.denda || 0), 0);

      setStats({
        totalMenunggu: menungguRes.count || 0,
        totalTerlambat: terlambatRes.count || 0,
        dikembalikanHariIni: riwayatHariIniRes.count || 0,
        totalDenda,
      });
    } catch (err) {
      console.error("Gagal memuat statistik pengembalian:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refreshAll = () => {
    fetchData();
    fetchStats();
  };

  // ---------- Derived: tambahin telatHari ke data "menunggu" ----------
  const menungguDenganTelat = menunggu.map((item) => ({
    ...item,
    telatHari: hitungTelatHari(item.tanggalJatuhTempo),
  }));

  // ---------- Handlers ----------
  const openProsesModal = (item) => {
    setProsesTarget(item);
    setKondisi("Baik");
    setDenda(item.telatHari > 0 ? item.telatHari * DENDA_PER_HARI : 0);
    setCatatan("");
    setFormError("");
  };

  const closeProsesModal = () => {
    if (processing) return;
    setProsesTarget(null);
    setFormError("");
  };

  const handleKondisiChange = (e) => {
    const nilai = e.target.value;
    setKondisi(nilai);
    // Bantu isi ulang saran denda dasar kalau kondisi diubah, tetap bisa diedit manual
    if (nilai === "Baik" && prosesTarget) {
      setDenda(prosesTarget.telatHari > 0 ? prosesTarget.telatHari * DENDA_PER_HARI : 0);
    }
  };

  const handleProsesPengembalian = async (e) => {
    e.preventDefault();
    if (!prosesTarget) return;

    const dendaAngka = Number(denda);
    if (Number.isNaN(dendaAngka) || dendaAngka < 0) {
      setFormError("Nominal denda harus berupa angka yang valid.");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("peminjaman")
        .update({
          status: "dikembalikan",
          tanggal_kembali: toISODate(today),
          denda: dendaAngka,
          kondisi_buku: kondisi,
          catatan: catatan.trim() || null,
        })
        .eq("id", prosesTarget.id);

      if (error) throw error;

      setProsesTarget(null);
      setFormError("");
      refreshAll();
    } catch (err) {
      console.error(err);
      setFormError("Gagal memproses pengembalian. Coba lagi.");
    } finally {
      setProcessing(false);
    }
  };

  // ---------- Style helpers ----------
  const cardBg = darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBase = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
    darkMode
      ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-500 placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-800 focus:ring-blue-400 placeholder-gray-400"
  }`;
  const labelBase = `block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`;

  return (
    <div
      className={`min-h-full w-full p-4 sm:p-6 lg:p-8 ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto">
        {/* ===== Header ===== */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              darkMode ? "bg-blue-900" : "bg-blue-100"
            }`}
          >
            <RotateCcw
              className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? "text-blue-300" : "text-blue-700"}`}
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">Pengembalian</h1>
            <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Proses pengembalian buku &amp; denda keterlambatan
            </p>
          </div>
        </div>

        {/* ===== Stats ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Inbox size={16} className={darkMode ? "text-blue-300" : "text-blue-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Menunggu Dikembalikan
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalMenunggu}</p>
          </div>

          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock3 size={16} className={darkMode ? "text-red-300" : "text-red-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Sudah Terlambat
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalTerlambat}</p>
          </div>

          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2
                size={16}
                className={darkMode ? "text-emerald-300" : "text-emerald-600"}
              />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Dikembalikan Hari Ini
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.dikembalikanHariIni}</p>
          </div>

          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className={darkMode ? "text-orange-300" : "text-orange-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Total Denda Terkumpul
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{formatRupiah(stats.totalDenda)}</p>
          </div>
        </div>

        {/* ===== Tabs & Search ===== */}
        <div className={`rounded-xl border p-3 sm:p-4 mb-6 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari judul buku, nama peminjam, atau no. anggota..."
                className={`${inputBase} pl-9`}
              />
            </div>

            <div className="inline-flex rounded-lg p-1 bg-gray-100 dark:bg-gray-900/60 w-full sm:w-auto sm:flex-shrink-0">
              <button
                onClick={() => setTab("menunggu")}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === "menunggu"
                    ? "bg-blue-600 text-white"
                    : darkMode
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Inbox size={14} />
                Perlu Dikembalikan
              </button>
              <button
                onClick={() => setTab("riwayat")}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === "riwayat"
                    ? "bg-blue-600 text-white"
                    : darkMode
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <History size={14} />
                Riwayat Pengembalian
              </button>
            </div>
          </div>
        </div>

        {/* ===== Loading state ===== */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ===== TAB: Perlu Dikembalikan ===== */}
        {!loading && tab === "menunggu" && (
          <>
            {menungguDenganTelat.length === 0 ? (
              <div
                className={`rounded-xl border-2 border-dashed p-10 text-center ${
                  darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-300 bg-white"
                }`}
              >
                <CheckCircle2
                  size={32}
                  className={`mx-auto mb-2 ${darkMode ? "text-gray-600" : "text-gray-300"}`}
                />
                <p className="font-semibold mb-1">Tidak ada buku yang perlu dikembalikan</p>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Semua peminjaman aktif sudah diproses, atau coba ubah kata kunci pencarian.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className={`hidden md:block rounded-xl border overflow-hidden ${cardBg}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={darkMode ? "bg-gray-900/60" : "bg-gray-50"}>
                          <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                            Buku
                          </th>
                          <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                            Peminjam
                          </th>
                          <th className="text-left font-semibold px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                            Jatuh Tempo
                          </th>
                          <th className="text-center font-semibold px-4 py-3 whitespace-nowrap">
                            Status
                          </th>
                          <th className="text-right font-semibold px-4 py-3 whitespace-nowrap">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}
                      >
                        {menungguDenganTelat.map((item) => (
                          <tr
                            key={item.id}
                            className={darkMode ? "hover:bg-gray-700/40" : "hover:bg-gray-50"}
                          >
                            <td className="px-4 py-3 font-medium">{item.judulBuku}</td>
                            <td className="px-4 py-3">
                              <p>{item.namaPeminjam}</p>
                              <p
                                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                {item.noAnggota}
                              </p>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {formatTanggal(item.tanggalJatuhTempo)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.telatHari > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                  Telat {item.telatHari} hari
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  Tepat Waktu
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => openProsesModal(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors touch-manipulation active:scale-95"
                              >
                                <RotateCcw size={14} />
                                Proses Pengembalian
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {menungguDenganTelat.map((item) => (
                    <div key={item.id} className={`rounded-xl border p-4 ${cardBg}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold break-words">{item.judulBuku}</p>
                          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {item.namaPeminjam} · {item.noAnggota}
                          </p>
                        </div>
                        {item.telatHari > 0 ? (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            Telat {item.telatHari}h
                          </span>
                        ) : (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Tepat Waktu
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        <span className="font-medium">Jatuh Tempo:</span>{" "}
                        {formatTanggal(item.tanggalJatuhTempo)}
                      </p>
                      <button
                        onClick={() => openProsesModal(item)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors touch-manipulation active:scale-95"
                      >
                        <RotateCcw size={14} />
                        Proses Pengembalian
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ===== TAB: Riwayat Pengembalian ===== */}
        {!loading && tab === "riwayat" && (
          <>
            {riwayat.length === 0 ? (
              <div
                className={`rounded-xl border-2 border-dashed p-10 text-center ${
                  darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-300 bg-white"
                }`}
              >
                <History
                  size={32}
                  className={`mx-auto mb-2 ${darkMode ? "text-gray-600" : "text-gray-300"}`}
                />
                <p className="font-semibold mb-1">Belum ada riwayat pengembalian</p>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Riwayat akan muncul di sini setelah pengembalian diproses.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className={`hidden md:block rounded-xl border overflow-hidden ${cardBg}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={darkMode ? "bg-gray-900/60" : "bg-gray-50"}>
                          <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                            Buku
                          </th>
                          <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                            Peminjam
                          </th>
                          <th className="text-left font-semibold px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                            Tgl Kembali
                          </th>
                          <th className="text-center font-semibold px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                            Kondisi
                          </th>
                          <th className="text-center font-semibold px-4 py-3 whitespace-nowrap">
                            Telat
                          </th>
                          <th className="text-right font-semibold px-4 py-3 whitespace-nowrap">
                            Denda
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}
                      >
                        {riwayat.map((item) => (
                          <tr
                            key={item.id}
                            className={darkMode ? "hover:bg-gray-700/40" : "hover:bg-gray-50"}
                          >
                            <td className="px-4 py-3 font-medium">{item.judulBuku}</td>
                            <td className="px-4 py-3">
                              <p>{item.namaPeminjam}</p>
                              <p
                                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                {item.noAnggota}
                              </p>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {formatTanggal(item.tanggalKembali)}
                            </td>
                            <td className="px-4 py-3 text-center hidden lg:table-cell">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  darkMode
                                    ? "bg-gray-700 text-gray-200"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {item.kondisi}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.telatHari > 0 ? `${item.telatHari} hari` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {item.denda > 0 ? formatRupiah(item.denda) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {riwayat.map((item) => (
                    <div key={item.id} className={`rounded-xl border p-4 ${cardBg}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold break-words">{item.judulBuku}</p>
                          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {item.namaPeminjam} · {item.noAnggota}
                          </p>
                        </div>
                        <span
                          className={`flex-shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {item.kondisi}
                        </span>
                      </div>
                      <div
                        className={`grid grid-cols-2 gap-x-3 gap-y-1 text-xs ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        <p>
                          <span className="font-medium">Kembali:</span>{" "}
                          {formatTanggal(item.tanggalKembali)}
                        </p>
                        <p>
                          <span className="font-medium">Telat:</span>{" "}
                          {item.telatHari > 0 ? `${item.telatHari} hari` : "-"}
                        </p>
                        <p className="col-span-2">
                          <span className="font-medium">Denda:</span>{" "}
                          {item.denda > 0 ? formatRupiah(item.denda) : "Tidak ada"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ===== Modal Proses Pengembalian ===== */}
      {prosesTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-lg rounded-xl shadow-xl max-h-[90vh] overflow-y-auto ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <h2 className="text-base sm:text-lg font-bold">Proses Pengembalian</h2>
              <button
                onClick={closeProsesModal}
                className={`p-1.5 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProsesPengembalian} className="p-5 space-y-4">
              {formError && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-600"
                  }`}
                >
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div
                className={`rounded-lg p-3 text-sm ${darkMode ? "bg-gray-900/60" : "bg-gray-50"}`}
              >
                <p className="font-semibold">{prosesTarget.judulBuku}</p>
                <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                  {prosesTarget.namaPeminjam} · {prosesTarget.noAnggota}
                </p>
                <p className={`mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Jatuh tempo: {formatTanggal(prosesTarget.tanggalJatuhTempo)}
                  {prosesTarget.telatHari > 0 && (
                    <span className="text-red-500 font-medium">
                      {" "}
                      (Telat {prosesTarget.telatHari} hari)
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className={labelBase}>Kondisi Buku</label>
                <select value={kondisi} onChange={handleKondisiChange} className={inputBase}>
                  {KONDISI_BUKU.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelBase}>Denda (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={denda}
                  onChange={(e) => setDenda(e.target.value)}
                  className={inputBase}
                />
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Otomatis dihitung dari keterlambatan ({formatRupiah(DENDA_PER_HARI)}/hari).
                  Sesuaikan manual kalau buku rusak/hilang.
                </p>
              </div>

              <div>
                <label className={labelBase}>Catatan (opsional)</label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={2}
                  className={inputBase}
                  placeholder="Contoh: sampul sedikit terlipat"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeProsesModal}
                  disabled={processing}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                >
                  {processing ? "Memproses..." : "Konfirmasi Pengembalian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pengembalian;
