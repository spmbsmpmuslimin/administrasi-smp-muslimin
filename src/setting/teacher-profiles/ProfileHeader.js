// [file name]: setting/teacher-profiles/ProfileHeader.js
// Header profil guru, versi ringkas:
//   Nama
//   @username
//   Guru <Mata Pelajaran>  •  Wali Kelas <kelas>   (baris peran)
//   [teacher_id] [tahun ajaran] [status]           (baris chip kecil)
//   [Hak Akses & Fitur Khusus -- admin saja]
//
// no_hp SENGAJA tidak ditampilkan di sini lagi -- dipindah ke
// PersonalInfoSection (tetap baca dari users.no_hp, bukan kolom baru).
import React from "react";
import { Shield, User, Calendar } from "lucide-react";
import Card from "../../components/ui/Card";
import { PageTitle, Text, Muted } from "../../components/ui/Typography";

const ROLE_LABEL = {
  admin: "Administrator",
  guru_bk: "Guru BK",
};

// Guru mata pelajaran biasa: "Guru <mapel1, mapel2>" dari mapel yang
// beneran diampu tahun ajaran aktif. Fallback ke label generik kalau
// belum ada penugasan sama sekali (guru baru/belum di-assign).
const buildRoleSummary = (role, teachingSubjects) => {
  if (ROLE_LABEL[role]) return ROLE_LABEL[role];
  if (teachingSubjects && teachingSubjects.length > 0) {
    return `Guru ${teachingSubjects.join(", ")}`;
  }
  return "Guru Mata Pelajaran";
};

const ROLE_TEXT_CLASS = {
  admin: "text-purple-700 dark:text-purple-300",
  guru_bk: "text-orange-700 dark:text-orange-300",
};
const getRoleTextClass = (role) => ROLE_TEXT_CLASS[role] || "text-blue-700 dark:text-blue-300";

// Chip kecil buat baris meta (teacher_id / tahun ajaran / status) -- dibikin
// sebagai badge terpisah, bukan teks disambung "•"/"-" panjang, biar rapi
// dan gampang wrap di layar sempit.
const MetaChip = ({ icon: Icon, dotClassName, children, darkMode }) => (
  <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-gray-700 px-2.5 py-1 rounded-lg">
    {Icon && <Icon size={12} className="text-blue-600 dark:text-blue-400" />}
    {dotClassName && <span className={`w-2 h-2 rounded-full ${dotClassName}`}></span>}
    <Muted darkMode={darkMode} className={Icon ? "font-mono" : ""}>
      {children}
    </Muted>
  </span>
);

const ProfileHeader = ({ profileData, activeAcademicInfo, teachingSubjects = [], darkMode }) => {
  const roleSummary = buildRoleSummary(profileData.role, teachingSubjects);
  const roleTextClass = getRoleTextClass(profileData.role);
  const hasHomeroom = Boolean(profileData.homeroom_class);

  return (
    <Card darkMode={darkMode} className="p-4 sm:p-5 md:p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
        {profileData.foto_url ? (
          <img
            src={profileData.foto_url}
            alt={profileData.full_name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover flex-shrink-0 border-4 border-white dark:border-gray-700 shadow-lg"
          />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 dark:bg-gray-600 rounded-full flex items-center justify-center text-blue-700 dark:text-gray-300 font-bold text-3xl sm:text-4xl flex-shrink-0 border-4 border-white dark:border-gray-700 shadow-lg">
            {profileData.full_name[0]}
          </div>
        )}

        <div className="flex-1 min-w-0 w-full">
          <PageTitle darkMode={darkMode} className="mb-0.5 text-xl sm:text-2xl md:text-3xl">
            {profileData.full_name}
          </PageTitle>
          <Text darkMode={darkMode} className="mb-2">
            @{profileData.username}
          </Text>

          {/* Baris peran: "Guru <mapel>" + "Wali Kelas <kelas>" */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-0.5 text-sm sm:text-base font-semibold mb-3">
            <span className={roleTextClass}>{roleSummary}</span>
            {hasHomeroom && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-blue-700 dark:text-blue-300">
                  Wali Kelas {profileData.homeroom_class.id}
                </span>
              </>
            )}
          </div>

          {/* Baris chip: teacher_id, tahun ajaran, status */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {profileData.teacher_id && (
              <MetaChip icon={User} darkMode={darkMode}>
                {profileData.teacher_id}
              </MetaChip>
            )}
            {activeAcademicInfo?.displayText && (
              <MetaChip icon={Calendar} darkMode={darkMode}>
                {activeAcademicInfo.displayText}
              </MetaChip>
            )}
            <MetaChip
              dotClassName={
                profileData.is_active
                  ? "bg-green-500 dark:bg-green-400"
                  : "bg-gray-400 dark:bg-gray-500"
              }
              darkMode={darkMode}
            >
              {profileData.is_active ? "Aktif" : "Nonaktif"}
            </MetaChip>
          </div>
        </div>
      </div>

      {/* Hak Akses & Fitur Khusus -- khusus admin */}
      {profileData.role === "admin" && (
        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-blue-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-purple-600 dark:text-purple-400" />
            <Text darkMode={darkMode} className="font-bold">
              Hak Akses Administrator
            </Text>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-blue-50 dark:bg-gray-700/50 rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600">
              <Text darkMode={darkMode} className="font-bold mb-2">
                Hak Akses
              </Text>
              <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 space-y-1.5">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Kelola semua user & role
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Akses data lengkap sistem
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Konfigurasi akademik
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Monitoring aktivitas
                </li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-gray-700/50 rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600">
              <Text darkMode={darkMode} className="font-bold mb-2">
                Fitur Khusus
              </Text>
              <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 space-y-1.5">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Lihat profil semua user
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Edit & hapus user
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Generate laporan
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Backup & restore data
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProfileHeader;
