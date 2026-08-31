import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Bungkus komponen halaman dengan tombol "Kembali ke Portal Siswa" di atasnya.
// Dipakai di menuConfig.js untuk route yang diakses lewat card Portal Siswa,
// tanpa perlu edit isi komponen aslinya satu-satu.
export function withPortalBack(Component, backPath = "/portal-siswa-guru") {
  return function WithPortalBack(props) {
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
