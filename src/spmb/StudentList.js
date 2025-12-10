import React, { useState, useCallback } from "react";
import { exportAllStudents } from "./SpmbExcel";
import html2pdf from "html2pdf.js";

const StudentList = ({
  students,
  totalStudents,
  currentPageNum = 1,
  totalPages = 1,
  searchTerm,
  onSearch,
  onEditStudent,
  onDeleteStudent,
  onLoadStudents,
  onPageChange,
  isLoading,
  rowsPerPage = 20,
  showToast,
  allStudents,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [viewMode, setViewMode] = useState("table");
  const [isExporting, setIsExporting] = useState(false);

  const effectiveTotalPages =
    totalPages > 0 ? totalPages : Math.ceil(totalStudents / rowsPerPage);
  const shouldShowPagination = effectiveTotalPages > 1;

  // Helper function untuk format tanggal DD-MM-YYYY
  const formatDateToDDMMYYYY = useCallback((dateString) => {
    if (!dateString || dateString === "-") return "-";
    try {
      if (dateString.includes("-")) {
        const [year, month, day] = dateString.split("-");
        return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
      }
      return dateString;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  }, []);

  const getDisplayNumber = useCallback(
    (index) => {
      const page = currentPageNum || 1;
      const perPage = rowsPerPage || 20;
      return (page - 1) * perPage + index + 1;
    },
    [currentPageNum, rowsPerPage]
  );

  // Download Formulir as PDF - YANG SUDAH DIPERBAIKI JADI 1 HALAMAN
  const handleDownloadFormulir = useCallback(
    (student) => {
      const formHTML = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <style>
        @page { 
            margin: 8mm 15mm 8mm 15mm; 
            size: A4; 
        }
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.3;
            color: #333;
            font-size: 10pt;
            padding: 0;
            background: white;
        }
        .header {
            text-align: center;
            padding-bottom: 8px;
            margin-bottom: 12px;
            border-bottom: 1px solid #666;
        }
        .header h1 { 
            font-size: 16pt; 
            font-weight: bold; 
            margin: 3px 0; 
            letter-spacing: 0.5px;
            color: #222;
        }
        .header h2 { 
            font-size: 13pt; 
            font-weight: bold; 
            margin: 2px 0; 
            color: #333;
        }
        .header p { 
            font-size: 9pt; 
            margin: 2px 0;
            color: #555;
        }
        
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 4px 0; 
        }
        td { 
            padding: 4px 5px; 
            vertical-align: top; 
            font-size: 10pt; 
        }
        .label { 
            width: 35%; 
            color: #555;
            font-weight: 500;
        }
        .colon { 
            width: 2%; 
        }
        .value { 
            width: 63%; 
            border-bottom: 1px solid #ccc;
            font-weight: normal;
        }
        .value strong {
            font-weight: bold;
            color: #222;
        }
        
        .section-title {
            color: #333;
            padding: 3px 0;
            font-weight: bold;
            margin: 10px 0 6px 0;
            font-size: 10pt;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #999;
        }
        
        .parent-title {
            font-weight: bold;
            font-size: 9pt;
            margin-top: 8px;
            margin-bottom: 3px;
            color: #444;
            padding-left: 2px;
        }
        
        .notes {
            margin-top: 12px;
            padding: 8px 10px;
            border: 1px solid #999;
            font-size: 8pt;
            line-height: 1.4;
            background: #f9f9f9;
            border-radius: 3px;
        }
        
        .notes strong {
            font-size: 9pt;
            color: #333;
        }
        
        .signature-section {
            margin-top: 15px;
            width: 100%;
        }
        
        .signature-row {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        
        .signature-box {
            text-align: center;
            width: 45%;
            font-size: 9pt;
        }
        
        .signature-space {
            height: 50px;
            border-bottom: 1px solid #999;
            margin-bottom: 5px;
            margin-top: 8px;
        }
        
        .signature-name {
            display: inline-block;
            min-width: 150px;
            padding-top: 3px;
            color: #555;
            font-weight: 500;
        }

        .form-container {
            max-width: 100%;
            margin: 0 auto;
        }

        .compact-section {
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <div class="header">
            <h1>SMP MUSLIMIN CILILIN</h1>
            <h2>FORMULIR PENDAFTARAN CALON SISWA BARU</h2>
            <h2>TAHUN AJARAN 2026/2027</h2>
            <p>Jl. Raya Warungawi Cililin - Bandung Barat</p>
        </div>
        
        <table>
            <tr>
                <td class="label">No. Pendaftaran</td>
                <td class="colon">:</td>
                <td class="value"><strong>${
                  student.no_pendaftaran ||
                  "....................................."
                }</strong></td>
            </tr>
            <tr>
                <td class="label">Tanggal Daftar</td>
                <td class="colon">:</td>
                <td class="value">${
                  formatDateToDDMMYYYY(student.tanggal_daftar) ||
                  "....................................."
                }</td>
            </tr>
        </table>
        
        <div class="section-title compact-section">A. DATA CALON SISWA</div>
        <table>
            <tr>
                <td class="label">Nama Lengkap</td>
                <td class="colon">:</td>
                <td class="value"><strong>${
                  student.nama_lengkap ||
                  "....................................."
                }</strong></td>
            </tr>
            <tr>
                <td class="label">NISN</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.nisn && student.nisn !== "-"
                    ? student.nisn
                    : "....................................."
                }</td>
            </tr>
            <tr>
                <td class="label">Jenis Kelamin</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"
                }</td>
            </tr>
            <tr>
                <td class="label">Tempat, Tanggal Lahir</td>
                <td class="colon">:</td>
                <td class="value">${student.tempat_lahir || ""}, ${
        formatDateToDDMMYYYY(student.tanggal_lahir) || ""
      }</td>
            </tr>
            <tr>
                <td class="label">Asal Sekolah (SD)</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.asal_sekolah ||
                  "....................................."
                }</td>
            </tr>
        </table>
        
        <div class="section-title compact-section">B. DATA ORANG TUA / WALI</div>
        <table>
            <tr><td colspan="3" class="parent-title">AYAH KANDUNG</td></tr>
            <tr>
                <td class="label">Nama Lengkap</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.nama_ayah || "....................................."
                }</td>
            </tr>
            <tr>
                <td class="label">Pekerjaan</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.pekerjaan_ayah ||
                  "....................................."
                }</td>
            </tr>
            <tr>
                <td class="label">Pendidikan Terakhir</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.pendidikan_ayah ||
                  "....................................."
                }</td>
            </tr>
            
            <tr><td colspan="3" class="parent-title">IBU KANDUNG</td></tr>
            <tr>
                <td class="label">Nama Lengkap</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.nama_ibu || "....................................."
                }</td>
            </tr>
            <tr>
                <td class="label">Pekerjaan</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.pekerjaan_ibu ||
                  "....................................."
                }</td>
            </tr>
            <tr>
                <td class="label">Pendidikan Terakhir</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.pendidikan_ibu ||
                  "....................................."
                }</td>
            </tr>
        </table>
        
        <div class="section-title compact-section">C. KONTAK & ALAMAT</div>
        <table>
            <tr>
                <td class="label">No. HP / WhatsApp</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.no_hp || "....................................."
                }</td>
            </tr>
            <tr>
                <td class="label">Alamat Lengkap</td>
                <td class="colon">:</td>
                <td class="value">${
                  student.alamat || "....................................."
                }</td>
            </tr>
        </table>
        
        <div class="notes">
            <strong>CATATAN PENTING:</strong><br>
            1. Formulir ini harus diisi dengan lengkap dan benar<br>
            2. Lampirkan dokumen: Fotocopy Ijazah/SKHUN, Kartu Keluarga, Akta Kelahiran<br>
            3. Pasfoto 4x6 berwarna sebanyak 3 lembar<br>
            4. Formulir dikembalikan ke panitia PPDB paling lambat H-3 tes masuk
        </div>
        
        <div class="signature-section">
            <div class="signature-row">
                <div class="signature-box">
                    <p>Cililin, _________ 2027</p>
                    <p>Orang Tua / Wali</p>
                    <div class="signature-space"></div>
                    <div class="signature-name">( ________________ )</div>
                </div>
                <div class="signature-box">
                    <p>Mengetahui,</p>
                    <p>Panitia PPDB</p>
                    <div class="signature-space"></div>
                    <div class="signature-name">( ________________ )</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

      const element = document.createElement("div");
      element.innerHTML = formHTML;

      const opt = {
        margin: [8, 15, 8, 15],
        filename: `formulir_${student.nama_lengkap}_${student.no_pendaftaran}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
        },
        pagebreak: { mode: ["avoid-all"] },
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          if (showToast) {
            showToast(
              `PDF ${student.nama_lengkap} berhasil didownload!`,
              "success"
            );
          }
        })
        .catch((error) => {
          console.error("Error generating PDF:", error);
          if (showToast) {
            showToast("Gagal membuat PDF", "error");
          }
        });
    },
    [formatDateToDDMMYYYY, showToast]
  );

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = React.useMemo(() => {
    if (!sortConfig.key) return students;

    return [...students].sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.key === "nama_lengkap") {
        aValue = a.nama_lengkap || "";
        bValue = b.nama_lengkap || "";
      } else if (sortConfig.key === "asal_sekolah") {
        aValue = a.asal_sekolah || "";
        bValue = b.asal_sekolah || "";
      } else {
        aValue = a[sortConfig.key] || "";
        bValue = b[sortConfig.key] || "";
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [students, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "fas fa-sort";
    return sortConfig.direction === "asc"
      ? "fas fa-sort-up"
      : "fas fa-sort-down";
  };

  const handleEdit = (student) => {
    onEditStudent(student);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      await onDeleteStudent(id);
    }
  };

  const handleExportData = async () => {
    if (!allStudents || allStudents.length === 0) {
      if (showToast) {
        showToast("Tidak ada data untuk di-export", "error");
      }
      return;
    }

    setIsExporting(true);

    try {
      await exportAllStudents(allStudents, totalStudents, showToast);
    } catch (error) {
      console.error("Error in handleExportData:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderPhoneNumber = (phoneNumber, parentName) => {
    if (!phoneNumber)
      return <div className="text-gray-400 dark:text-gray-500 text-sm">-</div>;

    const cleanPhone = phoneNumber.toString().replace(/\D/g, "");
    let waPhone = cleanPhone;
    if (waPhone.startsWith("0")) {
      waPhone = "62" + waPhone.substring(1);
    } else if (!waPhone.startsWith("62")) {
      waPhone = "62" + waPhone;
    }

    const handleWhatsAppClick = () => {
      if (showToast) {
        showToast(
          `Membuka WhatsApp untuk menghubungi ${parentName}...`,
          "info"
        );
      }
    };

    return (
      <div className="flex flex-col gap-1">
        <div className="text-sm text-gray-800 dark:text-gray-200">
          {phoneNumber}
        </div>
        <div className="flex gap-1 flex-wrap">
          <a
            href={`tel:${phoneNumber}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors min-h-[36px] min-w-[64px] justify-center"
            title="Telepon">
            <i className="fas fa-phone text-xs"></i>
            <span className="hidden xs:inline">Call</span>
          </a>
          <a
            href={`https://wa.me/${waPhone}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-semibold hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors min-h-[36px] min-w-[64px] justify-center"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            title="WhatsApp">
            <i className="fab fa-whatsapp text-xs"></i>
            <span className="hidden xs:inline">WA</span>
          </a>
        </div>
      </div>
    );
  };

  // Card view component for mobile
  const StudentCard = ({ student, index }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-800 to-blue-600 dark:from-blue-700 dark:to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
            {getDisplayNumber(index)}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base sm:text-lg break-words">
              {student.nama_lengkap}
            </h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                student.jenis_kelamin === "L"
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                  : "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300"
              }`}>
              {student.jenis_kelamin}
            </span>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => handleDownloadFormulir(student)}
            className="bg-gradient-to-r from-green-600 to-green-400 dark:from-green-700 dark:to-green-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-1 flex-1 sm:flex-none justify-center min-h-[44px]"
            title="Download Formulir PDF">
            <i className="fas fa-file-pdf"></i>
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => handleEdit(student)}
            className="bg-gradient-to-r from-yellow-600 to-yellow-400 dark:from-yellow-700 dark:to-yellow-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-1 flex-1 sm:flex-none justify-center min-h-[44px]"
            title="Edit Data">
            <i className="fas fa-edit"></i>
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => handleDelete(student.id)}
            className="bg-gradient-to-r from-red-600 to-red-400 dark:from-red-700 dark:to-red-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-1 flex-1 sm:flex-none justify-center min-h-[44px]"
            title="Hapus Data">
            <i className="fas fa-trash"></i>
            <span className="hidden sm:inline">Hapus</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-sm">
        {/* 🔥 NIS - BARU DITAMBAHKAN */}
        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs sm:text-sm">
            🆔 NIS
          </div>
          <div className="font-medium text-blue-700 dark:text-blue-300 font-mono text-sm sm:text-base break-words">
            {student.nis || (
              <span className="text-gray-400 dark:text-gray-500 italic">
                Belum ada
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs sm:text-sm">
            Tempat, Tanggal Lahir
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base break-words">
            {student.tempat_lahir || "-"},{" "}
            {formatDateToDDMMYYYY(student.tanggal_lahir) || ""}
          </div>
        </div>

        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs sm:text-sm">
            NISN
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base break-words">
            {student.nisn && student.nisn !== "-" ? student.nisn : "-"}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs sm:text-sm">
            Alamat
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base break-words">
            {student.alamat || "-"}
          </div>
        </div>

        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs sm:text-sm">
            Orang Tua
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base break-words">
            Ayah: {student.nama_ayah || "-"}
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base break-words mt-1">
            Ibu: {student.nama_ibu || "-"}
          </div>
          <div className="mt-2">
            {renderPhoneNumber(
              student.no_hp,
              student.nama_ayah || student.nama_ibu
            )}
          </div>
        </div>

        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs sm:text-sm">
            Asal SD
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base break-words">
            {student.asal_sekolah || "-"}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-3 sm:px-4 lg:px-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
        <i className="fas fa-list text-blue-600 dark:text-blue-400 text-lg sm:text-xl"></i>
        <span className="text-base sm:text-2xl">
          Data Calon Siswa SMP Muslimin Cililin
        </span>
      </h2>

      {/* Search and Controls */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={onSearch}
            className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none focus:-translate-y-1 pl-10 sm:pl-12 min-h-[48px]"
            placeholder="Cari nama siswa, asal SD, atau nama orang tua..."
          />
          <i className="fas fa-search absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm sm:text-base"></i>
        </div>

        <div className="flex gap-2 sm:gap-3 flex-col xs:flex-row">
          {/* View Mode Toggle */}
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl flex overflow-hidden w-full xs:w-auto">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1 sm:gap-2 flex-1 justify-center min-h-[48px] ${
                viewMode === "table"
                  ? "bg-gradient-to-r from-blue-800 to-blue-600 dark:from-blue-700 dark:to-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}>
              <i className="fas fa-table text-xs sm:text-sm"></i>
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1 sm:gap-2 flex-1 justify-center min-h-[48px] ${
                viewMode === "cards"
                  ? "bg-gradient-to-r from-blue-800 to-blue-600 dark:from-blue-700 dark:to-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}>
              <i className="fas fa-th-large text-xs sm:text-sm"></i>
              <span className="hidden sm:inline">Kartu</span>
            </button>
          </div>

          {/* Export Data Button */}
          <button
            onClick={handleExportData}
            disabled={isExporting || !allStudents || allStudents.length === 0}
            className="bg-gradient-to-r from-blue-800 to-blue-600 dark:from-blue-700 dark:to-blue-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-400 hover:-translate-y-1 hover:shadow-xl disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 sm:gap-3 justify-center min-h-[48px] flex-1 xs:flex-none">
            <i className="fas fa-file-export text-sm sm:text-base"></i>
            <span className="hidden sm:inline">
              {isExporting ? "Exporting..." : "Export Data"}
            </span>
          </button>

          <button
            onClick={onLoadStudents}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-600 dark:to-blue-400 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-400 hover:-translate-y-1 hover:shadow-xl disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 sm:gap-3 justify-center min-h-[48px] flex-1 xs:flex-none">
            <i className="fas fa-sync-alt text-sm sm:text-base"></i>
            <span className="hidden sm:inline">
              {isLoading ? "Memuat..." : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 border-2 border-blue-200 dark:border-blue-800/30 rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-300">
            {totalStudents}
          </div>
          <div className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
            Total Pendaftar
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 border-2 border-green-200 dark:border-green-800/30 rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-green-800 dark:text-green-300">
            {allStudents
              ? allStudents.filter((s) => s.jenis_kelamin === "L").length
              : 0}
          </div>
          <div className="text-green-600 dark:text-green-400 text-xs sm:text-sm">
            Siswa Laki-laki
          </div>
        </div>
        <div className="bg-gradient-to-r from-pink-100 to-pink-50 dark:from-pink-900/20 dark:to-pink-800/10 border-2 border-pink-200 dark:border-pink-800/30 rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-pink-800 dark:text-pink-300">
            {allStudents
              ? allStudents.filter((s) => s.jenis_kelamin === "P").length
              : 0}
          </div>
          <div className="text-pink-600 dark:text-pink-400 text-xs sm:text-sm">
            Siswa Perempuan
          </div>
        </div>
      </div>

      {/* Content - Table or Cards */}
      {viewMode === "cards" ? (
        // Cards View
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {sortedStudents.length === 0 ? (
            <div className="col-span-full text-center py-8 sm:py-12">
              <i className="fas fa-inbox text-3xl sm:text-4xl mb-3 sm:mb-4 text-gray-400 dark:text-gray-600"></i>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                {searchTerm
                  ? "Tidak ada data yang sesuai dengan pencarian"
                  : "Belum ada data pendaftar"}
              </p>
            </div>
          ) : (
            sortedStudents.map((student, index) => (
              <StudentCard key={student.id} student={student} index={index} />
            ))
          )}
        </div>
      ) : (
        // Table View
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gradient-to-r from-blue-800 to-blue-600 dark:from-blue-900 dark:to-blue-700 text-white">
                <tr>
                  <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[60px]">
                    No
                  </th>

                  {/* 🔥 KOLOM BARU: NIS */}
                  <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[120px] sm:min-w-[140px]">
                    NIS
                  </th>

                  <th
                    className="p-3 text-left font-semibold cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-xs sm:text-sm min-w-[130px] sm:min-w-[150px]"
                    onClick={() => handleSort("nama_lengkap")}>
                    <div className="flex items-center gap-1 sm:gap-2">
                      Nama Siswa
                      <i className={getSortIcon("nama_lengkap")}></i>
                    </div>
                  </th>
                  <th
                    className="p-3 text-left font-semibold cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-xs sm:text-sm min-w-[60px]"
                    onClick={() => handleSort("jenis_kelamin")}>
                    <div className="flex items-center gap-1 sm:gap-2">
                      JK
                      <i className={getSortIcon("jenis_kelamin")}></i>
                    </div>
                  </th>
                  <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[110px] sm:min-w-[120px]">
                    TTL
                  </th>
                  <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[150px] sm:min-w-[200px]">
                    Orang Tua
                  </th>
                  <th
                    className="p-3 text-left font-semibold cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-xs sm:text-sm min-w-[130px] sm:min-w-[150px]"
                    onClick={() => handleSort("asal_sekolah")}>
                    <div className="flex items-center gap-1 sm:gap-2">
                      Asal SD
                      <i className={getSortIcon("asal_sekolah")}></i>
                    </div>
                  </th>
                  <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[140px] sm:min-w-[180px]">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
                      <i className="fas fa-inbox text-2xl sm:text-4xl mb-2 block"></i>
                      <p className="text-sm sm:text-base">
                        {searchTerm
                          ? "Tidak ada data yang sesuai dengan pencarian"
                          : "Belum ada data pendaftar"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-3 text-gray-600 dark:text-gray-300 font-semibold text-sm">
                        {getDisplayNumber(index)}
                      </td>

                      {/* 🔥 CELL BARU: NIS */}
                      <td className="p-3">
                        {student.nis ? (
                          <div className="text-xs sm:text-sm font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded inline-block break-words">
                            {student.nis}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                            Belum ada
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base break-words">
                          {student.nama_lengkap}
                        </div>
                        {student.nisn && student.nisn !== "-" && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            NISN: {student.nisn}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            student.jenis_kelamin === "L"
                              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                              : "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300"
                          }`}>
                          {student.jenis_kelamin === "L" ? "L" : "P"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium text-gray-800 dark:text-gray-200 break-words">
                            {student.tempat_lahir || "-"}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                            {formatDateToDDMMYYYY(student.tanggal_lahir) || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 break-words">
                            Ayah: {student.nama_ayah || "-"}
                          </div>
                          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 break-words">
                            Ibu: {student.nama_ibu || "-"}
                          </div>
                          {renderPhoneNumber(
                            student.no_hp,
                            student.nama_ayah || student.nama_ibu
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">
                          {student.asal_sekolah || "-"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 sm:gap-2 flex-wrap">
                          <button
                            onClick={() => handleDownloadFormulir(student)}
                            className="bg-gradient-to-r from-green-600 to-green-400 dark:from-green-700 dark:to-green-500 text-white px-2 sm:px-3 py-2 rounded-lg text-xs font-semibold hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-1 justify-center min-h-[36px] min-w-[60px] sm:min-w-[80px]"
                            title="Download Formulir PDF">
                            <i className="fas fa-file-pdf text-xs"></i>
                            <span className="hidden xs:inline">PDF</span>
                          </button>
                          <button
                            onClick={() => handleEdit(student)}
                            className="bg-gradient-to-r from-yellow-600 to-yellow-400 dark:from-yellow-700 dark:to-yellow-500 text-white px-2 sm:px-3 py-2 rounded-lg text-xs font-semibold hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-1 justify-center min-h-[36px] min-w-[60px] sm:min-w-[80px]"
                            title="Edit Data">
                            <i className="fas fa-edit text-xs"></i>
                            <span className="hidden xs:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="bg-gradient-to-r from-red-600 to-red-400 dark:from-red-700 dark:to-red-500 text-white px-2 sm:px-3 py-2 rounded-lg text-xs font-semibold hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-1 justify-center min-h-[36px] min-w-[60px] sm:min-w-[80px]"
                            title="Hapus Data">
                            <i className="fas fa-trash text-xs"></i>
                            <span className="hidden xs:inline">Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {shouldShowPagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center sm:text-left">
            Menampilkan{" "}
            <span className="font-semibold">
              {getDisplayNumber(0)}-
              {getDisplayNumber(sortedStudents.length - 1)}
            </span>{" "}
            dari <span className="font-semibold">{totalStudents}</span> data
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex gap-1 w-full sm:w-auto justify-center">
              <button
                onClick={() => onPageChange(currentPageNum - 1)}
                disabled={currentPageNum === 1}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1 sm:gap-2 justify-center flex-1 sm:flex-none min-w-[100px] sm:min-w-[120px] min-h-[44px]">
                <i className="fas fa-chevron-left text-xs"></i>
                <span>Sebelumnya</span>
              </button>

              <div className="flex gap-1 mx-1 sm:mx-2">
                {Array.from(
                  { length: Math.min(5, effectiveTotalPages) },
                  (_, i) => {
                    let pageNum;
                    if (effectiveTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPageNum <= 3) {
                      pageNum = i + 1;
                    } else if (currentPageNum >= effectiveTotalPages - 2) {
                      pageNum = effectiveTotalPages - 4 + i;
                    } else {
                      pageNum = currentPageNum - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`min-w-[36px] sm:min-w-[44px] h-10 sm:h-12 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center ${
                          currentPageNum === pageNum
                            ? "bg-gradient-to-r from-blue-800 to-blue-600 dark:from-blue-700 dark:to-blue-500 text-white shadow-lg"
                            : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}>
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => onPageChange(currentPageNum + 1)}
                disabled={currentPageNum === effectiveTotalPages}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1 sm:gap-2 justify-center flex-1 sm:flex-none min-w-[100px] sm:min-w-[120px] min-h-[44px]">
                <span>Berikutnya</span>
                <i className="fas fa-chevron-right text-xs"></i>
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
              Halaman {currentPageNum} dari {effectiveTotalPages}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
