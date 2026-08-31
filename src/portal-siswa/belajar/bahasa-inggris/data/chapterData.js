// src/students/belajar/bahasa-inggris/data/chapterData.js
// ========================================================================
// Data chapter Bahasa Inggris — DIPINDAH dari src/e-learning/EasyMateri.js
// (versi guru), bukan dihapus dari sana. Untuk sekarang ini masih file
// TERPISAH dari EasyMateri.js, artinya kalau lo edit soal/materi di salah
// satu file, HARUS disinkron manual ke file satunya. Ini utang teknis yang
// baru beneran kelar begitu datanya dipindah ke Supabase (jadi 1 sumber
// data buat versi guru & versi siswa).
//
// Catatan keamanan (buat diinget, belum dibenerin sekarang karena belum
// pake Supabase): `correctAnswers` di bawah ini bakal ikut ke-bundle ke
// JS yang dikirim ke BROWSER SISWA. Siswa yang ngerti DevTools bisa liat
// kunci jawabannya. Untuk kuis formatif kayak sekarang risikonya kecil,
// tapi kalau nanti kuis ini dipake buat nilai resmi, penilaian WAJIB
// dipindah ke server (edge function), bukan dicocokin di frontend kayak
// sekarang.
// ========================================================================

export const chapterData = [
  {
    num: 0,
    icon: "✨",
    title: "Chapter 0",
    subtitle: "The Beginning",
    description:
      "Materi dasar Bahasa Inggris: Mengenal Alfabet, Angka, Hari, Bulan, dan Salam (Greetings).",
    topics: ["Alphabets", "Numbers", "Greetings"],
    colors: {
      primary: "bg-indigo-500",
      secondary: "bg-purple-600",
      gradient: "from-[#5e60ce] to-[#8758ff]",
      text: "text-indigo-600",
      border: "border-indigo-500",
    },
  },
  {
    num: 1,
    icon: "👤",
    title: "Chapter 1",
    subtitle: "About Me",
    description:
      "Belajar cara memperkenalkan diri, mendeskripsikan hobi, dan menggambarkan teman-temanmu dalam Bahasa Inggris.",
    topics: ["Self Introduction", "Hobbies", "Describing People"],
    colors: {
      primary: "bg-blue-600",
      secondary: "bg-purple-700",
      gradient: "from-[#667eea] to-[#764ba2]",
      text: "text-blue-600",
      border: "border-blue-600",
    },
  },
  {
    num: 2,
    icon: "🍜",
    title: "Chapter 2",
    subtitle: "Culinary and Me",
    description:
      "Pelajari cara mendeskripsikan makanan favorit dan menulis resep dalam Bahasa Inggris.",
    topics: ["Food Vocabulary", "Recipe", "Procedure Text"],
    colors: {
      primary: "bg-pink-400",
      secondary: "bg-red-500",
      gradient: "from-[#f093fb] to-[#f5576c]",
      text: "text-pink-600",
      border: "border-pink-500",
    },
  },
  {
    num: 3,
    icon: "🏠",
    title: "Chapter 3",
    subtitle: "Home Sweet Home",
    description:
      "Deskripsikan rumahmu, ruangan favorit, dan pekerjaan rumah tangga dalam Bahasa Inggris.",
    topics: ["House & Rooms", "Prepositions", "Instructions"],
    colors: {
      primary: "bg-sky-400",
      secondary: "bg-cyan-500",
      gradient: "from-[#4facfe] to-[#00f2fe]",
      text: "text-sky-600",
      border: "border-sky-500",
    },
  },
  {
    num: 4,
    icon: "📚",
    title: "Chapter 4",
    subtitle: "My School Activities",
    description:
      "Ceritakan jadwal sekolah, kelas online, dan kebiasaan belajarmu.",
    topics: ["School Subjects", "Daily Routine", "Time Expressions"],
    colors: {
      primary: "bg-emerald-400",
      secondary: "bg-teal-500",
      gradient: "from-[#43e97b] to-[#38f9d7]",
      text: "text-emerald-600",
      border: "border-emerald-500",
    },
  },
  {
    num: 5,
    icon: "🏫",
    title: "Chapter 5",
    subtitle: "This is My School",
    description:
      "Jelaskan fasilitas sekolah, kegiatan ekstrakurikuler, dan acara sekolah.",
    topics: ["School Facilities", "Extracurricular", "Recount Text"],
    colors: {
      primary: "bg-yellow-400",
      secondary: "bg-orange-500",
      gradient: "from-[#fa709a] to-[#fee140]",
      text: "text-yellow-600",
      border: "border-yellow-500",
    },
  },
];

