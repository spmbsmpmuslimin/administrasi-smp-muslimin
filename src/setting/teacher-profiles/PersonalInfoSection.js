// [file name]: setting/teacher-profiles/PersonalInfoSection.js
// Section "Informasi Pribadi" guru: No. HP, NUPTK, jenis kelamin, tempat/
// tanggal lahir, pendidikan terakhir, alamat.
// No. HP TETAP dibaca dari users.no_hp (bukan kolom baru di
// teacher_profiles) -- cuma dipindah tampilannya ke sini dari header.
// Field lain dari tabel teacher_profiles (terpisah dari users -- lihat
// catatan skema di teacher_profiles.sql). Versi ini VIEW-ONLY dulu; form
// edit menyusul belakangan.
import React from "react";
import { Phone, IdCard, VenusAndMars, MapPin, Cake, Home, GraduationCap } from "lucide-react";
import Card from "../../components/ui/Card";
import { SectionTitle, Text, Muted } from "../../components/ui/Typography";

// Format tanggal lahir "1990-05-12" -> "12 Mei 1990". Kalau null/kosong,
// biarin ditangani di pemanggil (tampilin "-").
const formatTanggalLahir = (tanggal) => {
  if (!tanggal) return null;
  const date = new Date(tanggal);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const JENIS_KELAMIN_LABEL = {
  L: "Laki-laki",
  P: "Perempuan",
};

// 1 baris field: ikon + "Label : Value" sebaris. Lebar kolom label dibikin
// tetap (w-28/w-36) biar titik dua-nya rata ke bawah di semua field, baik
// di grid 1 kolom (HP) maupun 2 kolom (desktop).
const InfoField = ({ icon: Icon, label, value, darkMode }) => (
  <div className="flex items-center gap-3">
    <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-2 flex-shrink-0">
      <Icon size={16} className="text-blue-600 dark:text-blue-400" />
    </div>
    <div className="flex items-baseline gap-1 min-w-0 flex-1">
      <Muted darkMode={darkMode} className="w-28 sm:w-36 flex-shrink-0 text-sm sm:text-base">
        {label}
      </Muted>
      <Muted darkMode={darkMode} className="flex-shrink-0 text-sm sm:text-base">
        :
      </Muted>
      <Text darkMode={darkMode} className="font-medium min-w-0 break-words text-sm sm:text-base">
        {value || "-"}
      </Text>
    </div>
  </div>
);

const PersonalInfoSection = ({ teacherProfile, noHp, darkMode }) => {
  const profile = teacherProfile || {};

  return (
    <Card darkMode={darkMode}>
      <SectionTitle darkMode={darkMode} className="flex items-center gap-2">
        <IdCard size={18} className="text-blue-600 dark:text-blue-400" />
        Informasi Pribadi
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <InfoField icon={Phone} label="No. HP" value={noHp} darkMode={darkMode} />
        <InfoField icon={IdCard} label="NUPTK" value={profile.nuptk} darkMode={darkMode} />
        <InfoField
          icon={VenusAndMars}
          label="Jenis Kelamin"
          value={JENIS_KELAMIN_LABEL[profile.jenis_kelamin]}
          darkMode={darkMode}
        />
        <InfoField
          icon={MapPin}
          label="Tempat Lahir"
          value={profile.tempat_lahir}
          darkMode={darkMode}
        />
        <InfoField
          icon={Cake}
          label="Tanggal Lahir"
          value={formatTanggalLahir(profile.tanggal_lahir)}
          darkMode={darkMode}
        />
        <InfoField
          icon={GraduationCap}
          label="Pendidikan Terakhir"
          value={profile.pendidikan_terakhir}
          darkMode={darkMode}
        />
        <InfoField icon={Home} label="Alamat Lengkap" value={profile.alamat} darkMode={darkMode} />
      </div>
    </Card>
  );
};

export default PersonalInfoSection;
