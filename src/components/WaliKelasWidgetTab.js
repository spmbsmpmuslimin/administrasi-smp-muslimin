// WaliKelasWidgetTab.js
// Gabungan 4 widget komunikasi wali kelas jadi 1 card, 4 tab:
//
//   [Dari Admin] [Ke Admin]  |  [Ke Siswa] [Dari Siswa]
//        urusan Admin              urusan Siswa
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

const SUB_TABS = [
  { id: "dari-admin", label: "Dari Admin", icon: Inbox, group: "admin" },
  { id: "ke-admin", label: "Ke Admin", icon: Send, group: "admin" },
  { id: "pengumuman", label: "Ke Siswa", icon: Megaphone, group: "siswa" },
  { id: "saran", label: "Dari Siswa", icon: MessageCircle, group: "siswa" },
];

// currentUser : { id, teacher_id, homeroom_class_id, ... } -- objek user yang
// login, dioper dari HomeroomTeacherDashboard.js
const WaliKelasWidgetTab = ({ classId, teacherId, currentUser }) => {
  const [activeTab, setActiveTab] = useState("dari-admin");

  return (
    <div>
      {/* Tab Switcher -- grid biar seimbang: 2x2 rapi di HP, 1 baris 4 kolom
          di layar lebih lebar (sm ke atas). Sebelumnya flex-wrap bisa numpuk
          gak rata (misal 3 tab baris pertama, 1 tab nyempil sendirian). */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}>
              <Icon size={15} className="shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "dari-admin" ? (
        <AnnouncementList userId={currentUser?.id} userRole="walikelas" />
      ) : activeTab === "ke-admin" ? (
        <FeedbackGuru guruId={teacherId} />
      ) : activeTab === "pengumuman" ? (
        <PengumumanWaliKelas classId={classId} teacherId={teacherId} />
      ) : (
        <SaranMasukanSiswa classId={classId} />
      )}
    </div>
  );
};

export default WaliKelasWidgetTab;
