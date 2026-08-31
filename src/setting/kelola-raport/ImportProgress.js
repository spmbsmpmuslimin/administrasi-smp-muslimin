// setting/kelola-raport/ImportProgress.js
// Dipakai di ImportRaportForm.js selagi proses extract PDF berjalan (antara
// klik "Extract & Preview" dan hasilnya siap ditampilkan di
// PreviewImportTable.js). Murni presentational -- percent & log dikontrol
// dari ImportRaportForm.js (nanti idealnya di-update dari progress event /
// polling status extract di backend).

import React from "react";
import { Loader2 } from "lucide-react";

// percent: number (0-100)
// statusText: string -- ringkasan status saat ini, mis. "Membaca 24 dari 36 siswa..."
// log: string[] -- opsional, baris log tambahan (mis. peringatan per siswa)
const ImportProgress = ({ percent = 0, statusText = "Memproses...", log = [] }) => {
  return (
    <div className="py-8 space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{statusText}</span>
      </div>

      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full bg-teal-600 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{percent}%</p>

      {log.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 max-h-32 overflow-y-auto">
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImportProgress;
