//[file name]: HomeVisitModal.js
import React, { useState, useEffect, useMemo } from "react";
import { X, Save, Loader2 } from "lucide-react";

// ⚠️ ASUMSI PATH: sesuaikan kalau lokasi supabaseClient beda
import { supabase } from "../../supabaseClient";

// ============================================================
// Modal Tambah / Edit Home Visit.
// Nulis ke tabel `homevisits`. Dropdown "Kelas" ditarik dari
// `classes` (props: classesList, cuma yang aktif). Dropdown
// "Nama Siswa" ditarik dari `students` (props: studentsList).
//
// ⚠️ ASUMSI (gampang diubah, tinggal edit array *_OPTIONS di bawah):
// - jenis_kunjungan: Rutin / Insidental / Tindak Lanjut
// - kategori_permasalahan: daftar umum di bawah
//
// ❌ TIDAK ADA konsep "Petugas" sama sekali di sini — tidak ada field,
// tidak disimpan, tidak diambil dari user yang login. Kalau tabel
// `homevisits` di Supabase masih punya kolom petugas_id/nama_petugas,
// kolom itu tidak lagi diisi dari modal ini (tetap null/default).
// ============================================================

const JENIS_KUNJUNGAN_OPTIONS = ["Kunjungan Awal", "Tindak Lanjut", "Lainnya"];

const KATEGORI_OPTIONS = [
  "Kehadiran",
  "Kedisiplinan",
  "Akademik",
  "Perilaku",
  "Permasalahan Keluarga",
  "Tindak Lanjut Konseling",
  "Lainnya",
];

const STATUS_OPTIONS = ["Terjadwal", "Selesai", "Perlu Tindak Lanjut", "Dibatalkan"];

const emptyForm = {
  student_id: null,
  nama_siswa: "",
  nis: "",
  kelas: "",
  tanggal_kunjungan: "",
  jenis_kunjungan: JENIS_KUNJUNGAN_OPTIONS[0],
  kategori_permasalahan: KATEGORI_OPTIONS[0],
  alasan: "",
  alamat_kunjungan: "",
  nama_pihak_ditemui: "",
  hubungan_pihak_ditemui: "",
  hasil_kondisi_info: "",
  hasil_diskusi: "",
  status: STATUS_OPTIONS[0],
};

