// setting/kelola-raport/KelolaKKM.js
// Halaman setting KKM per mata pelajaran + batas minimum Nilai Akhir
// kelulusan. Dipakai TU/kepsek buat isi sendiri angkanya (KKM beda-beda
// tiap mapel dan gak ada yang hardcode-able di kode -- lihat diskusi di
// RekapKelulusan.js soal BOBOT_NR/BOBOT_NASAJ yang juga placeholder).
//
// Daftar mata pelajaran DITARIK DARI DATA yang udah ada di
// student_report_grades (bukan konstanta hardcode), soalnya nama mapel di
// project ini sumbernya dari legend "KETERANGAN MAPEL" tiap file leger
// (lihat parseLegerExcel.js) -- bisa aja beda-beda persis nama/jumlahnya
// tergantung template yang dipakai kelas/tahun ajaran tsb. Mapel yang
// belum punya baris di kkm_mapel ditampilin dengan KKM default (75, lihat
// migration) dan ditandain "Belum diisi" biar TU sadar perlu dilengkapi.
//
// Disimpan ke tabel kkm_mapel (unique per mata_pelajaran) dan
// kelulusan_config (1 baris, id=1) -- lihat
// migration_kkm_dan_kelulusan_config.sql buat skema lengkapnya.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, AlertCircle, GraduationCap } from "lucide-react";
import { supabase } from "../../supabaseClient";

const KKM_FALLBACK = 75;
const NILAI_AKHIR_MINIMUM_FALLBACK = 70;

