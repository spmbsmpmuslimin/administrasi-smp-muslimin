// src/attendance-teacher/AttendanceTabs.js
import React, { useState } from "react";
import { QrCode, Edit3, Sparkles } from "lucide-react";
import QRScanner from "./QRScanner";
import ManualCheckIn from "./ManualCheckIn";
import QRCodeGenerator from "./QRCodeGenerator";

const AttendanceTabs = ({ currentUser, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("qr"); // qr, manual, generate

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Tab Header */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("qr")}
          className={`flex-1 py-3 px-4 font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "qr"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}>
          <QrCode size={20} />
          Scan QR
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-3 px-4 font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "manual"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}>
          <Edit3 size={20} />
          Input Manual
        </button>
        <button
          onClick={() => setActiveTab("generate")}
          className={`flex-1 py-3 px-4 font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "generate"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}>
          <Sparkles size={20} />
          Generate QR
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "qr" && (
          <QRScanner currentUser={currentUser} onSuccess={onSuccess} />
        )}
        {activeTab === "manual" && (
          <ManualCheckIn currentUser={currentUser} onSuccess={onSuccess} />
        )}
        {activeTab === "generate" && <QRCodeGenerator />}
      </div>
    </div>
  );
};

export default AttendanceTabs;
