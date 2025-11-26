// src/attendance-teacher/QRCodeGenerator.js
import React, { useState, useRef, useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";

const QRCodeGenerator = () => {
  const qrCode = "QR_PRESENSI_GURU_SMP_MUSLIMIN_CILILIN";
  const [qrUrl, setQrUrl] = useState("");
  const [finalQrUrl, setFinalQrUrl] = useState("");
  const canvasRef = useRef(null);

  const generateQR = () => {
    // Using QR Server API to generate QR code
    const size = 500;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      qrCode
    )}`;
    setQrUrl(url);
  };

  useEffect(() => {
    if (qrUrl && canvasRef.current) {
      addLogoToQR();
    }
  }, [qrUrl]);

  const addLogoToQR = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const qrSize = 500;
    const padding = 40; // Padding untuk border
    const size = qrSize + padding * 2; // Total size dengan border

    canvas.width = size;
    canvas.height = size;

    // Draw white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, size, size);

    // Draw outer border
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, size - 20, size - 20);

    // Draw inner border (double border effect)
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, size - 40, size - 40);

    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";

    qrImg.onload = () => {
      // Draw QR code with padding offset
      ctx.drawImage(qrImg, padding, padding, qrSize, qrSize);

      // Calculate center based on new size with padding
      const centerSize = qrSize * 0.28;
      const centerX = (size - centerSize) / 2;
      const centerY = (size - centerSize) / 2;
      const cornerRadius = 15;

      ctx.fillStyle = "white";
      ctx.strokeStyle = "#1e40af";
      ctx.lineWidth = 5;

      // Rounded rectangle
      ctx.beginPath();
      ctx.moveTo(centerX + cornerRadius, centerY);
      ctx.lineTo(centerX + centerSize - cornerRadius, centerY);
      ctx.quadraticCurveTo(
        centerX + centerSize,
        centerY,
        centerX + centerSize,
        centerY + cornerRadius
      );
      ctx.lineTo(centerX + centerSize, centerY + centerSize - cornerRadius);
      ctx.quadraticCurveTo(
        centerX + centerSize,
        centerY + centerSize,
        centerX + centerSize - cornerRadius,
        centerY + centerSize
      );
      ctx.lineTo(centerX + cornerRadius, centerY + centerSize);
      ctx.quadraticCurveTo(
        centerX,
        centerY + centerSize,
        centerX,
        centerY + centerSize - cornerRadius
      );
      ctx.lineTo(centerX, centerY + cornerRadius);
      ctx.quadraticCurveTo(centerX, centerY, centerX + cornerRadius, centerY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Load and draw school logo
      const logo = new Image();
      logo.onload = () => {
        const logoSize = centerSize * 0.75; // Logo 75% dari center box
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

        // Convert canvas to data URL
        setFinalQrUrl(canvas.toDataURL("image/png"));
      };

      logo.onerror = () => {
        console.error("Gagal load logo sekolah");
        // Fallback: tampilkan text jika logo gagal load
        ctx.fillStyle = "#1e40af";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fontSize = centerSize / 6.5;
        ctx.font = `bold ${fontSize}px Arial`;
        const lineSpacing = fontSize * 1.1;
        ctx.fillText("SMP", size / 2, size / 2 - lineSpacing);
        ctx.fillText("MUSLIMIN", size / 2, size / 2);
        ctx.fillText("CILILIN", size / 2, size / 2 + lineSpacing);

        setFinalQrUrl(canvas.toDataURL("image/png"));
      };

      logo.src = "/logo_sekolah.PNG";
    };

    qrImg.src = qrUrl;
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = finalQrUrl;
    link.download = `QR_Presensi_Guru_SMP_MUSLIMIN.png`;
    link.click();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          🎯 Generator QR Presensi Guru
        </h1>
        <p className="text-gray-600">
          Generate QR Code untuk sistem presensi guru SMP MUSLIMIN
        </p>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateQR}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 mb-6">
        <RefreshCw size={20} />
        Generate QR Code
      </button>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* QR Code Display */}
      {finalQrUrl && (
        <div className="space-y-4">
          <div className="border-4 border-blue-500 rounded-lg p-4 bg-gray-50">
            <img
              src={finalQrUrl}
              alt="QR Code"
              className="w-full max-w-sm mx-auto"
            />
            <p className="text-center text-sm text-gray-600 mt-2">
              QR Code dengan logo SMP MUSLIMIN CILILIN
            </p>
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
              <li>• Logo sekolah tidak mengganggu scanning</li>
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