// Kunci jawaban. Lihat catatan keamanan di atas file ini.
export const correctAnswers = {
  0: { 1: "A", 2: "B", 3: "B", 4: "B" },
  1: {
    1: "B",
    2: "B",
    3: "B",
    4: "D",
    5: "C",
    6: "B",
    7: "D",
    8: "B",
    9: "C",
    10: "C",
  },
  2: { 1: "B", 2: "B", 3: "C", 4: "D" },
};

export const quizQuestionsMap = {
  0: [
    {
      id: 1,
      text: "1. What is the spelling for the letter 'U'?",
      options: ["A. /yu:/", "B. /ju:/", "C. /ou/", "D. /i:/"],
    },
    {
      id: 2,
      text: "2. Which word is a Cardinal Number?",
      options: ["A. Second", "B. Twelve", "C. Tenth", "D. Fifth"],
    },
    {
      id: 3,
      text: "3. If today is Monday, what day is tomorrow?",
      options: ["A. Sunday", "B. Tuesday", "C. Thursday", "D. Friday"],
    },
    {
      id: 4,
      text: "4. What do you say when you want your friend to stop talking?",
      options: [
        "A. Stand up!",
        "B. Listen to me!",
        "C. Open your book!",
        "D. Good afternoon!",
      ],
    },
  ],
  1: [
    {
      id: 1,
      text: '1. "My name _____ Siti and I _____ from Jakarta."',
      options: ["A. am / is", "B. is / am", "C. are / am", "D. am / are"],
    },
    {
      id: 2,
      text: '2. "She _____ playing badminton every Sunday."',
      options: ["A. like", "B. likes", "C. liking", "D. to like"],
    },
    {
      id: 3,
      text: "3. Which sentence is correct?",
      options: [
        "A. He have long hair",
        "B. He has long hair",
        "C. He having long hair",
        "D. He is have long hair",
      ],
    },
    {
      id: 4,
      text: '4. "I _____ go to the library. I go there every day."',
      options: ["A. never", "B. rarely", "C. sometimes", "D. always"],
    },
    {
      id: 5,
      text: "5. What is the correct order for describing a person?",
      options: [
        "A. Personality - Identification - Physical appearance",
        "B. Physical appearance - Identification - Personality",
        "C. Identification - Physical appearance - Personality",
        "D. Identification - Personality - Physical appearance",
      ],
    },
    {
      id: 6,
      text: '6. "My sister is very _____. She always helps people."',
      options: ["A. tall", "B. kind", "C. curly", "D. short"],
    },
    {
      id: 7,
      text: "7. Choose the sentence with the correct Simple Present Tense:",
      options: [
        "A. They doesn't like Math",
        "B. She don't likes English",
        "C. He doesn't likes music",
        "D. We don't like swimming",
      ],
    },
    {
      id: 8,
      text: '8. "_____ is your hobby?" - "I like reading books."',
      options: ["A. Who", "B. What", "C. Where", "D. When"],
    },
    {
      id: 9,
      text: "9. Which word describes physical appearance?",
      options: ["A. friendly", "B. smart", "C. tall", "D. kind"],
    },
    {
      id: 10,
      text: '10. "In my free time, I _____ play video games with my brother."',
      options: ["A. am", "B. is", "C. often", "D. have"],
    },
  ],
  2: [
    {
      id: 1,
      text: "1. Choose the correct imperative sentence for a recipe.",
      options: [
        "A. She mixes the flour",
        "B. Mix the flour",
        "C. They mixing the flour",
        "D. To mix the flour",
      ],
    },
    {
      id: 2,
      text: "2. After heating the water, _____ add the noodles.",
      options: ["A. Finally", "B. Then", "C. First", "D. Goal"],
    },
    {
      id: 3,
      text: "3. Chili is very _____. It makes my mouth burn.",
      options: ["A. sweet", "B. sour", "C. spicy", "D. salty"],
    },
    {
      id: 4,
      text: "4. Which part lists the tools and items needed?",
      options: ["A. Steps", "B. Goal", "C. Conclusion", "D. Ingredients"],
    },
  ],
};
