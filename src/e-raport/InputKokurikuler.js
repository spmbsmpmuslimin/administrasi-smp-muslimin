import React from "react";
import { Construction } from "lucide-react";

function InputKokurikuler({ darkMode }) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-sky-100"
      }`}>
      <div
        className={`max-w-md w-full rounded-2xl shadow-xl p-8 text-center ${
          darkMode
            ? "bg-gray-800 border border-gray-700"
            : "bg-white border border-blue-200"
        }`}>
        {/* Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            darkMode ? "bg-blue-900/30" : "bg-blue-100"
          }`}>
          <Construction
            size={40}
            className={darkMode ? "text-blue-400" : "text-blue-600"}
          />
        </div>

        {/* Title */}
        <h2
          className={`text-2xl font-bold mb-3 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
          Input Kokurikuler
        </h2>

        {/* Message */}
        <p
          className={`text-base mb-6 ${
            darkMode ? "text-gray-300" : "text-gray-600"
          }`}>
          Halaman ini masih dalam pengembangan
        </p>

        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            darkMode
              ? "bg-yellow-900/30 text-yellow-300 border border-yellow-700"
              : "bg-yellow-100 text-yellow-800 border border-yellow-300"
          }`}>
          <span className="animate-pulse">🚧</span>
          Coming Soon
        </div>

        {/* Additional Info */}
        <p
          className={`mt-6 text-xs ${
            darkMode ? "text-gray-500" : "text-gray-400"
          }`}>
          Fitur input nilai kokurikuler akan segera hadir
        </p>
      </div>
    </div>
  );
}

export default InputKokurikuler;
