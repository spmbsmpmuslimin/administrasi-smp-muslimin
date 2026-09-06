// [file name]: setting/teacher-profiles/SecuritySection.js
// Kolom kiri halaman Profile: "Keamanan Akun" (wrapper ChangePasswordSection
// yang sudah ada di src/setting/) + "Tampilan" (toggle dark mode). Murni
// presentational, ChangePasswordSection sendiri yang pegang logic ganti
// password (username, nama guru, password lama/baru/konfirmasi -- lihat
// implementasi di ChangePasswordSection.js).
import React from "react";
import { Mail } from "lucide-react";
import Card from "../../components/ui/Card";
import { SectionTitle } from "../../components/ui/Typography";
import ChangePasswordSection from "../ChangePasswordSection";

// Tampilan/dark mode toggle sudah dihapus dari sini (17 Sep revisi) --
// tinggal 1 card "Ubah Password" doang.
const SecuritySection = ({ user, darkMode }) => {
  return (
    <Card darkMode={darkMode}>
      <SectionTitle darkMode={darkMode} className="flex items-center gap-2">
        <Mail size={18} className="text-red-500" />
        Ubah Password
      </SectionTitle>
      <ChangePasswordSection user={user} />
    </Card>
  );
};

export default SecuritySection;
