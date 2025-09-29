// pages/DataSiswa.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export const Students = () => {
  const [siswaData, setSiswaData] = useState([]);
  const [kelasOptions, setKelasOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJenjang, setSelectedJenjang] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");

  useEffect(() => {
    fetchStudents();
    fetchKelasOptions();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      setSiswaData(data || []);
    } catch (error) {
      console.error("Error fetching siswa data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKelasOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id")
        .order("id", { ascending: true });

      if (error) throw error;

      setKelasOptions(data.map((item) => item.id) || []);
    } catch (error) {
      console.error("Error fetching kelas options:", error);
    }
  };

  // Filter kelas berdasarkan jenjang yang dipilih
  const filteredKelasOptions = selectedJenjang
    ? kelasOptions.filter((kelas) => kelas.startsWith(selectedJenjang))
    : [];

  // Filter data berdasarkan search, jenjang, dan kelas
  const filteredData = siswaData.filter((siswa) => {
    const matchesSearch =
      siswa.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      siswa.nis?.toString().includes(searchTerm);
    const matchesJenjang = selectedJenjang
      ? siswa.class_id?.startsWith(selectedJenjang)
      : true;
    const matchesKelas = selectedKelas
      ? siswa.class_id === selectedKelas
      : true;

    return matchesSearch && matchesJenjang && matchesKelas;
  });

  const handleJenjangChange = (e) => {
    setSelectedJenjang(e.target.value);
    setSelectedKelas(""); // Reset pilihan kelas ketika jenjang berubah
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Data Siswa</h1>
          <p className="text-gray-600">Memuat data siswa...</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Data Siswa</h1>
        <p className="text-gray-600">
          Manajemen Data Siswa SMP Muslimin Cililin
        </p>
      </div>

      {/* Filter & Search Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search Input - Lebih lebar */}
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="Cari siswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        {/* Dropdown Jenjang */}
        <div>
          <select
            value={selectedJenjang}
            onChange={handleJenjangChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer transition">
            <option value="">Semua Jenjang</option>
            <option value="7">Kelas 7</option>
            <option value="8">Kelas 8</option>
            <option value="9">Kelas 9</option>
          </select>
        </div>

        {/* Dropdown Kelas (dinamis berdasarkan jenjang) */}
        <div>
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            disabled={!selectedJenjang}
            className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
              !selectedJenjang
                ? "bg-gray-100 cursor-not-allowed opacity-70"
                : "bg-white cursor-pointer"
            }`}>
            <option value="">Semua Kelas</option>
            {filteredKelasOptions.map((kelas) => (
              <option key={kelas} value={kelas}>
                {kelas}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Filter */}
      {(selectedJenjang || selectedKelas || searchTerm) && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm inline-block">
          Menampilkan <strong>{filteredData.length} Siswa</strong>
          {searchTerm && ` dengan kata kunci "${searchTerm}"`}
          {selectedKelas && ` Di Kelas ${selectedKelas}`}
        </div>
      )}

      {/* Table Data Siswa */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          {/* Table Header */}
          <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <tr>
              <th className="p-4 text-left w-1/12">No.</th>
              <th className="p-4 text-left w-2/12">NIS</th>
              <th className="p-4 text-left w-4/12">Nama</th>
              <th className="p-4 text-left w-2/12">Kelas</th>
              <th className="p-4 text-left w-2/12">Jenis Kelamin</th>
              <th className="p-4 text-left w-1/12">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((siswa, index) => (
              <tr
                key={siswa.id}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="p-4 text-center">{index + 1}</td>
                <td className="p-4 font-mono text-sm">{siswa.nis}</td>
                <td className="p-4 font-medium">{siswa.full_name}</td>
                <td className="p-4 font-semibold">{siswa.class_id}</td>
                <td className="p-4">
                  {siswa.gender === "L" ? "Laki-laki" : "Perempuan"}
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      siswa.is_active
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}>
                    {siswa.is_active ? "Aktif" : "Non-Aktif"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="p-12 text-center text-gray-500 text-lg">
            {searchTerm || selectedJenjang || selectedKelas
              ? "Tidak ada data siswa yang sesuai dengan filter"
              : "Belum ada data siswa"}
          </div>
        )}
      </div>
    </div>
  );
};

export default Students;
