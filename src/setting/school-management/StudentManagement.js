// StudentManagement.js
import { useState, useCallback } from "react";
import { supabase } from "../../supabaseClient"; // INI 100% BENAR

// ==== Helper buat auto-generate akun student_auth pas siswa baru ditambah ====
// Disalin dari AkunSiswaTab.js biar formatnya PERSIS SAMA kayak akun yang
// dibuat manual lewat tab "Portal Siswa > Akun Siswa" -- username = NIS
// (disanitize), password = 3 digit terakhir NIS + 3 huruf acak (unik per
// siswa, gak lagi 1 password buat 1 kelas).
// ⚠️ Kalau nanti formatnya diubah di AkunSiswaTab.js, inget buat samain juga
// di sini -- idealnya dipindah ke 1 file util bersama, tapi sengaja belum
// dilakuin sekarang biar scope perubahan ini kecil & gak nyentuh file lain.
const sanitizeUsername = (nis) => String(nis ?? "").replace(/[^0-9A-Za-z]/g, "");

const PASSWORD_LETTERS = "abcdefghjkmnpqrstuvwxyz";
const randomLetters = (length) => {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += PASSWORD_LETTERS[Math.floor(Math.random() * PASSWORD_LETTERS.length)];
  }
  return result;
};
const generateUniquePassword = (nis) => {
  const digits = String(nis ?? "").replace(/[^0-9]/g, "");
  const lastThree = digits.slice(-3).padStart(3, "0");
  return `${lastThree}-${randomLetters(3)}`;
};

