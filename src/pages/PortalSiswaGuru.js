// [file name]: pages/PortalSiswaGuru.jsx
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  FileEdit,
  ClipboardList,
  ClipboardCheck,
  LayoutGrid,
  Network,
} from "lucide-react";

// path di bawah HARUS match dengan menuConfig.js
const menuItems = [
  {
    title: "Profile Siswa",
    description: "Lihat dan kelola data profil siswa",
    icon: CheckCircle,
    path: "/student-profile-completion",
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Catatan Siswa",
    description: "Catatan perkembangan & pelanggaran siswa",
    icon: FileEdit,
    path: "/catatan-siswa",
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Jadwal Pelajaran",
    description: "Jadwal pelajaran per kelas",
    icon: ClipboardList,
    path: "/kelola-jadwal-pelajaran",
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Jadwal Piket",
    description: "Jadwal piket kebersihan kelas",
    icon: ClipboardCheck,
    path: "/jadwal-piket",
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Denah Duduk",
    description: "Tata letak tempat duduk siswa di kelas",
    icon: LayoutGrid,
    path: "/denah-duduk",
    color: "bg-pink-100 text-pink-600",
  },
  {
    title: "Organigram",
    description: "Struktur organisasi kelas",
    icon: Network,
    path: "/organigram",
    color: "bg-indigo-100 text-indigo-600",
  },
];

export default function PortalSiswaGuru({ user, onShowToast, darkMode }) {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-1">Portal Siswa</h1>
      <p className="text-sm text-slate-500 mb-6">
        Akses cepat ke seluruh data dan aktivitas siswa di kelas Anda
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.path)}
              className="group text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm
                         hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5
                         transition-all duration-200 flex flex-col gap-3"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}
              >
                <Icon size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm md:text-base group-hover:text-blue-600">
                  {item.title}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
