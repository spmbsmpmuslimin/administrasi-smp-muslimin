import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  X,
  Search,
  FileText,
  User,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const BKReportsEnhanced = ({ user, onShowToast }) => {
  const [konselingData, setKonselingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    class: "",
    status: "",
    bidang: "",
    jenisLayanan: "",
    dateStart: "",
    dateEnd: "",
  });

  // Fetch data from Supabase
  useEffect(() => {
    fetchKonselingData();
    fetchClasses();
  }, []);

  const fetchKonselingData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("konseling")
        .select(
          `
          *,
          students:student_id (
            full_name,
            nis,
            gender,
            class_id
          ),
          classes:class_id (
            grade
          )
        `
        )
        .order("tanggal", { ascending: false });

      if (error) throw error;

      // Process the data to match the expected structure
      const processedData = data.map((item) => ({
        id: item.id,
        student_id: item.student_id,
        full_name: item.students?.full_name || item.full_name,
        nis: item.students?.nis || item.nis,
        gender: item.students?.gender || item.gender,
        class_id: item.students?.class_id || item.class_id,
        class_name: item.classes?.grade || item.class_id,
        tanggal: item.tanggal,
        jenis_layanan: item.jenis_layanan,
        bidang_bimbingan: item.bidang_bimbingan,
        permasalahan: item.permasalahan,
        kronologi: item.kronologi,
        tindakan_layanan: item.tindakan_layanan,
        hasil_layanan: item.hasil_layanan,
        rencana_tindak_lanjut: item.rencana_tindak_lanjut,
        status_layanan: item.status_layanan,
        guru_bk_name: item.guru_bk_name,
        academic_year: item.academic_year,
        semester: item.semester,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      setKonselingData(processedData);
      setFilteredData(processedData);
      onShowToast("Data konseling berhasil dimuat", "success");
    } catch (error) {
      console.error("Error fetching konseling data:", error);
      onShowToast("Gagal memuat data konseling", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("grade");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  // Calculate statistics
  const stats = {
    total: konselingData.length,
    selesai: konselingData.filter((d) => d.status_layanan === "Selesai").length,
    proses: konselingData.filter((d) => d.status_layanan === "Proses").length,
    menunggu: konselingData.filter((d) => d.status_layanan === "Menunggu")
      .length,
    needFollowUp: konselingData.filter(
      (d) => d.status_layanan === "Proses" && d.rencana_tindak_lanjut
    ).length,
  };

  // Get unique students with repeat consultations
  const studentFrequency = konselingData.reduce((acc, item) => {
    acc[item.student_id] = (acc[item.student_id] || 0) + 1;
    return acc;
  }, {});

  const frequentStudents = Object.entries(studentFrequency)
    .filter(([_, count]) => count > 1)
    .map(([studentId, count]) => {
      const student = konselingData.find((d) => d.student_id === studentId);
      return { ...student, frequency: count };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  // Chart data
  const bidangData = Object.entries(
    konselingData.reduce((acc, item) => {
      acc[item.bidang_bimbingan] = (acc[item.bidang_bimbingan] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const monthlyData = Object.entries(
    konselingData.reduce((acc, item) => {
      const month = new Date(item.tanggal).toLocaleDateString("id-ID", {
        month: "short",
        year: "numeric",
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {})
  ).map(([month, count]) => ({ month, count }));

  const statusData = [
    { name: "Selesai", value: stats.selesai, color: "#10b981" },
    { name: "Proses", value: stats.proses, color: "#f59e0b" },
    { name: "Menunggu", value: stats.menunggu, color: "#3b82f6" },
  ];

  // Apply filters
  useEffect(() => {
    let result = konselingData;

    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.full_name.toLowerCase().includes(term) ||
          item.nis.includes(term) ||
          item.permasalahan.toLowerCase().includes(term)
      );
    }

    if (filters.class) {
      result = result.filter((item) => item.class_id === filters.class);
    }

    if (filters.status) {
      result = result.filter((item) => item.status_layanan === filters.status);
    }

    if (filters.bidang) {
      result = result.filter(
        (item) => item.bidang_bimbingan === filters.bidang
      );
    }

    if (filters.jenisLayanan) {
      result = result.filter(
        (item) => item.jenis_layanan === filters.jenisLayanan
      );
    }

    if (filters.dateStart && filters.dateEnd) {
      result = result.filter((item) => {
        const date = new Date(item.tanggal);
        return (
          date >= new Date(filters.dateStart) &&
          date <= new Date(filters.dateEnd)
        );
      });
    }

    setFilteredData(result);
  }, [filters, konselingData]);

  // Export functions
  const exportToCSV = () => {
    const headers = [
      "Nama",
      "NIS",
      "Kelas",
      "Tanggal",
      "Jenis Layanan",
      "Bidang",
      "Status",
      "Permasalahan",
      "Hasil",
    ];
    const csvData = filteredData.map((item) => [
      item.full_name,
      item.nis,
      item.class_name,
      item.tanggal,
      item.jenis_layanan,
      item.bidang_bimbingan,
      item.status_layanan,
      `"${item.permasalahan.replace(/"/g, '""')}"`,
      `"${item.hasil_layanan.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan_konseling_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();

    onShowToast("Data berhasil diexport ke CSV", "success");
  };

  const exportToPDF = async () => {
    try {
      onShowToast("Membuat laporan PDF...", "info");

      // Simple PDF generation using window.print() for now
      // In production, you might want to use a library like jspdf
      const printContent = document.createElement("div");
      printContent.innerHTML = `
        <h1>Laporan Konseling BK</h1>
        <p>Tanggal: ${new Date().toLocaleDateString("id-ID")}</p>
        <p>Total Data: ${filteredData.length}</p>
        <table border="1" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Tanggal</th>
              <th>Bidang</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData
              .map(
                (item) => `
              <tr>
                <td>${item.full_name}</td>
                <td>${item.class_name}</td>
                <td>${new Date(item.tanggal).toLocaleDateString("id-ID")}</td>
                <td>${item.bidang_bimbingan}</td>
                <td>${item.status_layanan}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Laporan Konseling BK</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();

      onShowToast("PDF siap dicetak", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      onShowToast("Gagal membuat PDF", "error");
    }
  };

  const updateKonselingStatus = async (itemId, newStatus) => {
    try {
      const { error } = await supabase
        .from("konseling")
        .update({
          status_layanan: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;

      // Update local state
      setKonselingData((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status_layanan: newStatus,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );

      onShowToast("Status berhasil diperbarui", "success");
      setShowDetailModal(false);
    } catch (error) {
      console.error("Error updating status:", error);
      onShowToast("Gagal memperbarui status", "error");
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div
          className={`p-3 rounded-lg ${color
            .replace("border-", "bg-")
            .replace("500", "100")}`}>
          <Icon className={`w-6 h-6 ${color.replace("border-", "text-")}`} />
        </div>
      </div>
    </div>
  );

  const DetailModal = () => {
    if (!showDetailModal || !selectedItem) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">
              Detail Konseling
            </h2>
            <button
              onClick={() => setShowDetailModal(false)}
              className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Student Info */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-700 mb-3">
                Informasi Siswa
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Nama Lengkap</p>
                  <p className="font-medium text-slate-800">
                    {selectedItem.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">NIS</p>
                  <p className="font-medium text-slate-800">
                    {selectedItem.nis}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Kelas</p>
                  <p className="font-medium text-slate-800">
                    {selectedItem.class_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Jenis Kelamin</p>
                  <p className="font-medium text-slate-800">
                    {selectedItem.gender === "L" ? "Laki-laki" : "Perempuan"}
                  </p>
                </div>
              </div>
            </div>

            {/* Konseling Info */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">
                Detail Konseling
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Tanggal</p>
                  <p className="font-medium text-slate-800">
                    {new Date(selectedItem.tanggal).toLocaleDateString(
                      "id-ID",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Jenis Layanan</p>
                    <p className="font-medium text-slate-800">
                      {selectedItem.jenis_layanan}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Bidang Bimbingan</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getBidangColor(
                        selectedItem.bidang_bimbingan
                      )}`}>
                      {selectedItem.bidang_bimbingan}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      selectedItem.status_layanan
                    )}`}>
                    {selectedItem.status_layanan}
                  </span>
                </div>
              </div>
            </div>

            {/* Problem & Solution */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Permasalahan
                </p>
                <p className="text-slate-600 bg-red-50 p-3 rounded">
                  {selectedItem.permasalahan}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Kronologi
                </p>
                <p className="text-slate-600 bg-slate-50 p-3 rounded">
                  {selectedItem.kronologi}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Tindakan Layanan
                </p>
                <p className="text-slate-600 bg-blue-50 p-3 rounded">
                  {selectedItem.tindakan_layanan}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Hasil Layanan
                </p>
                <p className="text-slate-600 bg-green-50 p-3 rounded">
                  {selectedItem.hasil_layanan}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Rencana Tindak Lanjut
                </p>
                <p className="text-slate-600 bg-yellow-50 p-3 rounded">
                  {selectedItem.rencana_tindak_lanjut}
                </p>
              </div>
            </div>

            {/* BK Info */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-500">Guru BK</p>
              <p className="font-medium text-slate-800">
                {selectedItem.guru_bk_name}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tahun Ajaran {selectedItem.academic_year} - Semester{" "}
                {selectedItem.semester}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={exportToPDF}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
              {selectedItem.status_layanan !== "Selesai" && (
                <button
                  onClick={() =>
                    updateKonselingStatus(selectedItem.id, "Selesai")
                  }
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Tandai Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      Selesai: "bg-green-100 text-green-800 border border-green-200",
      Proses: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      Menunggu: "bg-blue-100 text-blue-800 border border-blue-200",
      Ditunda: "bg-red-100 text-red-800 border border-red-200",
    };
    return (
      colors[status] || "bg-slate-100 text-slate-800 border border-slate-200"
    );
  };

  const getBidangColor = (bidang) => {
    const colors = {
      Akademik: "bg-purple-100 text-purple-800 border border-purple-200",
      Sosial: "bg-indigo-100 text-indigo-800 border border-indigo-200",
      Karir: "bg-pink-100 text-pink-800 border border-pink-200",
      Pribadi: "bg-orange-100 text-orange-800 border border-orange-200",
    };
    return (
      colors[bidang] || "bg-slate-100 text-slate-800 border border-slate-200"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-600 mt-4">Memuat data konseling...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Dashboard Bimbingan Konseling
          </h1>
          <p className="text-slate-600 mt-2">
            Monitoring, analisis, dan pelaporan layanan BK
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveView("dashboard")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === "dashboard"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-800"
            }`}>
            Dashboard
          </button>
          <button
            onClick={() => setActiveView("table")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === "table"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-800"
            }`}>
            Data Konseling
          </button>
          <button
            onClick={() => setActiveView("analytics")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === "analytics"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-800"
            }`}>
            Analytics
          </button>
        </div>

        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Konseling"
                value={stats.total}
                icon={Users}
                color="border-blue-500"
                subtitle="Semester ini"
              />
              <StatCard
                title="Selesai"
                value={stats.selesai}
                icon={CheckCircle}
                color="border-green-500"
                subtitle={`${
                  stats.total > 0
                    ? ((stats.selesai / stats.total) * 100).toFixed(0)
                    : 0
                }% completion rate`}
              />
              <StatCard
                title="Dalam Proses"
                value={stats.proses}
                icon={Clock}
                color="border-yellow-500"
                subtitle="Memerlukan tindak lanjut"
              />
              <StatCard
                title="Perlu Follow-up"
                value={stats.needFollowUp}
                icon={AlertCircle}
                color="border-red-500"
                subtitle="Action required"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bidang Distribution */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Distribusi Bidang Bimbingan
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={bidangData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value">
                      {bidangData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            ["#8b5cf6", "#6366f1", "#ec4899", "#f97316"][
                              index % 4
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Status Layanan
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6">
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend & High Frequency Students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Trend Bulanan
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Jumlah Konseling"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Frequent Students */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Siswa dengan Konseling Berulang
                </h3>
                <div className="space-y-3">
                  {frequentStudents.length > 0 ? (
                    frequentStudents.map((student, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedItem(student);
                          setShowDetailModal(true);
                        }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {student.full_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {student.class_name} • {student.nis}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {student.frequency}
                          </p>
                          <p className="text-xs text-slate-500">konseling</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-500 py-8">
                      Tidak ada data
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table View */}
        {activeView === "table" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Cari nama, NIS, atau masalah..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />
                </div>

                <select
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.class}
                  onChange={(e) =>
                    setFilters({ ...filters, class: e.target.value })
                  }>
                  <option value="">Semua Kelas</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      Kelas {classItem.id} {/* ← TAMBAHIN "Kelas" di depan */}
                      {/* ← GANTI: dari grade jadi id (7A, 7B, dst) */}
                    </option>
                  ))}
                </select>

                <select
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }>
                  <option value="">Semua Status</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Proses">Proses</option>
                  <option value="Menunggu">Menunggu</option>
                </select>

                <select
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.bidang}
                  onChange={(e) =>
                    setFilters({ ...filters, bidang: e.target.value })
                  }>
                  <option value="">Semua Bidang</option>
                  <option value="Akademik">Akademik</option>
                  <option value="Sosial">Sosial</option>
                  <option value="Karir">Karir</option>
                  <option value="Pribadi">Pribadi</option>
                </select>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  Menampilkan{" "}
                  <span className="font-semibold">{filteredData.length}</span>{" "}
                  dari{" "}
                  <span className="font-semibold">{konselingData.length}</span>{" "}
                  data
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={() =>
                      setFilters({
                        search: "",
                        class: "",
                        status: "",
                        bidang: "",
                        jenisLayanan: "",
                        dateStart: "",
                        dateEnd: "",
                      })
                    }
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                    <X className="w-4 h-4" />
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Siswa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Layanan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Permasalahan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <Filter className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-slate-600 font-medium">
                              Tidak ada data ditemukan
                            </p>
                            <p className="text-slate-500 text-sm mt-1">
                              Coba ubah filter pencarian
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {item.full_name}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {item.class_name} • {item.nis}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {new Date(item.tanggal).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-slate-900">
                                {item.jenis_layanan}
                              </p>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBidangColor(
                                  item.bidang_bimbingan
                                )}`}>
                                {item.bidang_bimbingan}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-900 line-clamp-2 max-w-xs">
                              {item.permasalahan}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                item.status_layanan
                              )}`}>
                              {item.status_layanan}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setShowDetailModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-2 px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                              <Eye className="w-4 h-4" />
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* Analytics View */}
        {activeView === "analytics" && (
          <div className="space-y-6">
            {/* Comprehensive Charts */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Analisis Mendalam
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bidang per Status */}
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-3">
                    Bidang Bimbingan per Status
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bidangData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Comparison */}
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-3">
                    Perbandingan Bulanan
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        name="Total Konseling"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
                <h4 className="text-lg font-semibold mb-2">Bidang Tertinggi</h4>
                <p className="text-3xl font-bold mb-1">
                  {bidangData.length > 0
                    ? bidangData.reduce((a, b) => (a.value > b.value ? a : b))
                        .name
                    : "-"}
                </p>
                <p className="text-sm opacity-90">
                  {bidangData.length > 0
                    ? bidangData.reduce((a, b) => (a.value > b.value ? a : b))
                        .value
                    : 0}{" "}
                  kasus
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                <CheckCircle className="w-8 h-8 mb-3 opacity-80" />
                <h4 className="text-lg font-semibold mb-2">Success Rate</h4>
                <p className="text-3xl font-bold mb-1">
                  {stats.total > 0
                    ? ((stats.selesai / stats.total) * 100).toFixed(1)
                    : 0}
                  %
                </p>
                <p className="text-sm opacity-90">
                  {stats.selesai} dari {stats.total} selesai
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
                <AlertCircle className="w-8 h-8 mb-3 opacity-80" />
                <h4 className="text-lg font-semibold mb-2">Perlu Perhatian</h4>
                <p className="text-3xl font-bold mb-1">
                  {frequentStudents.length}
                </p>
                <p className="text-sm opacity-90">Siswa konseling berulang</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Rekomendasi & Action Items
              </h3>
              <div className="space-y-3">
                {stats.needFollowUp > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">
                        {stats.needFollowUp} siswa memerlukan tindak lanjut
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Jadwalkan sesi konseling lanjutan dalam waktu dekat
                      </p>
                    </div>
                  </div>
                )}

                {frequentStudents.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">
                        {frequentStudents.length} siswa dengan konseling
                        berulang
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Pertimbangkan untuk melakukan home visit atau konsultasi
                        dengan orang tua
                      </p>
                    </div>
                  </div>
                )}

                {stats.proses > stats.selesai && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">
                        Kasus dalam proses lebih banyak dari yang selesai
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Review dan prioritaskan kasus yang sudah berjalan lama
                      </p>
                    </div>
                  </div>
                )}

                {bidangData.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                    <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">
                        Fokus program bimbingan:{" "}
                        {
                          bidangData.reduce((a, b) =>
                            a.value > b.value ? a : b
                          ).name
                        }
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Pertimbangkan untuk membuat program preventif di bidang
                        ini
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Export Laporan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={exportToPDF}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  <Download className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Laporan Lengkap</p>
                    <p className="text-xs opacity-90">PDF Format</p>
                  </div>
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  <Download className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Data Excel</p>
                    <p className="text-xs opacity-90">Semua Record</p>
                  </div>
                </button>
                <button className="flex items-center justify-center gap-3 px-6 py-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  <FileText className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Laporan Bulanan</p>
                    <p className="text-xs opacity-90">Summary Report</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <DetailModal />
      </div>
    </div>
  );
};

export default BKReportsEnhanced;
