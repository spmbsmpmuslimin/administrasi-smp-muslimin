// students/StudentPerangkatTerhubung.js
//
// Konten menu "Perangkat Terhubung" di StudentAkun.js. Sengaja gak
// pake header/tombol "Kembali" sendiri — itu udah disediain sama
// wrapper di StudentAkun.js (activeMenu detail view).
//
// PENTING: tombol "Hapus" cuma ngapus baris riwayat device dari
// database, BUKAN paksa logout device itu (lihat komentar lengkap
// di utils/studentDevices.js).

import React, { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import {
  getStudentDevices,
  deleteStudentDevice,
  getOrCreateDeviceId,
} from "../utils/studentDevices";

function formatWIB(isoString) {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")} WIB`;
  } catch (err) {
    console.error("[StudentPerangkatTerhubung] Gagal format tanggal:", err);
    return "-";
  }
}

export default function StudentPerangkatTerhubung({ student }) {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  const loadDevices = useCallback(async () => {
    if (!student?.id) return;
    setIsLoading(true);
    const data = await getStudentDevices(student.id);
    setDevices(data);
    setIsLoading(false);
  }, [student?.id]);

  useEffect(() => {
    setCurrentDeviceId(getOrCreateDeviceId());
    loadDevices();
  }, [loadDevices]);

  if (!student?.id) {
    return (
      <div className="text-center py-10 text-sm text-theme-secondary">
        Sesi tidak ketemu. Silakan login ulang.
      </div>
    );
  }

  const handleDelete = async (row) => {
    const label = [row.brand, row.model].filter(Boolean).join(" - ") || "device ini";
    const confirmed = window.confirm(
      `Hapus riwayat "${label}"? Ini cuma ngapus catatannya — kalau device itu masih login, dia gak akan otomatis ke-logout.`
    );
    if (!confirmed) return;

    setDeletingId(row.id);
    const ok = await deleteStudentDevice(row.id);
    setDeletingId(null);

    if (ok) {
      setDevices((prev) => prev.filter((d) => d.id !== row.id));
    } else {
      window.alert("Gagal hapus riwayat device, coba lagi.");
    }
  };

  if (isLoading) {
    return <div className="text-center text-theme-secondary py-10 text-sm">Memuat daftar device...</div>;
  }

  if (devices.length === 0) {
    return <div className="text-center text-theme-secondary py-10 text-sm">Belum ada riwayat device.</div>;
  }

  return (
    <div className="space-y-3">
      {devices.map((row) => {
        const isThisDevice = row.device_id === currentDeviceId;
        return (
          <div key={row.id} className="bg-theme-bg border border-gray-100 rounded-xl p-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 flex items-center justify-center shrink-0">
                <Smartphone className="text-cyan-500" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-theme uppercase tracking-wide text-sm">
                  {row.brand || "Tidak diketahui"}
                </p>
                <p className="text-theme-secondary text-sm truncate">{row.model || "-"}</p>
                <p className="text-theme-secondary text-sm mt-1">{formatWIB(row.last_login_at)}</p>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              {isThisDevice ? (
                <span className="bg-green-500 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                  Perangkat Ini
                </span>
              ) : (
                <button
                  onClick={() => handleDelete(row)}
                  disabled={deletingId === row.id}
                  className="bg-red-400 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold px-3 py-1.5 rounded-full transition-colors"
                >
                  {deletingId === row.id ? "Menghapus..." : "Hapus"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
