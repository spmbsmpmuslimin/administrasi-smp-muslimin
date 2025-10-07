import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Eye, CheckCircle, AlertTriangle, RefreshCw, Plus } from 'lucide-react';

const AcademicYearTab = ({ user, loading, setLoading, showToast, schoolConfig }) => {
  const [schoolStats, setSchoolStats] = useState({
    academic_year: '2024/2025',
    total_students: 0
  });
  const [studentsByClass, setStudentsByClass] = useState({});
  const [yearTransition, setYearTransition] = useState({
    preview: null,
    newYear: '',
    inProgress: false
  });

  // ✅ Default config jika schoolConfig belum loaded
  const config = schoolConfig || {
    schoolName: 'SMP Muslimin Cililin',
    schoolLevel: 'SMP',
    grades: ['7', '8', '9']
  };

  const graduatingGrade = config.grades[config.grades.length - 1];

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    try {
      setLoading(true);
      
      // Load school settings for academic year
      const { data: settingsData, error: settingsError } = await supabase
        .from('school_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'current_academic_year');
      
      if (settingsError) throw settingsError;

      const academicYear = settingsData?.[0]?.setting_value || '2024/2025';
      
      // ✅ QUERY SAMA PERSIS KAYAK DI STUDENTS.JS - TERBUKTI WORK
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id, 
          nis, 
          full_name, 
          gender, 
          class_id, 
          is_active,
          classes (
            id,
            grade,
            academic_year
          )
        `)
        .eq('is_active', true)
        .order('full_name');
      
      if (studentsError) throw studentsError;
      
      console.log('🔍 DEBUG - All students with classes:', studentsData);
      
      // ✅ GROUPING SEDERHANA - PASTI WORK
      const studentsByClass = {};
      
      // Inisialisasi semua kelas dari config
      config.grades.forEach(grade => {
        studentsByClass[grade] = [];
      });
      
      // Group students by class grade
      studentsData?.forEach(student => {
        const grade = student.classes?.grade;
        console.log(`Student ${student.full_name} - class_id: ${student.class_id} - grade: ${grade}`);
        
        if (grade && studentsByClass[grade]) {
          studentsByClass[grade].push(student);
        }
      });
      
      console.log('🔍 DEBUG - Final grouping:', studentsByClass);
      
      setStudentsByClass(studentsByClass);
      setSchoolStats({
        academic_year: academicYear,
        total_students: studentsData?.length || 0
      });
      
    } catch (error) {
      console.error('Error loading school data:', error);
      showToast('Gagal memuat data sekolah: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateYearTransitionPreview = () => {
    const currentYear = schoolStats.academic_year;
    const [startYear] = currentYear.split('/');
    const newYear = `${parseInt(startYear) + 1}/${parseInt(startYear) + 2}`;
    
    const promotionPlan = {};
    const graduatingStudents = [];
    
    Object.entries(studentsByClass).forEach(([grade, students]) => {
      // Promotion Logic: 7 → 8, 8 → 9, 9 → LULUS
      if (grade === graduatingGrade) {
        graduatingStudents.push(...students);
      } else if (config.grades.includes(grade)) {
        const currentIndex = config.grades.indexOf(grade);
        if (currentIndex < config.grades.length - 1) {
          const nextGrade = config.grades[currentIndex + 1];
          if (!promotionPlan[nextGrade]) {
            promotionPlan[nextGrade] = [];
          }
          promotionPlan[nextGrade].push(...students);
        }
      }
    });
    
    setYearTransition({
      preview: {
        currentYear,
        newYear,
        promotions: promotionPlan,
        graduating: graduatingStudents
      },
      newYear,
      inProgress: false
    });
  };

  // ✅ Helper function untuk create kelas baru
  const createNewClasses = async (newYear) => {
    const classesToCreate = [];
    
    for (const grade of config.grades) {
      classesToCreate.push({
        grade: grade,
        academic_year: newYear
      });
    }
    
    const { data, error } = await supabase
      .from('classes')
      .insert(classesToCreate)
      .select();
    
    if (error) throw error;
    return data;
  };

  const executeYearTransition = async () => {
    const confirmed = window.confirm(
      `PERINGATAN: Tindakan ini akan:\n\n` +
      `1. Membuat kelas baru untuk tahun ajaran ${yearTransition.newYear}\n` +
      `2. Menaikkan semua siswa ke kelas berikutnya\n` +
      `3. Meluluskan siswa kelas ${graduatingGrade}\n` +
      `4. Mereset assignment guru\n` +
      `5. Mengubah tahun ajaran menjadi ${yearTransition.newYear}\n\n` +
      `Tindakan ini TIDAK DAPAT DIBATALKAN. Apakah Anda yakin?`
    );
    
    if (!confirmed) return;
    
    try {
      setLoading(true);
      setYearTransition(prev => ({ ...prev, inProgress: true }));
      
      const { preview } = yearTransition;
      
      // ✅ STEP 1: Create new classes untuk tahun ajaran baru
      showToast('Membuat kelas baru...', 'info');
      const newClasses = await createNewClasses(yearTransition.newYear);
      
      // Map grade ke class_id
      const gradeToClassId = {};
      newClasses.forEach(cls => {
        gradeToClassId[cls.grade] = cls.id;
      });
      
      // ✅ STEP 2: Handle graduating students (Kelas terakhir, misal IX)
      if (preview.graduating.length > 0) {
        showToast(`Meluluskan ${preview.graduating.length} siswa...`, 'info');
        const graduatingIds = preview.graduating.map(s => s.id);
        
        const { error: graduateError } = await supabase
          .from('students')
          .update({ is_active: false })
          .in('id', graduatingIds);
        
        if (graduateError) throw graduateError;
      }
      
      // ✅ STEP 3: Handle promotions - update class_id ke kelas baru
      for (const [newGrade, students] of Object.entries(preview.promotions)) {
        const newClassId = gradeToClassId[newGrade];
        
        if (!newClassId) {
          throw new Error(`Kelas ${newGrade} belum dibuat untuk tahun ajaran ${yearTransition.newYear}`);
        }
        
        showToast(`Menaikkan ${students.length} siswa ke kelas ${newGrade}...`, 'info');
        
        const studentIds = students.map(s => s.id);
        
        const { error: promoteError } = await supabase
          .from('students')
          .update({ class_id: newClassId })
          .in('id', studentIds);
        
        if (promoteError) throw promoteError;
      }
      
      // ✅ STEP 4: Reset teacher assignments
      showToast('Mereset assignment guru...', 'info');
      const { error: teacherResetError } = await supabase
        .from('teacher_assignments')
        .delete()
        .eq('academic_year', schoolStats.academic_year);
      
      if (teacherResetError) throw teacherResetError;
      
      // ✅ STEP 5: Update academic year in settings
      const { error: settingError } = await supabase
        .from('school_settings')
        .upsert({ 
          setting_key: 'current_academic_year',
          setting_value: yearTransition.newYear 
        }, {
          onConflict: 'setting_key'
        });
      
      if (settingError) throw settingError;
      
      setSchoolStats(prev => ({ ...prev, academic_year: yearTransition.newYear }));
      
      showToast(
        `✅ Tahun ajaran ${yearTransition.newYear} berhasil dimulai!\n\n` +
        `• ${preview.graduating.length} siswa lulus\n` +
        `• ${Object.values(preview.promotions).flat().length} siswa naik kelas\n` +
        `• Silakan assign guru ke kelas baru`,
        'success'
      );
      
      await loadSchoolData();
      setYearTransition({ preview: null, newYear: '', inProgress: false });
      
    } catch (error) {
      console.error('Error executing year transition:', error);
      showToast('Error memulai tahun ajaran baru: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setYearTransition(prev => ({ ...prev, inProgress: false }));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Manajemen Tahun Ajaran</h2>
            <p className="text-gray-600 text-sm">{config.schoolName} - {config.schoolLevel}</p>
          </div>
        </div>
      </div>
      
      {/* Current Academic Year */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg mb-8 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-blue-600" size={20} />
              <h3 className="text-sm font-medium text-blue-800">Tahun Ajaran Aktif</h3>
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-1">{schoolStats.academic_year}</p>
            <p className="text-blue-700 text-sm">
              <span className="font-semibold">{schoolStats.total_students}</span> siswa aktif dalam{' '}
              <span className="font-semibold">{Object.keys(studentsByClass).filter(grade => studentsByClass[grade].length > 0).length}</span> kelas
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Total Kelas</p>
              <p className="text-2xl font-bold text-blue-600">
                {Object.keys(studentsByClass).filter(grade => studentsByClass[grade].length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Students by Grade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {config.grades.map(grade => {
          const students = studentsByClass[grade] || [];
          return (
            <div key={grade} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">Kelas {grade}</h4>
                <span className="text-2xl font-bold text-blue-600">{students.length}</span>
              </div>
              <p className="text-sm text-gray-600">
                {students.length === 0 ? 'Belum ada siswa' : `${students.length} siswa aktif`}
              </p>
              {/* DEBUG INFO YANG MENGGUNAKAN STUDENTSDATA DIHAPUS/DIKOMENTARI */}
              {/* {students.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Class ID: {studentsData?.find(s => s.classes?.grade === grade)?.class_id || 'Tidak ada'}
                </p>
              )} */}
            </div>
          );
        })}
      </div>

      {/* Year Transition */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Transisi Tahun Ajaran</h3>
            <p className="text-gray-600 text-sm">
              Kelola perpindahan ke tahun ajaran berikutnya
            </p>
          </div>
          
          {!yearTransition.preview && (
            <button
              onClick={generateYearTransitionPreview}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Eye size={16} />
              Preview Naik Kelas
            </button>
          )}
        </div>
        
        {/* Transition Preview */}
        {yearTransition.preview && (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <h4 className="font-semibold text-gray-800 text-lg">
                  Preview Transisi Tahun Ajaran
                </h4>
                <p className="text-sm text-gray-600">
                  {yearTransition.preview.currentYear} → {yearTransition.preview.newYear}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Promotions */}
              <div>
                <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Plus size={16} className="text-blue-600" />
                  Siswa Naik Kelas
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(yearTransition.preview.promotions).map(([grade, students]) => (
                    <div key={grade} className="bg-white p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-700">→ Kelas {grade}</span>
                        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                          {students.length} siswa
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Graduating */}
              <div>
                <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  Siswa Lulus
                </h5>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-700">Kelas {graduatingGrade} → Lulus</span>
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                      {yearTransition.preview.graduating.length} siswa
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Execute Button */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-yellow-900 font-semibold mb-2">⚠️ Peringatan: Tindakan Permanen</p>
                  <ul className="text-yellow-800 text-sm space-y-1 mb-4 list-disc list-inside">
                    <li>Kelas baru akan dibuat untuk tahun ajaran {yearTransition.preview.newYear}</li>
                    <li>Semua siswa akan naik kelas ({config.grades.slice(0, -1).join('→')})</li>
                    <li>Siswa kelas {graduatingGrade} akan diluluskan (status: tidak aktif)</li>
                    <li>Assignment guru akan direset (perlu assign ulang)</li>
                    <li>Tahun ajaran berubah ke {yearTransition.preview.newYear}</li>
                  </ul>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={executeYearTransition}
                      disabled={loading || yearTransition.inProgress}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold transition"
                    >
                      {yearTransition.inProgress ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Mulai Tahun Ajaran Baru
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setYearTransition({ preview: null, newYear: '', inProgress: false })}
                      disabled={yearTransition.inProgress}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-medium transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicYearTab;