// components/JurnalHarian.js
//
// Cara pakai di parent (misal App.js), setelah user login dan userData
// (hasil dari Login.js) tersimpan di state/Context/localStorage:
//
//   <JurnalHarian user={userData} onShowToast={showToast} />
//
// user wajib punya minimal: { id, teacher_id, full_name }

import React, { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  ListChecks,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const todayStr = () => new Date().toISOString().slice(0, 10);

export const JurnalHarian = ({ user, onShowToast }) => {
  const [activeTab, setActiveTab] = useState("isi"); // "isi" | "riwayat"

  // ---- state: pilihan assignment ----
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  // ---- state: form jurnal ----
  const [jamKe, setJamKe] = useState("");
  const [materi, setMateri] = useState("");
  const [kegiatan, setKegiatan] = useState("");
  const [kendala, setKendala] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ---- state: riwayat ----
  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

  const notify = (msg, type = "info") => {
    if (onShowToast) onShowToast(msg, type);
  };

  // Ambil daftar penugasan guru (exclude "Harian" karena itu khusus wali kelas)
  const fetchAssignments = useCallback(async () => {
    if (!user?.teacher_id) return;
    setLoadingAssignments(true);
    const { data, error } = await supabase
      .from("teacher_assignments")
      .select("*")
      .eq("teacher_id", user.teacher_id)
      .neq("subject", "Harian")
      .order("class_id", { ascending: true });

    if (error) {
      notify("Gagal memuat daftar kelas: " + error.message, "error");
    } else {
      setAssignments(data || []);
    }
    setLoadingAssignments(false);
  }, [user?.teacher_id]);

  const fetchRiwayat = useCallback(async () => {
    if (!user?.id) return;
    setLoadingRiwayat(true);
    const { data, error } = await supabase
      .from("jurnal_harian")
      .select("*")
      .eq("user_id", user.id)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      notify("Gagal memuat riwayat jurnal: " + error.message, "error");
    } else {
      setRiwayat(data || []);
    }
    setLoadingRiwayat(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (activeTab === "riwayat") fetchRiwayat();
  }, [activeTab, fetchRiwayat]);

  const selectedAssignment = assignments.find(
    (a) => a.id === selectedAssignmentId,
  );

  const resetForm = () => {
    setSelectedAssignmentId("");
    setJamKe("");
    setMateri("");
    setKegiatan("");
    setKendala("");
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedAssignment) {
      setFormError("Pilih kelas & mapel terlebih dahulu");
      return;
    }
    if (!materi.trim()) {
      setFormError("Materi/topik yang diajarkan wajib diisi");
      return;
    }

    setSubmitting(true);

    const payload = {
      user_id: user.id,
      teacher_id: user.teacher_id,
      assignment_id: selectedAssignment.id,
      class_id: selectedAssignment.class_id,
      subject: selectedAssignment.subject,
      academic_year_id: selectedAssignment.academic_year_id,
      semester: selectedAssignment.semester,
      tanggal: todayStr(),
      jam_ke: jamKe || null,
      materi: materi.trim(),
      kegiatan_pembelajaran: kegiatan.trim() || null,
      kendala_catatan: kendala.trim() || null,
    };

    const { error } = await supabase.from("jurnal_harian").insert(payload);

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setFormError(
          "Jurnal untuk kelas & mapel ini hari ini sudah pernah diisi.",
        );
      } else {
        setFormError("Gagal menyimpan jurnal: " + error.message);
      }
      return;
    }

    notify("Jurnal harian berhasil disimpan", "success");
    resetForm();
    if (activeTab === "riwayat") fetchRiwayat();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            Jurnal Harian Mengajar
          </h1>
          <p className="text-sm text-slate-500">{user?.full_name || "Guru"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("isi")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "isi"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}>
          Isi Jurnal
        </button>
        <button
          onClick={() => setActiveTab("riwayat")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "riwayat"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}>
          Riwayat
        </button>
      </div>

      {activeTab === "isi" ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          {/* Pilih kelas & mapel */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Kelas & Mata Pelajaran
            </label>

            {loadingAssignments ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat daftar kelas...
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-sm text-slate-500 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Tidak ada penugasan mengajar ditemukan untuk akun ini.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {assignments.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAssignmentId(a.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-colors ${
                      selectedAssignmentId === a.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}>
                    <div className="font-bold">{a.class_id}</div>
                    <div className="text-xs opacity-80 truncate">
                      {a.subject}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedAssignment && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 bg-slate-50 rounded-lg text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="font-medium text-slate-600">
                  Kelas {selectedAssignment.class_id} —{" "}
                  {selectedAssignment.subject}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Jam ke- (opsional)
                  </label>
                  <input
                    type="text"
                    value={jamKe}
                    onChange={(e) => setJamKe(e.target.value)}
                    placeholder="mis. 1-2"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Materi / Topik yang diajarkan{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={materi}
                    onChange={(e) => setMateri(e.target.value)}
                    placeholder="mis. Simple Present Tense - latihan soal"
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Kegiatan pembelajaran (opsional)
                  </label>
                  <textarea
                    value={kegiatan}
                    onChange={(e) => setKegiatan(e.target.value)}
                    placeholder="mis. Diskusi kelompok, latihan soal mandiri"
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Kendala / Catatan (opsional)
                  </label>
                  <textarea
                    value={kendala}
                    onChange={(e) => setKendala(e.target.value)}
                    placeholder="mis. Ada 2 siswa belum mengumpulkan tugas"
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Simpan Jurnal
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loadingRiwayat ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat riwayat...
            </div>
          ) : riwayat.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm flex flex-col items-center gap-2">
              <ListChecks className="w-8 h-8 opacity-40" />
              Belum ada jurnal yang diisi
            </div>
          ) : (
            riwayat.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-blue-600">
                    Kelas {r.class_id} — {r.subject}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(r.tanggal).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {r.jam_ke ? ` • Jam ${r.jam_ke}` : ""}
                  </span>
                </div>
                <p className="text-sm text-slate-700 font-medium">{r.materi}</p>
                {r.kegiatan_pembelajaran && (
                  <p className="text-xs text-slate-500 mt-1">
                    {r.kegiatan_pembelajaran}
                  </p>
                )}
                {r.kendala_catatan && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {r.kendala_catatan}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default JurnalHarian;
