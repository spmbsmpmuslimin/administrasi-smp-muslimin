// [file name]: setting/teacher-profiles/AdminTeacherDataTab.js
// Isi Tab "Isi Data Guru" di halaman Manajemen Profil -- ADMIN ONLY.
// Beda sama tab "Informasi" (yang nampilin profil MILIK YANG LAGI LOGIN),
// di sini admin PILIH guru mana dulu yang mau diisi/diupdate datanya, baru
// form (EditProfileSection) nyesuain ke guru yang dipilih.
//
// Kenapa perlu ini: akun admin sendiri biasanya gak punya teacher_id
// (bukan berstatus guru), jadi kalau form editnya cuma ngandelin profil
// admin yang lagi login, gak akan ada apa-apa yang bisa disimpen.
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Search, Loader2, UserCog } from "lucide-react";
import Card from "../../components/ui/Card";
import { SectionTitle, Text } from "../../components/ui/Typography";
import EditProfileSection from "./EditProfileSection";

const AdminTeacherDataTab = ({ darkMode, showToast }) => {
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load daftar guru: semua users yang punya teacher_id (berarti berstatus
  // guru, terlepas dari role spesifiknya guru_bk/guru mapel/dll).
  useEffect(() => {
    const loadTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, teacher_id, no_hp")
          .not("teacher_id", "is", null)
          .order("full_name", { ascending: true });

        if (error) throw error;
        setTeachers(data || []);
      } catch (err) {
        console.error("Error loading teacher list:", err);
        showToast("Gagal memuat daftar guru", "error");
      } finally {
        setLoadingTeachers(false);
      }
    };
    loadTeachers();
  }, [showToast]);

  const selectedTeacher = teachers.find((t) => t.id === selectedUserId) || null;

  // Load teacher_profiles punya guru yang lagi dipilih
  const loadSelectedTeacherProfile = useCallback(
    async (teacherId) => {
      if (!teacherId) {
        setSelectedTeacherProfile(null);
        return;
      }
      setLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from("teacher_profiles")
          .select(
            "nuptk, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, pendidikan_terakhir, foto_url"
          )
          .eq("teacher_id", teacherId)
          .maybeSingle();

        if (error) throw error;
        setSelectedTeacherProfile(data);
      } catch (err) {
        console.error("Error loading selected teacher profile:", err);
        showToast("Gagal memuat data guru terpilih", "error");
        setSelectedTeacherProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadSelectedTeacherProfile(selectedTeacher?.teacher_id);
  }, [selectedTeacher?.teacher_id, loadSelectedTeacherProfile]);

  const filteredTeachers = teachers.filter((t) =>
    (t.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card darkMode={darkMode}>
        <SectionTitle darkMode={darkMode} className="flex items-center gap-2">
          <UserCog size={18} className="text-blue-600 dark:text-blue-400" />
          Pilih Guru
        </SectionTitle>
        <Text darkMode={darkMode} className="mb-4 -mt-2">
          Pilih guru yang mau diisi atau diperbarui datanya.
        </Text>

        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Cari nama guru..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loadingTeachers ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-3">
            <Loader2 size={16} className="animate-spin" />
            Memuat daftar guru...
          </div>
        ) : (
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">-- Pilih Guru ({filteredTeachers.length}) --</option>
            {filteredTeachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        )}
      </Card>

      {loadingProfile && (
        <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          <Loader2 size={18} className="animate-spin mr-2" />
          Memuat data guru...
        </div>
      )}

      {selectedTeacher && !loadingProfile && (
        <EditProfileSection
          key={selectedTeacher.id}
          teacherId={selectedTeacher.teacher_id}
          userId={selectedTeacher.id}
          fullName={selectedTeacher.full_name}
          noHp={selectedTeacher.no_hp}
          teacherProfile={selectedTeacherProfile}
          darkMode={darkMode}
          showToast={showToast}
          onSaved={() => loadSelectedTeacherProfile(selectedTeacher.teacher_id)}
        />
      )}
    </div>
  );
};

export default AdminTeacherDataTab;
