// [file name]: setting/teacher-profiles/TeachingAssignmentsSection.js
// Section "Penugasan Mengajar": stats (total sesi, mapel, kelas, wali kelas)
// + daftar penugasan tahun ajaran aktif, dengan toggle buat liat riwayat
// penugasan tahun-tahun sebelumnya. Data (assignments) & handler toggle
// dikirim dari ProfileTab.js, section ini murni presentational.
import React from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  History,
  School,
  Calendar,
} from "lucide-react";
import Card from "../../components/ui/Card";
import { SectionTitle, Text, Muted } from "../../components/ui/Typography";

const getClassName = (assignment) => {
  if (assignment.classes?.id) return `Kelas ${assignment.classes.id}`;
  if (assignment.classes?.grade) return `Kelas ${assignment.classes.grade}`;
  return `Kelas ${assignment.class_id}`;
};

// Palet warna per mata pelajaran -- biar kartu guru yang ngajar 2+ mapel
// gampang dibedain sekilas mata (bukan cuma beda teks). Warna dipilih
// deterministik dari nama mapel (getSubjectTheme), jadi mapel yang sama
// selalu dapet warna yang sama di mana pun dia muncul (list aktif & riwayat).
const SUBJECT_THEMES = [
  {
    card: "from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 border-blue-200 dark:border-gray-600",
    badge:
      "from-blue-200 to-blue-300 dark:from-gray-600 dark:to-gray-700 border-blue-300 dark:border-gray-500",
    icon: "text-blue-500 dark:text-blue-400",
  },
  {
    card: "from-orange-50 to-white dark:from-orange-900/10 dark:to-gray-800/30 border-orange-200 dark:border-orange-800/60",
    badge:
      "from-orange-200 to-orange-300 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-300 dark:border-orange-700",
    icon: "text-orange-500 dark:text-orange-400",
  },
  {
    card: "from-purple-50 to-white dark:from-purple-900/10 dark:to-gray-800/30 border-purple-200 dark:border-purple-800/60",
    badge:
      "from-purple-200 to-purple-300 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-300 dark:border-purple-700",
    icon: "text-purple-500 dark:text-purple-400",
  },
  {
    card: "from-emerald-50 to-white dark:from-emerald-900/10 dark:to-gray-800/30 border-emerald-200 dark:border-emerald-800/60",
    badge:
      "from-emerald-200 to-emerald-300 dark:from-emerald-900/30 dark:to-emerald-800/30 border-emerald-300 dark:border-emerald-700",
    icon: "text-emerald-500 dark:text-emerald-400",
  },
  {
    card: "from-pink-50 to-white dark:from-pink-900/10 dark:to-gray-800/30 border-pink-200 dark:border-pink-800/60",
    badge:
      "from-pink-200 to-pink-300 dark:from-pink-900/30 dark:to-pink-800/30 border-pink-300 dark:border-pink-700",
    icon: "text-pink-500 dark:text-pink-400",
  },
];

const getSubjectTheme = (subject, subjectThemeMap) =>
  (subject && subjectThemeMap?.[subject]) || SUBJECT_THEMES[0];

// Bikin peta mapel -> tema warna berdasarkan URUTAN KEMUNCULAN (bukan hash
// nama mapel) -- soalnya hash bisa collision (2 mapel beda jatuh ke index
// warna yang sama, kejadian nyata: "Bahasa Inggris" & "Pendidikan
// Pancasila" dulu sama-sama kena pink). Dengan urutan kemunculan, mapel
// pertama guru itu pasti tema #0, mapel kedua pasti tema #1, dst -- gak
// akan collision selama guru itu ngajar < 5 mapel berbeda.
const buildSubjectThemeMap = (subjects) => {
  const map = {};
  let idx = 0;
  subjects.forEach((subject) => {
    if (subject && !(subject in map)) {
      map[subject] = SUBJECT_THEMES[idx % SUBJECT_THEMES.length];
      idx += 1;
    }
  });
  return map;
};

// Kartu 1 statistik (dipake 4x di stats bar)
const StatCard = ({ icon: Icon, iconColorClass, iconBgClass, value, label, darkMode }) => (
  <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
    <div className="flex items-center gap-2 sm:gap-3 mb-2">
      <div className={`rounded-lg p-1.5 sm:p-2 ${iconBgClass}`}>
        <Icon size={14} className={iconColorClass} />
      </div>
      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
    <Muted darkMode={darkMode} className="font-medium">
      {label}
    </Muted>
  </div>
);

// 1 baris penugasan (dipake di list current & di dalam riwayat). Selalu
// stack vertikal (bukan flex-row di layar besar) karena kartu ini dipasang
// di grid 2 kolom mulai dari mobile -- lebar kartu jadi separuh, jadi info
// subject/kelas/badge semua ditumpuk ke bawah biar gak sesak.
const AssignmentRow = ({ assignment, darkMode, compact = false, subjectThemeMap }) => {
  const theme = getSubjectTheme(assignment.subject, subjectThemeMap);

  return (
    <div
      className={`h-full bg-gradient-to-r ${theme.card} rounded-lg sm:rounded-xl border transition-all ${
        compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4 hover:shadow-lg hover:-translate-y-0.5"
      }`}
    >
      <div className="flex flex-col justify-between gap-2 h-full">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Text
              darkMode={darkMode}
              className={`font-bold flex-1 min-w-0 truncate ${
                compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
              }`}
            >
              {assignment.subject}
            </Text>
            {!compact && (
              <span
                className={`flex-shrink-0 bg-gradient-to-r ${theme.badge} border text-gray-800 dark:text-gray-300 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap`}
              >
                Sem {assignment.semester}
              </span>
            )}
          </div>
          {compact ? (
            <Muted darkMode={darkMode} className="block mt-0.5">
              {getClassName(assignment)}
            </Muted>
          ) : (
            <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mt-1.5 flex items-center gap-1.5">
              <School size={16} className={`flex-shrink-0 ${theme.icon}`} />
              <span className="truncate">{getClassName(assignment)}</span>
            </p>
          )}
        </div>
        {compact && (
          <span
            className={`self-start bg-gradient-to-r ${theme.badge} text-gray-800 dark:text-gray-300 px-2 py-0.5 sm:py-1 rounded-lg font-medium text-xs`}
          >
            {assignment.academic_year}
          </span>
        )}
      </div>
    </div>
  );
};

