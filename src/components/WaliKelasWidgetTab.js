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

// ✅ Konstanta di luar komponen -- biar reference array-nya stabil antar
// render (kalau ditulis langsung inline di JSX, tiap render bikin array
// baru -> useCallback/useEffect di AnnouncementList mikir prop berubah
// terus -> infinite re-fetch).
const ADMIN_ANNOUNCEMENT_ROLES = ["teacher", "walikelas"];

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
      {/* Tab Switcher -- dikelompokin per lawan bicara (Admin | Siswa)
          biar keliatan jelas mana yang ngobrol sama siapa */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {SUB_TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isNewGroup = idx > 0 && SUB_TABS[idx - 1].group !== tab.group;

          return (
            <React.Fragment key={tab.id}>
              {isNewGroup && (
                <span className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
              )}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}>
                <Icon size={15} />
                {tab.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "dari-admin" ? (
        <AnnouncementList
          userId={currentUser?.id}
          userRole={ADMIN_ANNOUNCEMENT_ROLES}
        />
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