const KelolaKKM = ({ showToast }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState([]); // nama mapel unik, hasil tarik dari student_report_grades
  const [kkmByMapel, setKkmByMapel] = useState({}); // { [mataPelajaran]: { kkm, isSaved } }
  const [nilaiAkhirMinimum, setNilaiAkhirMinimum] = useState(
    String(NILAI_AKHIR_MINIMUM_FALLBACK),
  );
  const [savingMapel, setSavingMapel] = useState(null); // mapel yang lagi diproses simpan
  const [savingThreshold, setSavingThreshold] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Daftar semua mapel unik yang pernah muncul di nilai raport.
      // Query ambil kolom subject doang biar payload kecil, dedupe di JS
      // (postgrest gak punya `distinct` langsung tanpa bikin view).
      const { data: gradeRows, error: gradeErr } = await supabase
        .from("student_report_grades")
        .select("subject");
      if (gradeErr) throw gradeErr;

      const uniqueSubjects = Array.from(
        new Set((gradeRows || []).map((r) => r.subject).filter(Boolean)),
      ).sort();

      // 2. KKM yang udah pernah diisi TU sebelumnya.
      const { data: kkmRows, error: kkmErr } = await supabase
        .from("kkm_mapel")
        .select("mata_pelajaran, kkm");
      if (kkmErr) throw kkmErr;

      const kkmMap = {};
      uniqueSubjects.forEach((subj) => {
        const existing = (kkmRows || []).find((r) => r.mata_pelajaran === subj);
        kkmMap[subj] = {
          kkm: existing ? String(existing.kkm) : String(KKM_FALLBACK),
          isSaved: !!existing,
        };
      });

      // 3. Batas minimum Nilai Akhir (settingan global).
      const { data: configRow, error: configErr } = await supabase
        .from("kelulusan_config")
        .select("nilai_akhir_minimum")
        .eq("id", 1)
        .maybeSingle();
      if (configErr) throw configErr;

      setSubjects(uniqueSubjects);
      setKkmByMapel(kkmMap);
      if (configRow)
        setNilaiAkhirMinimum(String(configRow.nilai_akhir_minimum));
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data KKM", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const belumDiisiCount = useMemo(
    () => Object.values(kkmByMapel).filter((v) => !v.isSaved).length,
    [kkmByMapel],
  );

  const handleKkmInputChange = (mapel, value) => {
    if (
      value !== "" &&
      (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)
    ) {
      return;
    }
    setKkmByMapel((prev) => ({
      ...prev,
      [mapel]: { ...prev[mapel], kkm: value },
    }));
  };

  const handleSimpanKkm = async (mapel) => {
    const value = kkmByMapel[mapel]?.kkm;
    if (value === "" || value === undefined) {
      showToast?.("KKM tidak boleh kosong", "error");
      return;
    }
    setSavingMapel(mapel);
    try {
      const { error } = await supabase.from("kkm_mapel").upsert(
        {
          mata_pelajaran: mapel,
          kkm: Number(value),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mata_pelajaran" },
      );
      if (error) throw error;
      setKkmByMapel((prev) => ({
        ...prev,
        [mapel]: { ...prev[mapel], isSaved: true },
      }));
      showToast?.(`KKM ${mapel} tersimpan`, "success");
    } catch (err) {
      console.error(err);
      showToast?.(`Gagal menyimpan KKM ${mapel}`, "error");
    } finally {
      setSavingMapel(null);
    }
  };

  const handleSimpanThreshold = async () => {
    if (nilaiAkhirMinimum === "" || Number.isNaN(Number(nilaiAkhirMinimum))) {
      showToast?.("Batas minimum Nilai Akhir harus berupa angka", "error");
      return;
    }
    setSavingThreshold(true);
    try {
      const { error } = await supabase.from("kelulusan_config").upsert({
        id: 1,
        nilai_akhir_minimum: Number(nilaiAkhirMinimum),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      showToast?.("Batas minimum Nilai Akhir tersimpan", "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan batas minimum Nilai Akhir", "error");
    } finally {
      setSavingThreshold(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Kriteria Kelulusan
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          KKM per mata pelajaran dan batas minimum Nilai Akhir dipakai di Rekap
          Kelulusan untuk menentukan status Lulus/Tidak Lulus. Siswa dinyatakan
          lulus kalau nilai di <span className="font-medium">semua mapel</span>{" "}
          di atas KKM masing-masing <span className="font-medium">dan</span>{" "}
          Nilai Akhir di atas batas minimum.
        </p>
      </div>

      {/* Batas minimum Nilai Akhir */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Batas Minimum Nilai Akhir
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={nilaiAkhirMinimum}
            onChange={(e) => setNilaiAkhirMinimum(e.target.value)}
            className="w-24 text-center px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleSimpanThreshold}
            disabled={savingThreshold}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
            {savingThreshold ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Simpan
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Belum dikonfirmasi resmi ke sekolah -- placeholder{" "}
          {NILAI_AKHIR_MINIMUM_FALLBACK}, silakan sesuaikan.
        </p>
      </div>

      {/* KKM per mapel */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            KKM per Mata Pelajaran
          </h4>
          {belumDiisiCount > 0 && !isLoading && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {belumDiisiCount} mapel belum diisi (pakai default {KKM_FALLBACK})
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400 dark:text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Memuat mata pelajaran...</span>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            Belum ada data nilai raport yang diimport, jadi belum ada mapel yang
            bisa diisi KKM-nya.
          </div>
        ) : (
          <div className="border border-gray-100 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
            {subjects.map((mapel) => {
              const entry = kkmByMapel[mapel] || {
                kkm: String(KKM_FALLBACK),
                isSaved: false,
              };
              return (
                <div
                  key={mapel}
                  className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {mapel}
                    </span>
                    {!entry.isSaved && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        Belum diisi
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={entry.kkm}
                      onChange={(e) =>
                        handleKkmInputChange(mapel, e.target.value)
                      }
                      className="w-16 text-center px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      onClick={() => handleSimpanKkm(mapel)}
                      disabled={savingMapel === mapel}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-medium hover:bg-teal-100 dark:hover:bg-teal-900/50 disabled:opacity-50">
                      {savingMapel === mapel ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Simpan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KelolaKKM;
