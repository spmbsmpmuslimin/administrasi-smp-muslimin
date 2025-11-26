// src/attendance-teacher/QRCodeGenerator.js
import React, { useState } from "react";
import { Download, RefreshCw } from "lucide-react";

const QRCodeGenerator = () => {
  const qrCode = "QR_PRESENSI_GURU_SMP_MUSLIMIN_CILILIN";
  const [qrUrl, setQrUrl] = useState("");

  const generateQR = () => {
    // Using QR Server API to generate QR code
    const size = 300;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      qrCode
    )}`;
    setQrUrl(url);
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `QR_Presensi_Guru.png`;
    link.click();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          🎯 Generator QR Presensi Guru
        </h1>
        <p className="text-gray-600">
          Generate QR Code untuk sistem presensi guru
        </p>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateQR}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 mb-6">
        <RefreshCw size={20} />
        Generate QR Code
      </button>

      {/* QR Code Display */}
      {qrUrl && (
        <div className="space-y-4">
          <div className="border-4 border-blue-500 rounded-lg p-4 bg-gray-50">
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-full max-w-sm mx-auto"
            />
          </div>

          {/* Code Info */}
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">
              <strong>Kode:</strong>
            </p>
            <p className="font-mono text-sm bg-white px-3 py-2 rounded border border-gray-300">
              {qrCode}
            </p>
          </div>

          {/* Download Button */}
          <button
            onClick={downloadQR}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
            <Download size={20} />
            Download QR Code
          </button>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">
              📋 Cara Testing:
            </h3>
            <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
              <li>Download QR Code di atas</li>
              <li>Buka di layar lain (PC/Print/HP lain)</li>
              <li>Buka aplikasi presensi → Tab "Scan QR"</li>
              <li>Arahkan kamera ke QR Code ini</li>
              <li>Presensi akan otomatis tercatat!</li>
            </ol>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Tips:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Print QR Code dan tempel di ruang guru</li>
              <li>• Pastikan pencahayaan cukup saat scan</li>
              <li>• QR Code dapat discan dari jarak 10-30 cm</li>
              <li>• Satu guru hanya bisa presensi 1x per hari</li>
            </ul>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          <strong>⚠️ Penting:</strong> QR Code ini statis untuk testing. Untuk
          keamanan lebih baik, gunakan QR Code dinamis yang berubah setiap hari!
        </p>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
