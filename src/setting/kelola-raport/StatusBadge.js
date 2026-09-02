// setting/kelola-raport/StatusBadge.js
// Dipakai di PreviewImportTable.js (status extract: Valid/Perlu Diperiksa/
// Gagal Dibaca) dan di ManajemenRaportTable.js + DetailRaportSiswa.js
// (status publish: Draft/Published). Satu komponen, dua "type" beda konfig
// warna & label -- ga ada logic lain selain nampilin label sesuai status.
//
// Dokumentasi terkait: bag. 7 (status Draft/Published) & bag. 10 (status
// validasi import: ✓ Valid / ⚠ Perlu Diperiksa / ✕ Gagal Dibaca).

import React from "react";
import {
  Check,
  AlertTriangle,
  X,
  FileEdit,
  Globe,
  AlertCircle,
} from "lucide-react";

const IMPORT_CONFIG = {
  valid: {
    label: "Valid",
    icon: Check,
    className:
      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  warning: {
    label: "Perlu Diperiksa",
    icon: AlertTriangle,
    className:
      "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  failed: {
    label: "Gagal Dibaca",
    icon: X,
    className:
      "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  },
};

const PUBLISH_CONFIG = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    className:
      "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
  },
  published: {
    label: "Published",
    icon: Globe,
    className:
      "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
};

// Status kelulusan siswa kelas 9 -- dihitung di RekapKelulusan.js
// (computeStatusKelulusan), berdasarkan KKM per mapel + batas minimum
// Nilai Akhir yang diisi TU di KelolaKKM.js.
const KELULUSAN_CONFIG = {
  lulus: {
    label: "Lulus",
    icon: Check,
    className:
      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  tidak_lulus: {
    label: "Tidak Lulus",
    icon: X,
    className:
      "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  belum_lengkap: {
    label: "Belum Lengkap",
    icon: AlertCircle,
    className:
      "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
};

// type: "import" | "publish" | "kelulusan"
// status: "valid" | "warning" | "failed"        (kalau type="import")
//         "draft" | "published"                 (kalau type="publish")
//         "lulus" | "tidak_lulus" | "belum_lengkap" (kalau type="kelulusan")
const StatusBadge = ({ type = "import", status }) => {
  const config =
    type === "publish"
      ? PUBLISH_CONFIG[status]
      : type === "kelulusan"
        ? KELULUSAN_CONFIG[status]
        : IMPORT_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