const TeachingAssignmentsSection = ({
  profileData,
  activeAcademicInfo,
  currentAssignments,
  historyYears,
  showHistory,
  onToggleHistory,
  loadingHistory,
  darkMode,
}) => {
  const uniqueSubjects = new Set(currentAssignments.map((a) => a.subject)).size;
  const totalClasses = new Set(currentAssignments.map((a) => a.class_id)).size;

  // Urutan sumber subjectThemeMap: current dulu baru riwayat, biar mapel
  // yang lagi aktif diajar sekarang dapet warna "duluan" (tema #0, #1, ...)
  // dan warnanya tetap sama persis pas mapel yang sama muncul lagi di riwayat.
  const historyAssignmentsFlat = historyYears.flatMap((yearGroup) =>
    Object.values(yearGroup.semesters).flat()
  );
  const subjectThemeMap = buildSubjectThemeMap([
    ...currentAssignments.map((a) => a.subject),
    ...historyAssignmentsFlat.map((a) => a.subject),
  ]);

  return (
    <Card darkMode={darkMode}>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <SectionTitle darkMode={darkMode} className="flex items-center gap-2 mb-0">
          <BookOpen size={18} className="text-orange-600" />
          Penugasan Mengajar
        </SectionTitle>
        {profileData.teacher_id && (
          <button
            onClick={onToggleHistory}
            disabled={loadingHistory}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50 min-h-[44px] px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
          >
            {loadingHistory ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-blue-600"></div>
            ) : showHistory ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
            <span className="hidden sm:inline">
              {showHistory ? "Sembunyikan Riwayat" : "Tampilkan Riwayat"}
            </span>
            <span className="sm:hidden">{showHistory ? "Tutup" : "Riwayat"}</span>
          </button>
        )}
      </div>

      {/* Stats Bar - Current Year */}
      {!showHistory && (
        <>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 border-b pb-3 border-blue-100 dark:border-gray-700">
            Statistik Penugasan Tahun Ajaran Aktif ({activeAcademicInfo?.displayText || "N/A"})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard
              icon={Calendar}
              iconBgClass="bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/20 dark:to-orange-800/20"
              iconColorClass="text-orange-600"
              value={activeAcademicInfo?.year || activeAcademicInfo?.displayText || "-"}
              label="Tahun Ajaran Aktif"
              darkMode={darkMode}
            />
            <StatCard
              icon={Award}
              iconBgClass="bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20"
              iconColorClass="text-purple-600"
              value={uniqueSubjects}
              label="Mata Pelajaran"
              darkMode={darkMode}
            />
            <StatCard
              icon={Users}
              iconBgClass="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20"
              iconColorClass="text-blue-600"
              value={totalClasses}
              label="Kelas Diampu"
              darkMode={darkMode}
            />
            <StatCard
              icon={History}
              iconBgClass="bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20"
              iconColorClass="text-green-600"
              value={profileData.homeroom_class?.id || "-"}
              label="Wali Kelas"
              darkMode={darkMode}
            />
          </div>

          {/* Current Assignments List */}
          {currentAssignments.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {currentAssignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  darkMode={darkMode}
                  subjectThemeMap={subjectThemeMap}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl p-6 sm:p-8 md:p-12 shadow-sm border border-blue-200 dark:border-gray-600 text-center">
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-600 dark:to-gray-700 rounded-full p-4 sm:p-6 w-fit mx-auto mb-4">
                <BookOpen size={32} className="text-blue-400 dark:text-gray-500" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                Belum Ada Tugas Mengajar
              </h3>
              <Muted darkMode={darkMode}>
                Anda belum memiliki mata pelajaran untuk tahun ajaran ini.
              </Muted>
            </div>
          )}
        </>
      )}

      {/* History Assignments List */}
      {showHistory && (
        <div className="mt-4 sm:mt-6 border-t pt-3 sm:pt-4 border-blue-100 dark:border-gray-700">
          <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
            Riwayat Penugasan Mengajar
          </p>
          <div className="space-y-4 sm:space-y-6">
            {historyYears.map((yearGroup) => (
              <div key={yearGroup.year}>
                <h4 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 mb-2 sm:mb-3 border-l-4 border-orange-400 pl-2 sm:pl-3">
                  Tahun Ajaran {yearGroup.year}
                </h4>
                <div className="space-y-3 sm:space-y-4 ml-2">
                  {Object.entries(yearGroup.semesters).map(([semester, assignments]) => (
                    <div key={semester} className="space-y-1.5 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-400 flex items-center gap-1.5">
                        <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
                        Semester {semester}
                      </p>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 pl-3 sm:pl-4 border-l border-blue-200 dark:border-gray-600">
                        {assignments.map((assignment) => (
                          <AssignmentRow
                            key={assignment.id}
                            assignment={assignment}
                            darkMode={darkMode}
                            compact
                            subjectThemeMap={subjectThemeMap}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TeachingAssignmentsSection;
