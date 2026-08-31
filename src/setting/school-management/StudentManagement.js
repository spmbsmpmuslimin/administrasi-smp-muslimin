// StudentManagement.js
import { useState, useCallback } from "react";
import { supabase } from "../../supabaseClient"; // INI 100% BENAR

export const useStudentManagement = ({
  activeAcademicYear,
  availableClasses,
  setLoading,
  showToast,
  loadSchoolData,
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
  });

  const openStudentModal = useCallback((mode = "add", studentData = null) => {
    if (mode === "edit" && studentData) {
      setStudentForm({
        nis: studentData.nis,
        full_name: studentData.full_name,
        gender: studentData.gender,
        class_id: studentData.class_id || "",
        is_active: studentData.is_active,
      });
    } else {
      setStudentForm({
        nis: "",
        full_name: "",
        gender: "L",
        class_id: "",
        is_active: true,
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
      const { error } = await supabase.from("students").insert([
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
      ]);

      if (error) throw error;

      showToast("Siswa berhasil ditambahkan!", "success");
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
  }, [studentForm, activeAcademicYear, setLoading, showToast, loadSchoolData]);

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
    async (studentId) => {
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

        showToast("Siswa berhasil dinonaktifkan!", "success");
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
