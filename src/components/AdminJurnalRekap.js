// components/AdminJurnalRekap.js
//
// Cara pakai di parent (khusus role admin/kepsek):
//
//   <AdminJurnalRekap onShowToast={showToast} />

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ClipboardList,
  Calendar,
  Search,
  Loader2,
  Users,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const todayStr = () => new Date().toISOString().slice(0, 10);

export const AdminJurnalRekap = ({ onShowToast }) => {
  const [tanggal, setTanggal] = useState(todayStr());
  const [kelasFilter, setKelasFilter] = useState("");
  const [kelasOptions, setKelasOptions] = useState([]);

  const [jurnalList, setJurnalList] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);

  const notify = (msg, type = "info") => {
    if (onShowToast) onShowToast(msg, type);
  };

  // Ambil daftar kelas unik (dari teacher_assignments, biar lengkap walau belum ada jurnal)
  useEffect(() => {
    const fetchKelas = async () => {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("class_id")
        .neq("subject", "Harian");
      if (!error && data) {
        const unique = [...new Set(data.map((d) => d.class_id))].sort();
        setKelasOptions(unique);
      }
    };
    fetchKelas();
  }, []);

  const fetchJurnal = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("jurnal_harian")
      .select("*, users:user_id(full_name, teacher_id)")
      .eq("tanggal", tanggal)
      .order("class_id", { ascending: true });

    if (kelasFilter) query = query.eq("class_id", kelasFilter);

    const { data, error } = await query;

    if (error) {
      notify("Gagal memuat rekap jurnal: " + error.message, "error");
      setJurnalList([]);
      setLoading(false);
      return;
    }

    setJurnalList(data || []);

    // Ambil data presensi mapel buat tanggal & kelas yang relevan, lalu agregasi di client
    if (data && data.length > 0) {
      const classIds = [...new Set(data.map((j) => j.class_id))];
      const { data: attData, error: attError } = await supabase
        .from("attendances")
        .select("teacher_id, class_id, subject, status")
        .eq("date", tanggal)
        .eq("type", "mapel")
        .in("class_id", classIds);

      if (!attError && attData) {
        const map = {};
        attData.forEach((row) => {
          const key = `${row.teacher_id}|${row.class_id}|${row.subject}`;
          if (!map[key]) {
            map[key] = { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 };
          }
          map[key].total += 1;
          if (row.status === "Hadir") map[key].hadir += 1;
          else if (row.status === "Izin") map[key].izin += 1;
          else if (row.status === "Sakit") map[key].sakit += 1;
          else if (row.status === "Alfa") map[key].alfa += 1;
        });
        setAttendanceMap(map);
      }
    } else {
      setAttendanceMap({});
    }

    setLoading(false);
  }, [tanggal, kelasFilter]);

  useEffect(() => {
    fetchJurnal();
  }, [fetchJurnal]);

  const summary = useMemo(() => {
    return {
      totalJurnal: jurnalList.length,
      totalKelas: new Set(jurnalList.map((j) => j.class_id)).size,
      totalGuru: new Set(jurnalList.map((j) => j.user_id)).size,
    };
  }, [jurnalList]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            Rekap Jurnal Harian Mengajar
          </h1>
          <p className="text-sm text-slate-500">Semua guru</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
        <div className="relative flex-1">
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="w-full appearance-none pl-3 pr-9 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-theme-bg">
            <option value="">Semua kelas</option>
            {kelasOptions.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-theme-bg border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-indigo-600">
            {summary.totalJurnal}
          </div>
          <div className="text-xs text-slate-500">Jurnal masuk</div>
        </div>
        <div className="bg-theme-bg border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-indigo-600">
            {summary.totalKelas}
          </div>
          <div className="text-xs text-slate-500">Kelas tercatat</div>
        </div>
        <div className="bg-theme-bg border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-indigo-600">
            {summary.totalGuru}
          </div>
          <div className="text-xs text-slate-500">Guru mengisi</div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Memuat data...
        </div>
      ) : jurnalList.length === 0 ? (
        <div className="text-center py-14 text-slate-400 text-sm flex flex-col items-center gap-2">
          <Search className="w-8 h-8 opacity-40" />
          Belum ada jurnal untuk tanggal & kelas ini
        </div>
      ) : (
        <div className="space-y-3">
          {jurnalList.map((j) => {
            const key = `${j.teacher_id}|${j.class_id}|${j.subject}`;
            const att = attendanceMap[key];
            return (
              <div
                key={j.id}
                className="bg-theme-bg border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      {j.users?.full_name || j.teacher_id}
                    </div>
                    <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                      Kelas {j.class_id} — {j.subject}
                      {j.jam_ke ? ` • Jam ${j.jam_ke}` : ""}
                    </div>
                  </div>
                  {att ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      {att.hadir}/{att.total} hadir
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300 flex-shrink-0">
                      Presensi belum ada
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-700">{j.materi}</p>

                {j.kegiatan_pembelajaran && (
                  <p className="text-xs text-slate-500 mt-1">
                    {j.kegiatan_pembelajaran}
                  </p>
                )}

                {j.kendala_catatan && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {j.kendala_catatan}
                  </p>
                )}

                {att && att.total > 0 && (
                  <div className="flex gap-3 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>Hadir: {att.hadir}</span>
                    <span>Izin: {att.izin}</span>
                    <span>Sakit: {att.sakit}</span>
                    <span>Alfa: {att.alfa}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminJurnalRekap;