const HomeVisitModal = ({
  isOpen,
  mode = "tambah", // "tambah" | "edit"
  initialData = null,
  classesList = [],
  studentsList = [], // dari tabel `students` (id, nis, full_name, gender, class_id)
  onClose,
  onSaved,
  darkMode = false,
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ---------- Filter siswa: Jenjang -> Kelas -> Nama Siswa ----------
  const [jenjang, setJenjang] = useState("");

  // ---------- Search box "Pilih Siswa" (ganti dropdown scroll biasa) ----------
  const [studentQuery, setStudentQuery] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // ---------- Detail siswa dari tabel `student_profile_details` ----------
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ---------- Isi ulang form tiap kali modal dibuka ----------
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg("");
    if (mode === "edit" && initialData) {
      setFormData({
        ...emptyForm,
        ...initialData,
      });
      // Coba tebak jenjang dari kelas yang tersimpan (mis. "7A" -> "7")
      const kelasAwal = initialData.kelas || "";
      const kelasData = classesList.find((c) => c.id === kelasAwal);
      setJenjang(kelasData ? String(kelasData.grade) : "");
    } else {
      setFormData(emptyForm);
      setJenjang("");
    }
    setStudentQuery("");
    setShowStudentDropdown(false);
    setStudentProfile(null);
  }, [isOpen, mode, initialData, classesList]);

  // ---------- Opsi kelas aktif, difilter berdasarkan jenjang terpilih ----------
  const kelasOptionsByJenjang = useMemo(() => {
    if (!jenjang) return [];
    return classesList
      .filter((c) => c.is_active && String(c.grade) === String(jenjang))
      .map((c) => c.id)
      .sort();
  }, [classesList, jenjang]);

  // ---------- Opsi siswa: difilter berdasarkan kelas terpilih + kata kunci pencarian ----------
  const filteredStudents = useMemo(() => {
    if (!formData.kelas) return [];
    const kw = studentQuery.trim().toLowerCase();
    return studentsList
      .filter((s) => String(s.class_id) === String(formData.kelas))
      .filter((s) => !kw || (s.full_name || "").toLowerCase().includes(kw))
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [studentsList, formData.kelas, studentQuery]);

  // ---------- Tarik detail siswa (alamat, ortu, dll) dari `student_profile_details` ----------
  // tiap kali siswa yang dipilih berubah (baik pilih baru, maupun pas buka mode edit).
  useEffect(() => {
    if (!isOpen || !formData.student_id) {
      setStudentProfile(null);
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    supabase
      .from("student_profile_details")
      .select("*")
      .eq("student_id", formData.student_id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        const profile = error ? null : data;
        setStudentProfile(profile);
        setLoadingProfile(false);
        // Auto-isi Alamat Kunjungan dari alamat rumah siswa, cuma kalau
        // field-nya masih kosong (gak nimpa yang udah diisi manual).
        if (profile?.alamat) {
          setFormData((prev) =>
            prev.alamat_kunjungan ? prev : { ...prev, alamat_kunjungan: profile.alamat }
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, formData.student_id]);

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // ---------- Ganti jenjang -> reset kelas & siswa terpilih ----------
  const handleJenjangChange = (e) => {
    const val = e.target.value;
    setJenjang(val);
    setFormData((prev) => ({
      ...prev,
      kelas: "",
      student_id: null,
      nama_siswa: "",
      nis: "",
    }));
    setStudentQuery("");
  };

  // ---------- Ganti kelas -> reset siswa terpilih ----------
  const handleKelasChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      kelas: val,
      student_id: null,
      nama_siswa: "",
      nis: "",
    }));
    setStudentQuery("");
  };

  // ---------- Ketik di search box siswa ----------
  const handleStudentQueryChange = (e) => {
    setStudentQuery(e.target.value);
    setShowStudentDropdown(true);
    // Kalau lagi ngetik ulang, anggap pilihan sebelumnya batal sampai pilih lagi
    if (formData.student_id) {
      setFormData((prev) => ({ ...prev, student_id: null, nama_siswa: "", nis: "" }));
    }
  };

  // ---------- Pilih siswa dari hasil pencarian -> auto-isi nama & nis ----------
  const handleStudentSelect = (siswa) => {
    setFormData((prev) => ({
      ...prev,
      student_id: siswa.id,
      nama_siswa: siswa.full_name,
      nis: siswa.nis,
    }));
    setStudentQuery("");
    setShowStudentDropdown(false);
  };

  const validate = () => {
    if (!formData.student_id) return "Siswa wajib dipilih.";
    if (!formData.kelas) return "Kelas wajib dipilih.";
    if (!formData.tanggal_kunjungan) return "Tanggal kunjungan wajib diisi.";
    if (!formData.alasan.trim()) return "Alasan kunjungan wajib diisi.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSaving(true);
    setErrorMsg("");

    // Siapkan payload sesuai kolom tabel `homevisits`
    const payload = {
      student_id: formData.student_id || null,
      nama_siswa: formData.nama_siswa.trim(),
      nis: formData.nis.trim() || null,
      kelas: formData.kelas,
      tanggal_kunjungan: formData.tanggal_kunjungan,
      jenis_kunjungan: formData.jenis_kunjungan,
      kategori_permasalahan: formData.kategori_permasalahan,
      alasan: formData.alasan.trim() || null,
      alamat_kunjungan: formData.alamat_kunjungan.trim() || null,
      nama_pihak_ditemui: formData.nama_pihak_ditemui.trim() || null,
      hubungan_pihak_ditemui: formData.hubungan_pihak_ditemui.trim() || null,
      hasil_kondisi_info: formData.hasil_kondisi_info.trim() || null,
      hasil_diskusi: formData.hasil_diskusi.trim() || null,
      status: formData.status,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (mode === "edit" && initialData?.id) {
      ({ error } = await supabase.from("homevisits").update(payload).eq("id", initialData.id));
    } else {
      ({ error } = await supabase.from("homevisits").insert([payload]));
    }

    setSaving(false);

    if (error) {
      setErrorMsg("Gagal menyimpan data: " + error.message);
      return;
    }

    onSaved?.();
    onClose?.();
  };

  // ---------- Style helpers ----------
  const cardBg = darkMode ? "bg-gray-800 border-theme" : "bg-theme-bg border-theme";
  const inputBase = `w-full rounded-lg border px-3.5 py-2.5 text-base focus:outline-none focus:ring-2 transition-colors ${
    darkMode
      ? "bg-theme-bg border-theme text-gray-100 focus:ring-blue-500 placeholder-gray-500"
      : "bg-theme-bg border-theme text-theme focus:ring-blue-400 placeholder-gray-400"
  }`;
  const labelBase = `block text-sm font-medium mb-1.5 ${darkMode ? "text-gray-300" : "text-theme-secondary"}`;
  const sectionTitle = `text-base font-semibold mb-3 pb-2 border-b ${
    darkMode ? "border-theme text-gray-200" : "border-theme text-theme-secondary"
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-4xl max-h-[92vh] rounded-xl shadow-xl flex flex-col ${cardBg}`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b flex-shrink-0 ${
            darkMode ? "border-theme" : "border-theme"
          }`}
        >
          <h3 className="font-bold text-xl sm:text-2xl">
            {mode === "edit" ? "Edit Home Visit" : "Tambah Home Visit"}
          </h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-theme-surface text-theme-secondary"
            }`}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 overflow-y-auto flex-1 space-y-7">
            {errorMsg && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  darkMode
                    ? "bg-red-900/20 border-red-800/40 text-red-300"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {errorMsg}
              </div>
            )}

            {/* Section: Data Siswa & Jadwal */}
            <div>
              <p className={sectionTitle}>Data Siswa & Jadwal</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelBase}>Jenjang *</label>
                  <select
                    value={jenjang}
                    onChange={handleJenjangChange}
                    className={inputBase}
                    required
                  >
                    <option value="">Pilih Jenjang</option>
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>
                </div>
                <div>
                  <label className={labelBase}>Kelas *</label>
                  <select
                    value={formData.kelas}
                    onChange={handleKelasChange}
                    className={inputBase}
                    disabled={!jenjang}
                    required
                  >
                    <option value="">Pilih Kelas</option>
                    {kelasOptionsByJenjang.map((kelas) => (
                      <option key={kelas} value={kelas}>
                        {kelas}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className={labelBase}>Nama Siswa *</label>
                  <input
                    type="text"
                    value={formData.student_id ? formData.nama_siswa : studentQuery}
                    onChange={handleStudentQueryChange}
                    onFocus={() => setShowStudentDropdown(true)}
                    onBlur={() => setTimeout(() => setShowStudentDropdown(false), 150)}
                    className={inputBase}
                    disabled={!formData.kelas}
                    placeholder={formData.kelas ? "Ketik nama siswa..." : "Pilih kelas dulu"}
                    autoComplete="off"
                    required
                  />
                  {/* Validasi wajib-isi ditangani oleh validate() di JS (bukan atribut HTML,
                      karena input berbentuk hidden gak ikut constraint validation browser). */}

                  {showStudentDropdown && formData.kelas && (
                    <div
                      className={`absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border shadow-lg ${
                        darkMode ? "bg-gray-800 border-theme" : "bg-theme-bg border-theme"
                      }`}
                    >
                      {filteredStudents.length === 0 ? (
                        <p
                          className={`px-3 py-2 text-sm ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}
                        >
                          {studentQuery
                            ? `Tidak ada siswa bernama "${studentQuery}" di kelas ini.`
                            : "Belum ada data siswa untuk kelas ini di tabel `students`."}
                        </p>
                      ) : (
                        filteredStudents.map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onMouseDown={() => handleStudentSelect(s)}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              darkMode
                                ? "hover:bg-gray-700 text-gray-100"
                                : "hover:bg-blue-50 text-theme"
                            }`}
                          >
                            {s.full_name}
                            {s.nis && (
                              <span className={darkMode ? "text-gray-400" : "text-theme-secondary"}>
                                {" "}
                                · NIS {s.nis}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Kartu detail siswa: data dasar + `student_profile_details` */}
                {formData.student_id && (
                  <div
                    className={`sm:col-span-3 rounded-lg border p-4 ${
                      darkMode ? "bg-white/50 border-theme" : "bg-theme-surface border-theme"
                    }`}
                  >
                    {loadingProfile ? (
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}>
                        Memuat data siswa...
                      </p>
                    ) : (
                      (() => {
                        const jk =
                          studentProfile?.jenis_kelamin === "L"
                            ? "Laki-laki"
                            : studentProfile?.jenis_kelamin === "P"
                              ? "Perempuan"
                              : studentProfile?.jenis_kelamin;

                        const rows = [
                          ["Nama", formData.nama_siswa],
                          ["NIS", formData.nis],
                          [
                            "Tempat, Tanggal Lahir",
                            [studentProfile?.tempat_lahir, studentProfile?.tanggal_lahir]
                              .filter(Boolean)
                              .join(", "),
                          ],
                          ["Jenis Kelamin", jk],
                          ["Sekolah Asal", studentProfile?.sekolah_asal],
                          ["Nama Ayah", studentProfile?.nama_ayah],
                          ["Nama Ibu", studentProfile?.nama_ibu],
                          ["No HP Orangtua", studentProfile?.no_hp_ortu],
                          ["Alamat", studentProfile?.alamat],
                        ];

                        return (
                          <div className="space-y-1.5">
                            {rows.map(([label, value]) => (
                              <div key={label} className="flex text-sm">
                                <span
                                  className={`w-44 flex-shrink-0 ${
                                    darkMode ? "text-gray-400" : "text-theme-secondary"
                                  }`}
                                >
                                  {label}
                                </span>
                                <span
                                  className={`mr-2 flex-shrink-0 ${
                                    darkMode ? "text-gray-400" : "text-theme-secondary"
                                  }`}
                                >
                                  :
                                </span>
                                <span
                                  className={`font-semibold ${
                                    value
                                      ? darkMode
                                        ? "text-gray-200"
                                        : "text-theme-secondary"
                                      : darkMode
                                        ? "text-theme-secondary"
                                        : "text-gray-400"
                                  }`}
                                >
                                  {value || "-"}
                                </span>
                              </div>
                            ))}
                            {!studentProfile && (
                              <p
                                className={`text-xs pt-1.5 ${
                                  darkMode ? "text-amber-400" : "text-amber-600"
                                }`}
                              >
                                Siswa ini belum punya data di `student_profile_details` sama sekali
                                — semua field di atas kosong.
                              </p>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelBase}>Tanggal Kunjungan *</label>
                    <input
                      type="date"
                      value={formData.tanggal_kunjungan}
                      onChange={handleChange("tanggal_kunjungan")}
                      className={inputBase}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Jenis Kunjungan</label>
                    <select
                      value={formData.jenis_kunjungan}
                      onChange={handleChange("jenis_kunjungan")}
                      className={inputBase}
                    >
                      {JENIS_KUNJUNGAN_OPTIONS.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Permasalahan */}
            <div>
              <p className={sectionTitle}>Permasalahan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>Kategori Permasalahan</label>
                  <select
                    value={formData.kategori_permasalahan}
                    onChange={handleChange("kategori_permasalahan")}
                    className={inputBase}
                  >
                    {KATEGORI_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelBase}>Status</label>
                  <select
                    value={formData.status}
                    onChange={handleChange("status")}
                    className={inputBase}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelBase}>Alasan Kunjungan *</label>
                  <textarea
                    value={formData.alasan}
                    onChange={handleChange("alasan")}
                    className={inputBase}
                    rows={3}
                    placeholder="Contoh: Kehadiran siswa di bawah 70% dalam 1 bulan terakhir"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section: Hasil Kunjungan (opsional saat tambah baru) */}
            <div>
              <p className={sectionTitle}>Hasil Kunjungan (isi jika kunjungan sudah berlangsung)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelBase}>Alamat Kunjungan</label>
                  <input
                    type="text"
                    value={formData.alamat_kunjungan}
                    onChange={handleChange("alamat_kunjungan")}
                    className={inputBase}
                    placeholder="Contoh: Jl. Merdeka No. 12, RT 03/RW 05, Kel. Sukamaju"
                  />
                </div>
                <div>
                  <label className={labelBase}>Nama Pihak yang Ditemui</label>
                  <input
                    type="text"
                    value={formData.nama_pihak_ditemui}
                    onChange={handleChange("nama_pihak_ditemui")}
                    className={inputBase}
                    placeholder="Contoh: Ibu Siti Aminah"
                  />
                </div>
                <div>
                  <label className={labelBase}>Hubungan dengan Siswa</label>
                  <input
                    type="text"
                    value={formData.hubungan_pihak_ditemui}
                    onChange={handleChange("hubungan_pihak_ditemui")}
                    className={inputBase}
                    placeholder="Contoh: Ibu Kandung, Wali"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelBase}>Kondisi & Informasi yang Didapat</label>
                  <textarea
                    value={formData.hasil_kondisi_info}
                    onChange={handleChange("hasil_kondisi_info")}
                    className={inputBase}
                    rows={3}
                    placeholder="Contoh: Siswa tinggal bersama nenek karena orang tua bekerja di luar kota. Kondisi rumah sederhana, tidak ada akses internet untuk belajar daring."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelBase}>Hasil Diskusi</label>
                  <textarea
                    value={formData.hasil_diskusi}
                    onChange={handleChange("hasil_diskusi")}
                    className={inputBase}
                    rows={3}
                    placeholder="Contoh: Orang tua/wali berkomitmen mengantar siswa ke sekolah setiap hari mulai minggu depan. Sekolah akan pantau kehadiran selama 2 minggu ke depan."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`flex items-center justify-end gap-3 px-6 py-5 border-t flex-shrink-0 ${
              darkMode ? "border-theme" : "border-theme"
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`px-5 py-3 rounded-lg font-medium text-base transition-colors disabled:opacity-50 ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  : "bg-theme-surface hover:bg-gray-200 text-theme-secondary"
              }`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-medium text-base bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Simpan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HomeVisitModal;
