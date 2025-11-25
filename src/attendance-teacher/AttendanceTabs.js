// src/attendance-teacher/AttendanceTabs.js
import React, { useState } from "react";
import { QrCode, Edit3, Sparkles, Activity, History } from "lucide-react";
import QRScanner from "./QRScanner";
import ManualCheckIn from "./ManualCheckIn";
import QRCodeGenerator from "./QRCodeGenerator";
import MyAttendanceStatus from "./MyAttendanceStatus";
import MyMonthlyHistory from "./MyMonthlyHistory";

const AttendanceTabs = ({ currentUser, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("qr");

  // Define tabs berdasarkan role
  const tabs = [
    {
      id: "qr",
      label: "Scan QR",
      icon: QrCode,
      roles: ["teacher", "guru_bk", "admin"], // Semua bisa scan
    },
    {
      id: "manual",
      label: "Input Manual",
      icon: Edit3,
      roles: ["admin"], // Hanya admin yang bisa input manual
    },
    {
      id: "status",
      label: "Status Hari Ini",
      icon: Activity,
      roles: ["teacher", "guru_bk", "admin"], // Semua bisa lihat status
    },
    {
      id: "history",
      label: "Riwayat",
      icon: History,
      roles: ["teacher", "guru_bk", "admin"], // Semua bisa lihat riwayat
    },
    {
      id: "generate",
      label: "Generate QR",
      icon: Sparkles,
      roles: ["admin"], // Hanya admin yang bisa generate QR
    },
  ];

  // Filter tabs berdasarkan role user
  const visibleTabs = tabs.filter((tab) =>
    tab.roles.includes(currentUser?.role)
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Tab Navigation - Improved Design */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center justify-center gap-2 px-6 py-4 
                font-medium transition-all whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}>
              <Icon size={18} />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "qr" && (
          <QRScanner currentUser={currentUser} onSuccess={onSuccess} />
        )}
        {activeTab === "manual" && (
          <ManualCheckIn currentUser={currentUser} onSuccess={onSuccess} />
        )}
        {activeTab === "status" && (
          <MyAttendanceStatus currentUser={currentUser} />
        )}
        {activeTab === "history" && (
          <MyMonthlyHistory currentUser={currentUser} />
        )}
        {activeTab === "generate" && <QRCodeGenerator />}
      </div>
    </div>
  );
};

export default AttendanceTabs;
