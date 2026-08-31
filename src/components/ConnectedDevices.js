// components/ConnectedDevices.js
//
// Halaman "Perangkat Terhubung" — nampilin semua device yang pernah
// dipake siswa buat login (dari tabel student_devices), device yang
// lagi dipake sekarang dikasih badge hijau "Perangkat Ini", device lain
// bisa dihapus riwayatnya lewat tombol merah "Hapus".
//
// PENTING: tombol "Hapus" cuma ngapus catatan riwayat, BUKAN paksa
// logout device itu secara real-time. Detail alasannya ada di komentar
// utils/studentDevices.js.
//
// Cara pakai (contoh wiring di App.js):
//   <ConnectedDevices studentId={session.id} onBack={() => setPage("beranda")} />

import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Smartphone } from "lucide-react";
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
    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get(
      "minute",
    )} WIB`;
  } catch (err) {
    console.error("[ConnectedDevices] Gagal format tanggal:", err);
    return "-";
  }
}

export const ConnectedDevices = ({ studentId, onBack }) => {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    const data = await getStudentDevices(studentId);
    setDevices(data);
    setIsLoading(false);
  }, [studentId]);

  useEffect(() => {
    setCurrentDeviceId(getOrCreateDeviceId());
    loadDevices();
  }, [loadDevices]);

  const handleDelete = async (row) => {
    const label =
      [row.brand, row.model].filter(Boolean).join(" - ") || "device ini";
    const confirmed = window.confirm(
      `Hapus riwayat "${label}"? Ini cuma ngapus catatannya — kalau device itu masih login, dia gak akan otomatis ke-logout.`,
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

  return (
    <div className="min-h-screen bg-theme-surface">
      {/* Header */}
      <div className="bg-blue-900 px-4 py-4 flex items-center gap-4 shadow-md sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          aria-label="Kembali">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">
          Perangkat Terhubung
        </h1>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {isLoading && (
          <div className="text-center text-gray-400 py-10 text-sm">
            Memuat daftar device...
          </div>
        )}

        {!isLoading && devices.length === 0 && (
          <div className="text-center text-gray-400 py-10 text-sm">
            Belum ada riwayat device.
          </div>
        )}

        {!isLoading &&
          devices.map((row) => {
            const isThisDevice = row.device_id === currentDeviceId;
            return (
              <div
                key={row.id}
                className="bg-theme-bg border border-theme rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <Smartphone className="text-blue-400" size={26} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-theme uppercase tracking-wide text-sm">
                      {row.brand || "Tidak diketahui"}
                    </p>
                    <p className="text-theme-secondary text-sm truncate">
                      {row.model || "-"}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {formatWIB(row.last_login_at)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-3">
                  {isThisDevice ? (
                    <span className="bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-full">
                      Perangkat Ini
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(row)}
                      disabled={deletingId === row.id}
                      className="bg-red-400 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">
                      {deletingId === row.id ? "Menghapus..." : "Hapus"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ConnectedDevices;
