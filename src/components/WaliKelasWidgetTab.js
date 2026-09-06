// WaliKelasWidgetTab.js
// Gabungan 4 widget komunikasi wali kelas jadi 1 card, disusun grid 2x2
// biar seimbang (bukan flex-wrap 1 baris yang bisa "pecah" di layar sempit):
//
//   [Dari Admin] [Ke Admin]
//   [Dari Siswa] [Ke Siswa]
//
// Kolom kiri = "Dari" (pesan masuk), kolom kanan = "Ke" (pesan keluar).
// Baris 1 = urusan Admin, baris 2 = urusan Siswa.
//
// Semua tab bentuknya LIST/FORM biasa -- gak ada satupun yang modal/popup
// lagi, biar konsisten dan gak bikin bingung kayak sebelumnya (dulu
// "Dari Admin" itu modal maksa muncul, sekarang jadi tab list biasa).
//
// Widget yang udah ada (PengumumanWaliKelas, SaranMasukanSiswa,
// FeedbackGuru) dipakai APA ADANYA, gak diubah logic/isinya -- cuma
// AnnouncementPopup yang diganti jadi AnnouncementList (versi non-modal).
import React, { useState } from "react";
import { Inbox, Send, Megaphone, MessageCircle } from "lucide-react";
import AnnouncementList from "./AnnouncementList";
import FeedbackGuru from "./FeedbackGuru";
import PengumumanWaliKelas from "./PengumumanWaliKelas";
import SaranMasukanSiswa from "./SaranMasukanSiswa";

// Konstanta di luar komponen -- biar reference array-nya stabil antar
// render (kalau ditulis langsung inline di JSX, tiap render bikin array
// baru -> useCallback/useEffect di AnnouncementList mikir prop berubah
// terus -> infinite re-fetch).
const ADMIN_ANNOUNCEMENT_ROLES = ["teacher", "walikelas"];

// Urutan sengaja 2x2: baris 1 pasangan Admin (Dari-Ke), baris 2 pasangan
// Siswa (Dari-Ke) -- posisi di grid (bukan divider manual) yang nunjukin
// pengelompokannya sekarang.
const SUB_TABS = [
  { id: "dari-admin", label: "Dari Admin", icon: Inbox },
  { id: "ke-admin", label: "Ke Admin", icon: Send },
  { id: "saran", label: "Dari Siswa", icon: MessageCircle },
  { id: "pengumuman", label: "Ke Siswa", icon: Megaphone },
];

// currentUser : { id, teacher_id, homeroom_class_id, ... } -- objek user yang
// login, dioper dari HomeroomTeacherDashboard.js
const WaliKelasWidgetTab = ({ classId, teacherId, currentUser, darkMode }) => {
  const [activeTab, setActiveTab] = useState("dari-admin");

  return (
    <div>
      {/* Tab Switcher -- grid 2 kolom x 2 baris, seimbang di semua ukuran layar */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 touch-manipulation active:scale-[0.98] min-h-[44px] ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : darkMode
                    ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "dari-admin" ? (
        <AnnouncementList userId={currentUser?.id} userRole={ADMIN_ANNOUNCEMENT_ROLES} />
      ) : activeTab === "ke-admin" ? (
        <FeedbackGuru guruId={teacherId} />
      ) : activeTab === "saran" ? (
        <SaranMasukanSiswa classId={classId} />
      ) : (
        <PengumumanWaliKelas classId={classId} teacherId={teacherId} />
      )}
    </div>
  );
};

export default WaliKelasWidgetTab;
