// [file name]: pages/PortalBackButton.js
// Pembungkus (wrapper) buat nambahin tombol "Kembali ke Portal Siswa" di atas
// halaman-halaman yang diakses lewat card Portal Siswa (PortalSiswaGuru.jsx),
// tanpa perlu edit isi komponen aslinya satu-satu.
//
// Cara pakai di menuConfig.js:
//   component: withPortalBackButton(CatatanSiswa)

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function withPortalBackButton(Component, backPath = "/portal-siswa-guru") {
  return function PageWithPortalBackButton(props) {
    const navigate = useNavigate();
    return (
      <div>
        <div className="px-4 pt-4 md:px-6 md:pt-6">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={16} />
            Kembali ke Portal Siswa
          </button>
        </div>
        <Component {...props} />
      </div>
    );
  };
}
