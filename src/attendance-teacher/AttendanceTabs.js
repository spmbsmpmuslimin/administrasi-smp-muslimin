// src/attendance-teacher/AttendanceTabs.js
import React, { useState } from "react";
import { QrCode, Edit3, Sparkles } from "lucide-react";
import QRScanner from "./QRScanner";
import ManualCheckIn from "./ManualCheckIn";
import QRCodeGenerator from "./QRCodeGenerator";

const AttendanceTabs = ({ currentUser, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("qr");

  // Conditional tabs based on role
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Tab Header - Mobile Responsive */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
        {/* TAB 1: SCAN QR */}
        <button
          onClick={() => setActiveTab("qr")}
          className={`
            flex-1 py-3 px-3 sm:px-4 font-semibold transition-all 
            flex items-center justify-center gap-1.5 sm:gap-2
            text-xs sm:text-sm whitespace-nowrap
            min-h-[44px]
            ${
              activeTab === "qr"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }
          `}>
          <QrCode size={16} className="sm:w-5 sm:h-5" />
          Scan QR
        </button>

        {/* TAB 2: INPUT MANUAL - SEMUA BISA! */}
        <button
          onClick={() => setActiveTab("manual")}
          className={`
            flex-1 py-3 px-3 sm:px-4 font-semibold transition-all 
            flex items-center justify-center gap-1.5 sm:gap-2
            text-xs sm:text-sm whitespace-nowrap
            min-h-[44px]
            ${
              activeTab === "manual"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }
          `}>
          <Edit3 size={16} className="sm:w-5 sm:h-5" />
          Input Manual
        </button>

        {/* TAB 3: GENERATE QR (ADMIN ONLY) */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab("generate")}
            className={`
              flex-1 py-3 px-3 sm:px-4 font-semibold transition-all 
              flex items-center justify-center gap-1.5 sm:gap-2
              text-xs sm:text-sm whitespace-nowrap
              min-h-[44px]
              ${
                activeTab === "generate"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }
            `}>
            <Sparkles size={16} className="sm:w-5 sm:h-5" />
            Generate QR
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-4 sm:p-6">
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
