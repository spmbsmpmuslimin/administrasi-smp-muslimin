// components/SaranMasukanSiswa.js (sesuaikan folder kalau beda sama
// DashboardHomeTeacher.js — file ini ditaruh 1 folder yang sama)
//
// Kebalikan dari PengumumanWaliKelas: kalau itu guru NULIS pengumuman
// buat siswa, ini guru MEMBACA saran/masukan yang dikirim siswa dari
// tabel `saran_masukan`. Difilter per kelas (classId = homeroom_class_id
// wali kelas yang lagi login).
//
// Klik badge status di tiap kartu buat siklus statusnya:
// baru -> dibaca -> ditindaklanjuti.
//
// TAMBAHAN biar gak numpuk kalau siswa banyak yang kirim saran:
// 1. Kartu yang statusnya udah "Ditindaklanjuti" otomatis gak
//    ditampilin lagi di sini (query-nya udah nge-exclude, bukan cuma
//    disembunyiin di layar) — datanya TETEP ada di database, cuma gak
//    nongol lagi di dashboard.
// 2. Ada tombol Hapus (ikon tempat sampah) di tiap kartu buat beres-
//    beres manual kapan aja, gak perlu nunggu status jadi
//    "Ditindaklanjuti" dulu (misal buat saran yang gak relevan/spam).
//    Ini beneran ngehapus barisnya dari database.
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Trash2 } from "lucide-react";

const STATUS_META = {
  baru: {
    label: "Baru",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
  dibaca: {
    label: "Dibaca",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  ditindaklanjuti: {
    label: "Ditindaklanjuti",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

const cycleStatus = (current) => {
  if (current === "baru") return "dibaca";
  return "ditindaklanjuti";
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SaranMasukanSiswa({ classId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!classId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("saran_masukan")
          .select(
            "id, message, status, created_at, users:student_id (full_name)",
          )
          .eq("class_id", classId)
          // Yang udah "Ditindaklanjuti" gak usah ikut ke-fetch — biar
          // dashboard gak numpuk kalau siswa yang kirim banyak.
          .neq("status", "ditindaklanjuti")
          .order("created_at", { ascending: false })
          .limit(30);

        if (err) throw err;
        setItems(data || []);
      } catch (err) {
        console.error("[SaranMasukanSiswa] Gagal ambil saran/masukan:", err);
        setError("Gagal memuat saran/masukan.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [classId]);

  const handleStatusClick = async (item) => {
    const nextStatus = cycleStatus(item.status);
    setUpdatingId(item.id);
    try {
      const { error: err } = await supabase
        .from("saran_masukan")
        .update({ status: nextStatus })
        .eq("id", item.id);

      if (err) throw err;

      if (nextStatus === "ditindaklanjuti") {
        // Langsung ilang dari daftar begitu ditandain selesai, gak
        // perlu nunggu re-fetch.
        setItems((prev) => prev.filter((it) => it.id !== item.id));
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: nextStatus } : it,
          ),
        );
      }
    } catch (err) {
      console.error("[SaranMasukanSiswa] Gagal update status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Hapus saran dari ${item.users?.full_name || "siswa ini"}? Aksi ini gak bisa dibatalin.`,
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      const { error: err } = await supabase
        .from("saran_masukan")
        .delete()
        .eq("id", item.id);

      if (err) throw err;
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err) {
      console.error("[SaranMasukanSiswa] Gagal hapus saran:", err);
      window.alert("Gagal hapus saran, coba lagi.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 sm:p-6 border border-slate-100 dark:border-slate-700 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center min-w-0">
          <span className="w-1 h-5 sm:h-6 bg-gradient-to-b from-sky-500 to-blue-500 rounded-full mr-3 shrink-0"></span>
          <span className="truncate">Saran/Masukan Siswa</span>
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 sm:py-10 text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Belum ada saran/masukan
          </p>
          <p className="text-sm">
            Saran dari siswa kelas ini bakal muncul di sini
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3 max-h-96 overflow-y-auto">
          {items.map((item) => {
            const meta = STATUS_META[item.status] || STATUS_META.baru;
            return (
              <div
                key={item.id}
                className="p-3 sm:p-4 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/30 rounded-xl border border-sky-100 dark:border-sky-900/50 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {item.users?.full_name || "Siswa"}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {item.message}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusClick(item)}
                    disabled={updatingId === item.id}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full disabled:opacity-50 ${meta.badge}`}>
                    {updatingId === item.id ? "Menyimpan..." : meta.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    title="Hapus saran ini"
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
