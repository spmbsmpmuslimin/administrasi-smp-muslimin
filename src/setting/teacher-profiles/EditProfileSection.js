// [file name]: setting/teacher-profiles/EditProfileSection.js
// Isi Tab 2 "Isi / Edit Data" di halaman Manajemen Profil Guru -- ADMIN
// ONLY (guard-nya di ProfileTab.js, bukan di sini). Form ini nulis ke 2
// tempat:
//   - users.no_hp                         (UPDATE by userId)
//   - teacher_profiles.* + foto_url        (UPSERT by teacher_id)
// Foto di-upload ke Supabase Storage dulu, baru URL publiknya disimpen ke
// kolom foto_url.
//
// ASUMSI yang perlu dicek ke skema asli:
//   1. Nama bucket storage foto: "teacher-photos" (public). Ganti kalau beda.
//   2. teacher_profiles.teacher_id UNIQUE/PK -- dipake buat onConflict upsert.
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Save, Loader2, Camera, User as UserIcon } from "lucide-react";
import Card from "../../components/ui/Card";
import { SectionTitle, Text, Muted } from "../../components/ui/Typography";

const PHOTO_BUCKET = "teacher-photos";

const JENIS_KELAMIN_OPTIONS = [
  { value: "", label: "-- Pilih --" },
  { value: "L", label: "Laki-laki" },
  { value: "P", label: "Perempuan" },
];

const PENDIDIKAN_OPTIONS = [
  { value: "", label: "-- Pilih --" },
  { value: "SMA", label: "SMA" },
  { value: "D3", label: "D3" },
  { value: "S1", label: "S1" },
  { value: "S2", label: "S2" },
];

// 1 field form: label di atas, input di bawah -- pola form standar, beda
// dari mode "Label : Value" yang dipake pas view-only di PersonalInfoSection.
const FormField = ({ label, darkMode, children }) => (
  <div>
    <Muted darkMode={darkMode} className="block mb-1.5 font-medium">
      {label}
    </Muted>
    {children}
  </div>
);

const inputClass =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 " +
  "text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm sm:text-base " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const EditProfileSection = ({
  teacherId,
  userId,
  fullName,
  noHp,
  teacherProfile,
  darkMode,
  showToast,
  onSaved,
}) => {
  const [form, setForm] = useState({
    no_hp: "",
    nuptk: "",
    jenis_kelamin: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    pendidikan_terakhir: "",
    alamat: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Sync form tiap kali data sumbernya berubah (misal abis kesimpen &
  // ProfileTab reload, atau pindah ke profil guru lain).
  useEffect(() => {
    setForm({
      no_hp: noHp || "",
      nuptk: teacherProfile?.nuptk || "",
      jenis_kelamin: teacherProfile?.jenis_kelamin || "",
      tempat_lahir: teacherProfile?.tempat_lahir || "",
      tanggal_lahir: teacherProfile?.tanggal_lahir || "",
      pendidikan_terakhir: teacherProfile?.pendidikan_terakhir || "",
      alamat: teacherProfile?.alamat || "",
    });
    setPhotoPreview(teacherProfile?.foto_url || null);
    setPhotoFile(null);
  }, [teacherId, userId, noHp, teacherProfile]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teacherId) {
      showToast("teacher_id tidak ditemukan, tidak bisa menyimpan", "error");
      return;
    }

    setSaving(true);
    try {
      let fotoUrl = teacherProfile?.foto_url || null;

      // 1. Upload foto baru (kalau ada) ke storage
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${teacherId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

        fotoUrl = publicUrlData?.publicUrl || fotoUrl;
      }

      // 2. Upsert teacher_profiles
      const { error: upsertError } = await supabase.from("teacher_profiles").upsert(
        {
          teacher_id: teacherId,
          nuptk: form.nuptk || null,
          jenis_kelamin: form.jenis_kelamin || null,
          tempat_lahir: form.tempat_lahir || null,
          tanggal_lahir: form.tanggal_lahir || null,
          pendidikan_terakhir: form.pendidikan_terakhir || null,
          alamat: form.alamat || null,
          foto_url: fotoUrl,
        },
        { onConflict: "teacher_id" }
      );

      if (upsertError) throw upsertError;

      // 3. Update no_hp di tabel users
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ no_hp: form.no_hp || null })
        .eq("id", userId);

      if (userUpdateError) throw userUpdateError;

      showToast("Data profil berhasil disimpan", "success");
      await onSaved?.();
    } catch (err) {
      console.error("Error saving teacher profile:", err);
      showToast(`Gagal menyimpan data: ${err.message || "terjadi kesalahan"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card darkMode={darkMode}>
      <SectionTitle darkMode={darkMode} className="flex items-center gap-2">
        <Save size={18} className="text-blue-600 dark:text-blue-400" />
        Isi / Edit Data Profil
      </SectionTitle>
      <Text darkMode={darkMode} className="mb-5 -mt-2">
        Form ini buat admin/TU input atau perbarui data pribadi guru. Perubahan langsung kesimpen ke
        data profil guru yang bersangkutan.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Foto */}
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt={fullName}
              className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-gray-600 flex items-center justify-center text-blue-700 dark:text-gray-300 flex-shrink-0 border-4 border-white dark:border-gray-700 shadow-md">
              <UserIcon size={28} />
            </div>
          )}
          <div>
            <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-blue-300 dark:border-gray-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <Camera size={14} />
              Ganti Foto
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            <Muted darkMode={darkMode} className="block mt-1">
              JPG/PNG, disarankan foto formal
            </Muted>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <FormField label="No. HP" darkMode={darkMode}>
            <input
              type="tel"
              className={inputClass}
              value={form.no_hp}
              onChange={handleChange("no_hp")}
              placeholder="+6281234567890"
            />
          </FormField>

          <FormField label="NUPTK" darkMode={darkMode}>
            <input
              type="text"
              className={inputClass}
              value={form.nuptk}
              onChange={handleChange("nuptk")}
              placeholder="Nomor NUPTK"
            />
          </FormField>

          <FormField label="Jenis Kelamin" darkMode={darkMode}>
            <select
              className={inputClass}
              value={form.jenis_kelamin}
              onChange={handleChange("jenis_kelamin")}
            >
              {JENIS_KELAMIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Tempat Lahir" darkMode={darkMode}>
            <input
              type="text"
              className={inputClass}
              value={form.tempat_lahir}
              onChange={handleChange("tempat_lahir")}
              placeholder="Kota kelahiran"
            />
          </FormField>

          <FormField label="Tanggal Lahir" darkMode={darkMode}>
            <input
              type="date"
              className={inputClass}
              value={form.tanggal_lahir}
              onChange={handleChange("tanggal_lahir")}
            />
          </FormField>

          <FormField label="Pendidikan Terakhir" darkMode={darkMode}>
            <select
              className={inputClass}
              value={form.pendidikan_terakhir}
              onChange={handleChange("pendidikan_terakhir")}
            >
              {PENDIDIKAN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Alamat" darkMode={darkMode}>
            <textarea
              className={`${inputClass} min-h-[44px]`}
              rows={2}
              value={form.alamat}
              onChange={handleChange("alamat")}
              placeholder="Alamat lengkap"
            />
          </FormField>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium text-sm sm:text-base transition-colors disabled:opacity-50 min-h-[44px] w-full sm:w-auto justify-center"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={16} />
                Simpan Data
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  );
};

export default EditProfileSection;