export const useStudentManagement = ({
  activeAcademicYear,
  availableClasses,
  setLoading,
  showToast,
  loadSchoolData,
  currentUserId,
}) => {
  const [studentModal, setStudentModal] = useState({
    show: false,
    mode: "add",
    data: null,
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    type: "",
    data: null,
  });

  const [studentForm, setStudentForm] = useState({
    nis: "",
    full_name: "",
    gender: "L",
    class_id: "",
    is_active: true,
    // Penanda siswa pindahan dari sekolah lain -- kalau dicentang, abis
    // insert siswa baru bakal ikut nyatet 1 baris ke student_mutations
    // (type "masuk") biar ke-log rapi.
    is_pindahan: false,
    sekolah_asal: "",
    tanggal_masuk: new Date().toISOString().slice(0, 10),
  });

  const openStudentModal = useCallback((mode = "add", studentData = null) => {
    if (mode === "edit" && studentData) {
      setStudentForm({
        nis: studentData.nis,
        full_name: studentData.full_name,
        gender: studentData.gender,
        class_id: studentData.class_id || "",
        is_active: studentData.is_active,
        is_pindahan: false,
        sekolah_asal: "",
        tanggal_masuk: new Date().toISOString().slice(0, 10),
      });
    } else {
      setStudentForm({
        nis: "",
        full_name: "",
        gender: "L",
        class_id: "",
        is_active: true,
        is_pindahan: false,
        sekolah_asal: "",
        tanggal_masuk: new Date().toISOString().slice(0, 10),
      });
    }

    setStudentModal({ show: true, mode, data: studentData });
  }, []);

  const handleAddStudent = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ VALIDASI TAMBAHAN
      if (!activeAcademicYear) {
        showToast(
          "Tahun ajaran aktif tidak ditemukan! Silakan aktifkan tahun ajaran terlebih dahulu.",
          "error"
        );
        return;
      }

      if (!studentForm.nis.trim()) {
        showToast("NIS tidak boleh kosong!", "error");
        return;
      }

      if (!studentForm.full_name.trim()) {
        showToast("Nama siswa tidak boleh kosong!", "error");
        return;
      }

      if (!studentForm.class_id) {
        showToast("Silakan pilih kelas untuk siswa!", "error");
        return;
      }

      // ✅ Validasi khusus siswa pindahan
      if (studentForm.is_pindahan) {
        if (!studentForm.sekolah_asal.trim()) {
          showToast("Asal sekolah wajib diisi untuk siswa pindahan!", "error");
          return;
        }
        if (!studentForm.tanggal_masuk) {
          showToast("Tanggal masuk wajib diisi untuk siswa pindahan!", "error");
          return;
        }
      }

      // ✅ CEK NIS DUPLIKAT SEBELUM INSERT
      const { data: existingStudent, error: checkError } = await supabase
        .from("students")
        .select("nis")
        .eq("nis", studentForm.nis.trim())
        .maybeSingle();

      if (checkError) {
        console.error("Error checking NIS:", checkError);
        showToast("Error memeriksa NIS: " + checkError.message, "error");
        return;
      }

      if (existingStudent) {
        showToast(
          `❌ NIS ${studentForm.nis.trim()} sudah terdaftar! Gunakan NIS yang berbeda.`,
          "error"
        );
        return;
      }

      // ✅ INSERT dengan BOTH fields
      const { data: newStudent, error } = await supabase
        .from("students")
        .insert([
          {
            nis: studentForm.nis.trim(),
            full_name: studentForm.full_name.trim(),
            gender: studentForm.gender,
            class_id: studentForm.class_id,
            is_active: studentForm.is_active,
            academic_year: activeAcademicYear.year,
            academic_year_id: activeAcademicYear.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      // ✅ Kalau ditandai sebagai siswa pindahan, catat riwayatnya ke
      // student_mutations (type "masuk"). Kalau ini gagal, siswanya TETEP
      // udah kesimpen -- gak di-throw biar gak bikin TU bingung "siswa
      // ke-insert apa nggak", cukup dikasih tau lewat toast terpisah.
      if (studentForm.is_pindahan && newStudent?.id) {
        const { error: mutationError } = await supabase.from("student_mutations").insert({
          student_id: newStudent.id,
          type: "masuk",
          mutation_date: studentForm.tanggal_masuk,
          sekolah_asal: studentForm.sekolah_asal.trim(),
          created_by: currentUserId || null,
        });
        if (mutationError) {
          console.error("Error recording student mutation:", mutationError);
          showToast(
            "⚠️ Siswa tersimpan, tapi riwayat pindahan gagal dicatat: " + mutationError.message,
            "error"
          );
        }
      }

      // ✅ Auto-generate akun login (student_auth) buat siswa baru ini.
      // Sengaja soft-fail (gak throw) kayak logic student_mutations di
      // atas -- kalau ini gagal, siswanya TETEP udah kesimpen di
      // `students`, admin masih bisa bikinin akunnya manual lewat tab
      // "Portal Siswa > Akun Siswa". NIS udah dipastiin gak kosong &
      // gak duplikat dari validasi di atas, jadi aman dipakai jadi
      // username tanpa cek ulang.
      let authCreated = false;
      if (newStudent?.id) {
        const { error: authError } = await supabase.from("student_auth").insert({
          student_id: newStudent.id,
          username: sanitizeUsername(studentForm.nis),
          password: generateUniquePassword(studentForm.nis),
          is_active: studentForm.is_active,
        });
        if (authError) {
          console.error("Error creating student_auth:", authError);
          showToast(
            "⚠️ Siswa tersimpan, tapi akun login gagal dibuat otomatis: " +
              authError.message +
              ". Bisa dibuat manual lewat tab Akun Siswa.",
            "error"
          );
        } else {
          authCreated = true;
        }
      }

      showToast(
        authCreated ? "Siswa & akun login berhasil dibuat!" : "Siswa berhasil ditambahkan!",
        "success"
      );
      setStudentModal({ show: false, mode: "add", data: null });
      setStudentForm({
        nis: "",
        full_name: "",
        gender: "L",
        class_id: "",
        is_active: true,
        is_pindahan: false,
        sekolah_asal: "",
        tanggal_masuk: new Date().toISOString().slice(0, 10),
      });
      await loadSchoolData();
    } catch (error) {
      console.error("Error adding student:", error);

      // ✅ Handle specific duplicate key error
      if (error.code === "23505") {
        showToast(
          `❌ NIS ${studentForm.nis.trim()} sudah terdaftar! Gunakan NIS yang berbeda.`,
          "error"
        );
      } else {
        showToast("Error menambah siswa: " + error.message, "error");
      }
    } finally {
      setLoading(false);
    }
  }, [studentForm, activeAcademicYear, setLoading, showToast, loadSchoolData, currentUserId]);

  const handleEditStudent = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ VALIDASI SAMA UNTUK EDIT
      if (!studentForm.nis.trim()) {
        showToast("NIS tidak boleh kosong!", "error");
        return;
      }

      if (!studentForm.full_name.trim()) {
        showToast("Nama siswa tidak boleh kosong!", "error");
        return;
      }

      if (!studentForm.class_id) {
        showToast("Silakan pilih kelas untuk siswa!", "error");
        return;
      }

      // ✅ CEK NIS DUPLIKAT UNTUK EDIT (kecuali NIS sendiri)
      const { data: existingStudent, error: checkError } = await supabase
        .from("students")
        .select("nis, id")
        .eq("nis", studentForm.nis.trim())
        .maybeSingle();

      if (checkError) {
        console.error("Error checking NIS:", checkError);
        showToast("Error memeriksa NIS: " + checkError.message, "error");
        return;
      }

      // Cek apakah NIS sudah dipakai oleh siswa lain (bukan diri sendiri)
      if (existingStudent && existingStudent.id !== studentModal.data.id) {
        showToast(`❌ NIS ${studentForm.nis.trim()} sudah digunakan oleh siswa lain!`, "error");
        return;
      }

      const { error } = await supabase
        .from("students")
        .update({
          nis: studentForm.nis.trim(),
          full_name: studentForm.full_name.trim(),
          gender: studentForm.gender,
          class_id: studentForm.class_id || null,
          is_active: studentForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentModal.data.id);

      if (error) throw error;

      showToast("Siswa berhasil diupdate!", "success");
      setStudentModal({ show: false, mode: "add", data: null });
      setStudentForm({
        nis: "",
        full_name: "",
        gender: "L",
        class_id: "",
        is_active: true,
      });
      await loadSchoolData();
    } catch (error) {
      console.error("Error updating student:", error);

      // ✅ Handle specific duplicate key error
      if (error.code === "23505") {
        showToast(`❌ NIS ${studentForm.nis.trim()} sudah digunakan oleh siswa lain!`, "error");
      } else {
        showToast("Error mengupdate siswa: " + error.message, "error");
      }
    } finally {
      setLoading(false);
    }
  }, [studentForm, studentModal.data, setLoading, showToast, loadSchoolData]);

  const handleDeleteStudent = useCallback(
    async (studentId, mutationData = {}) => {
      try {
        setLoading(true);

        // ✅ SOFT DELETE: Set is_active = false instead of deleting
        const { error } = await supabase
          .from("students")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", studentId);

        if (error) throw error;

        // ✅ Nonaktifin akun login siswa juga.
        const { error: authError } = await supabase
          .from("student_auth")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("student_id", studentId);
        if (authError) throw authError;

        // ✅ Catat riwayat mutasi (type "keluar") -- ini yang sebelumnya
        // KELEWAT di sini (cuma ada di Students.js "Tandai Keluar/Pindah"
        // versi lama). Sekarang disamain, satu-satunya jalur nonaktifin
        // siswa (dari sini) selalu ninggalin jejak di student_mutations.
        // Soft-fail: siswa & akun udah kesimpen bener di atas, jangan
        // sampe gagal cuma gara-gara pencatatan riwayat ini.
        const { error: mutationError } = await supabase.from("student_mutations").insert({
          student_id: studentId,
          type: "keluar",
          mutation_date: mutationData.mutation_date || new Date().toISOString().slice(0, 10),
          sekolah_tujuan: mutationData.sekolah_tujuan || null,
          keterangan: mutationData.keterangan || null,
          class_id: mutationData.class_id || null,
          created_by: mutationData.created_by || null,
        });
        if (mutationError) {
          console.error("Error recording student_mutations:", mutationError);
          showToast(
            "⚠️ Siswa & akun dinonaktifkan, tapi riwayat mutasi gagal dicatat: " +
              mutationError.message,
            "error"
          );
        }

        showToast("Siswa & akun login berhasil dinonaktifkan!", "success");
        setDeleteConfirm({ show: false, type: "", data: null });
        await loadSchoolData();
      } catch (error) {
        console.error("Error deactivating student:", error);
        showToast("Error menonaktifkan siswa: " + error.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [setLoading, showToast, loadSchoolData]
  );

  const updateStudentClass = useCallback(
    async (studentId, newClassId) => {
      try {
        setLoading(true);
        const { error } = await supabase
          .from("students")
          .update({ class_id: newClassId || null })
          .eq("id", studentId);

        if (error) throw error;
        showToast("Kelas siswa berhasil diupdate!", "success");
        await loadSchoolData();
      } catch (error) {
        console.error("Error updating student class:", error);
        showToast("Error mengupdate kelas siswa", "error");
      } finally {
        setLoading(false);
      }
    },
    [setLoading, showToast, loadSchoolData]
  );

  return {
    studentModal,
    setStudentModal,
    deleteConfirm,
    setDeleteConfirm,
    studentForm,
    setStudentForm,
    openStudentModal,
    handleAddStudent,
    handleEditStudent,
    handleDeleteStudent,
    updateStudentClass,
  };
};
