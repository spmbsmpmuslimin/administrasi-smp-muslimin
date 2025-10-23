import React, { useState } from "react";
import {
  BookOpen,
  Users,
  Clock,
  Target,
  CheckCircle,
  FileText,
  Monitor,
  Printer,
} from "lucide-react";

const EasyModul = () => {
  const [namaSekolah, setNamaSekolah] = useState("SMP Muslimin Cililin");
  const [namaGuru, setNamaGuru] = useState("");
  const [mapel, setMapel] = useState("Bahasa Inggris");
  const [kelas, setKelas] = useState("7");
  const [chapter, setChapter] = useState("Chapter 1 - About Me");
  const [topik, setTopik] = useState("Unit 1 - Galang from Kalimantan");
  const [alokasiWaktu, setAlokasiWaktu] = useState("2");
  const [dimensi, setDimensi] = useState(["Komunikasi", "Kolaborasi"]);
  const [loading, setLoading] = useState(false);
  const [hasilModul, setHasilModul] = useState(null);
  const [error, setError] = useState("");

  const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  const semuaDimensi = [
    "Keimanan dan Ketakwaan",
    "Kewargaan",
    "Penalaran Kritis",
    "Kreativitas",
    "Kolaborasi",
    "Kemandirian",
    "Kesehatan",
    "Komunikasi",
  ];

  const gradeData = {
    7: {
      "Chapter 1 – About Me": {
        "Unit 1 – Galang from Kalimantan": {
          pages: "14-27",
          skills: "Listening, Speaking",
          grammar: "Simple Present Tense, WH-Questions",
          vocabulary: "Personal information, greetings, introductions",
          textType: "Conversation",
        },
        "Unit 2 – I Love Fishing": {
          pages: "28-39",
          skills: "Listening, Speaking, Reading",
          grammar: "Simple Present Tense, Frequency adverbs, Pronouns",
          vocabulary: "Hobbies, activities, frequency expressions",
          textType: "Descriptive",
        },
        "Unit 3 – My Friends and I": {
          pages: "40-53",
          skills: "Writing, Presenting, Reading",
          grammar: "Simple Present Tense, Descriptive adjectives",
          vocabulary: "Physical appearance, personality, daily activities",
          textType: "Descriptive",
        },
      },
      "Chapter 2 – Culinary and Me": {
        "Unit 1 – My Favorite Food": {
          pages: "54-67",
          skills: "Speaking, Listening",
          grammar: "Simple Present Tense, Like/Dislike expressions",
          vocabulary: "Food, drinks, taste, preferences",
          textType: "Conversation",
        },
        "Unit 2 – My Favorite Snack": {
          pages: "68-79",
          skills: "Reading, Writing",
          grammar: "Simple Present Tense, Quantifiers (some, any, much, many)",
          vocabulary: "Snacks, ingredients, healthy/unhealthy food",
          textType: "Descriptive",
        },
        "Unit 3 – A Secret Recipe": {
          pages: "80-93",
          skills: "Reading, Writing, Speaking",
          grammar: "Imperative sentences, Sequence markers",
          vocabulary: "Cooking verbs, kitchen utensils, recipe instructions",
          textType: "Procedure",
        },
      },
      "Chapter 3 – Home Sweet Home": {
        "Unit 1 – My House": {
          pages: "94-107",
          skills: "Speaking, Listening",
          grammar: "There is/There are, Prepositions of place",
          vocabulary: "Rooms, furniture, household items",
          textType: "Descriptive",
        },
        "Unit 2 – My House Chores": {
          pages: "108-119",
          skills: "Speaking, Writing",
          grammar: "Simple Present Tense, Daily routine expressions",
          vocabulary: "Household chores, cleaning activities, responsibility",
          textType: "Descriptive",
        },
        "Unit 3 – Let's Clean Up!": {
          pages: "120-133",
          skills: "Speaking, Listening",
          grammar: "Imperative sentences, Let's + verb",
          vocabulary: "Cleaning tools, teamwork, environmental care",
          textType: "Procedure",
        },
      },
      "Chapter 4 – My School Activities": {
        "Unit 1 – My Class Schedule": {
          pages: "134-147",
          skills: "Reading, Writing",
          grammar: "Time expressions, Days of the week, Simple Present",
          vocabulary: "School subjects, time, daily schedule",
          textType: "Descriptive",
        },
        "Unit 2 – My Online Class": {
          pages: "148-159",
          skills: "Listening, Speaking",
          grammar: "Present Continuous Tense, Technology expressions",
          vocabulary: "Online learning, technology, digital literacy",
          textType: "Conversation",
        },
        "Unit 3 – My Study Habits": {
          pages: "160-173",
          skills: "Writing, Presenting",
          grammar: "Frequency adverbs, Simple Present Tense",
          vocabulary: "Study methods, learning strategies, academic habits",
          textType: "Descriptive",
        },
      },
      "Chapter 5 – This is My School": {
        "Unit 1 – School Buildings": {
          pages: "174-187",
          skills: "Speaking, Reading",
          grammar: "There is/There are, Prepositions of place",
          vocabulary: "School facilities, buildings, directions",
          textType: "Descriptive",
        },
        "Unit 2 – Extracurricular Activities": {
          pages: "188-199",
          skills: "Listening, Speaking",
          grammar: "Simple Present Tense, Can/Cannot for abilities",
          vocabulary: "Sports, clubs, talents, interests",
          textType: "Conversation",
        },
        "Unit 3 – School Festival": {
          pages: "200-213",
          skills: "Writing, Presenting",
          grammar: "Future tense (will/going to), Event planning",
          vocabulary: "Events, celebrations, planning, teamwork",
          textType: "Descriptive",
        },
      },
    },
    8: {
      "Chapter 1 – Celebrating Independence Day": {
        "Unit 1 – The Champion of Panjat Pinang": {
          pages: "14-27",
          skills: "Reading, Writing, Speaking",
          grammar: "Past Tense, Time expressions, Sequence markers",
          vocabulary:
            "Independence Day, traditional games, competition, celebration",
          textType: "Recount Text",
        },
        "Unit 2 – Going to a Parade": {
          pages: "28-39",
          skills: "Listening, Speaking, Writing",
          grammar: "Past Continuous, Past Tense, Descriptive adjectives",
          vocabulary: "Parade, ceremony, patriotism, national symbols, crowd",
          textType: "Recount Text",
        },
        "Unit 3 – Independence Day at SMP Merdeka": {
          pages: "40-53",
          skills: "Writing, Presenting, Reading",
          grammar: "Past Tense, Narrative connectors, Time sequences",
          vocabulary: "School celebration, flag ceremony, performances, unity",
          textType: "Recount Text",
        },
      },
      "Chapter 2 – Kindness Begins with Me": {
        "Unit 1 – Kindness Towards Differences (The Ugly Duckling)": {
          pages: "54-67",
          skills: "Reading, Speaking, Critical Thinking",
          grammar: "Past Tense, Direct/Indirect speech, Character descriptions",
          vocabulary:
            "Differences, acceptance, bullying, transformation, self-worth",
          textType: "Narrative Text",
        },
        "Unit 2 – Kindness and Happiness (Elephant and Friends)": {
          pages: "68-79",
          skills: "Reading, Writing, Moral reasoning",
          grammar: "Past Tense, Dialogue, Emotional expressions",
          vocabulary: "Friendship, kindness, sharing, cooperation, happiness",
          textType: "Narrative Text",
        },
        "Unit 3 – Kindness and Friendship": {
          pages: "80-93",
          skills: "Writing, Presenting, Creative storytelling",
          grammar: "Narrative tenses, Character development, Plot structure",
          vocabulary: "Empathy, compassion, helping others, moral values",
          textType: "Narrative Text",
        },
      },
      "Chapter 3 – Love Our World": {
        "Unit 1 – Look Around You": {
          pages: "94-107",
          skills: "Reading, Speaking, Environmental awareness",
          grammar: "Present Tense, Imperative, Modal verbs (should, must)",
          vocabulary:
            "Water conservation, health habits, environmental protection",
          textType: "Procedure & Descriptive",
        },
        "Unit 2 – This is the Way": {
          pages: "108-119",
          skills: "Writing, Creating, Digital literacy",
          grammar:
            "Imperative sentences, Step-by-step instructions, Present Tense",
          vocabulary:
            "Poster making, social media, campaigns, visual communication",
          textType: "Procedure Text",
        },
        "Unit 3 – Act Now": {
          pages: "120-133",
          skills: "Presenting, Campaigning, Social action",
          grammar:
            "Imperative, Persuasive language, Future tense (will/going to)",
          vocabulary:
            "Environmental campaigns, action words, urgency, responsibility",
          textType: "Descriptive & Hortatory",
        },
      },
      "Chapter 4 – No Littering": {
        "Unit 1 – Did It Rain Last Night?": {
          pages: "134-147",
          skills: "Reading, Listening, Cause-effect analysis",
          grammar: "Past Tense, Question formation, Weather expressions",
          vocabulary:
            "Weather, flooding, natural disasters, environmental impact",
          textType: "Recount Text",
        },
        "Unit 2 – What Happened to the Sea Animals?": {
          pages: "148-159",
          skills: "Reading, Writing, Environmental storytelling",
          grammar: "Past Tense, Passive voice, Descriptive language",
          vocabulary:
            "Marine animals, pollution, rescue, conservation, ecosystem",
          textType: "Recount Text",
        },
        "Unit 3 – You Can Help (Bye Bye Plastic Bags)": {
          pages: "160-173",
          skills: "Writing, Presenting, Activism",
          grammar: "Modal verbs, Present Tense, Persuasive structures",
          vocabulary:
            "Plastic pollution, environmental activism, Bali campaign, solutions",
          textType: "Recount Text",
        },
      },
      "Chapter 5 – Embrace Yourself": {
        "Unit 1 – Be Yourself": {
          pages: "174-187",
          skills: "Reading, Critical thinking, Opinion expression",
          grammar: "Opinion expressions, Present Tense, Comparative adjectives",
          vocabulary:
            "Self-confidence, appearance, advertising, personal identity",
          textType: "Narrative & Opinion",
        },
        "Unit 2 – I Know I Can Do It": {
          pages: "188-199",
          skills: "Writing, Speaking, Motivational storytelling",
          grammar: "Past Tense, Present Perfect, Achievement expressions",
          vocabulary:
            "Motivation, perseverance, personal struggle, achievement",
          textType: "Narrative Text",
        },
        "Unit 3 – Practice Makes Perfect": {
          pages: "200-213",
          skills: "Presenting, Inspiring, Success storytelling",
          grammar: "Present Perfect, Past Tense, Result expressions",
          vocabulary:
            "Practice, persistence, skill development, success stories",
          textType: "Narrative Text",
        },
      },
    },
    9: {
      "Chapter 1 – Exploring Fauna of Indonesia": {
        "Unit 1 – Bekantan": {
          pages: "14-27",
          skills: "Reading, Writing",
          grammar:
            "Simple Present Tense, Passive Voice, Classification language",
          vocabulary:
            "Indonesian fauna, habitat, physical characteristics, conservation",
          textType: "Report Text",
        },
        "Unit 2 – Orangutan and Gorilla": {
          pages: "28-39",
          skills: "Reading, Speaking, Comparing",
          grammar:
            "Comparative and Superlative, Present Tense, Scientific descriptions",
          vocabulary:
            "Primates, comparison, endangered species, similarities and differences",
          textType: "Report Text (Comparative)",
        },
        "Unit 3 – Indonesian Birds": {
          pages: "40-53",
          skills: "Listening, Writing, Research",
          grammar: "Present Tense, Classification, Descriptive language",
          vocabulary: "Bird species, migration, behavior, conservation status",
          textType: "Report Text",
        },
      },
      "Chapter 2 – Taking Trips": {
        "Unit 1 – Going to a National Park": {
          pages: "54-67",
          skills: "Reading, Speaking, Storytelling",
          grammar: "Past Tense, Time expressions, Sequence connectors",
          vocabulary:
            "Tourism, national parks, outdoor activities, experiences",
          textType: "Recount Text",
        },
        "Unit 2 – What Did You Do There?": {
          pages: "68-79",
          skills: "Listening, Speaking, Interviewing",
          grammar: "Past Tense, WH-Questions, Past Continuous",
          vocabulary: "Holiday activities, experiences, emotions, interactions",
          textType: "Recount Text (Personal Experience)",
        },
        "Unit 3 – My Underwater Adventure": {
          pages: "80-93",
          skills: "Writing, Reading, Creative Writing",
          grammar: "Past Tense, Descriptive adjectives, Sensory details",
          vocabulary: "Marine life, underwater activities, adventure, feelings",
          textType: "Recount Text (Adventure)",
        },
      },
      "Chapter 3 – Journey to Fantasy Worlds": {
        "Unit 1 – Andre and Princess Suripit": {
          pages: "94-107",
          skills: "Reading, Speaking, Story Analysis",
          grammar: "Past Tense, Direct/Indirect Speech, Narrative connectors",
          vocabulary: "Fantasy elements, characters, plot, conflict resolution",
          textType: "Narrative Text (Fairy Tale)",
        },
        "Unit 2 – Back to the 90s": {
          pages: "108-119",
          skills: "Writing, Creative Thinking",
          grammar: "Past Tense, Time expressions, Descriptive language",
          vocabulary:
            "90s culture, time travel, nostalgia, historical references",
          textType: "Narrative Text (Time Travel)",
        },
        "Unit 3 – The Multiverse Story of Timun Mas": {
          pages: "120-133",
          skills: "Presenting, Creative Performance",
          grammar: "Complex sentences, Narrative tenses, Character dialogue",
          vocabulary:
            "Indonesian folklore, multiverse concept, modern adaptation",
          textType: "Narrative Text (Modern Adaptation)",
        },
      },
      "Chapter 4 – Upcycling Used Materials": {
        "Unit 1 – Look At My New Creation": {
          pages: "134-147",
          skills: "Speaking, Presenting, Demonstrating",
          grammar: "Present Perfect, Descriptive adjectives, Process language",
          vocabulary:
            "Upcycling, creativity, materials, transformation, sustainability",
          textType: "Descriptive + Procedure",
        },
        "Unit 2 – They're On Sale": {
          pages: "148-159",
          skills: "Speaking, Role-playing, Negotiating",
          grammar: "Modal verbs, Price expressions, Persuasive language",
          vocabulary: "Sales, marketing, pricing, customer service, business",
          textType: "Conversation (Transactional)",
        },
        "Unit 3 – Let's Donate": {
          pages: "160-173",
          skills: "Writing, Social Action, Campaigning",
          grammar: "Imperative, Modal verbs, Persuasive structures",
          vocabulary:
            "Charity, social responsibility, community service, helping others",
          textType: "Hortatory Exposition",
        },
      },
      "Chapter 5 – Digital Life": {
        "Unit 1 – Let's Check the Facts!": {
          pages: "174-187",
          skills: "Reading, Critical Thinking, Research",
          grammar: "Present Tense, Question formation, Evidence language",
          vocabulary:
            "Fact-checking, reliable sources, misinformation, digital literacy",
          textType: "Analytical Exposition",
        },
        "Unit 2 – Stay Safe in the Digital World": {
          pages: "188-199",
          skills: "Speaking, Discussion, Problem-solving",
          grammar: "Modal verbs, Conditional sentences, Advice language",
          vocabulary: "Digital safety, cyberbullying, privacy, online security",
          textType: "Hortatory Exposition",
        },
        "Unit 3 – Turn Back Hoax!": {
          pages: "200-213",
          skills: "Writing, Campaigning, Media Creation",
          grammar: "Imperative, Present Tense, Persuasive language",
          vocabulary:
            "Hoaxes, misinformation, social media, responsible sharing",
          textType: "Hortatory Exposition",
        },
      },
    },
  };

  const getOfficialCP = (selectedGrade = kelas) => {
    const officialCP = {
      listening_speaking:
        "Memahami alur informasi secara keseluruhan, gagasan utama, dan informasi rinci dari teks lisan tentang topik sehari-hari atau yang sesuai dengan minat. Menggunakan bahasa Inggris untuk mengungkapkan gagasan dan pengalaman dalam berbagai jenis teks secara lisan tentang topik yang dibahas dengan menggunakan kalimat sederhana dan majemuk, baik formal maupun informal sesuai konteks.",
      reading_viewing:
        "Memahami alur informasi, informasi tersurat dan tersirat dari berbagai jenis teks tertulis atau teks multimodal tentang topik sehari-hari atau yang sesuai dengan minat, serta meresponsnya sesuai konteks.",
      writing_presenting:
        "Mengomunikasikan gagasan dan pengalaman mereka dalam berbagai jenis teks secara tertulis atau teks multimodal tentang topik sehari-hari atau yang sesuai dengan minat. Mulai menggunakan kalimat sederhana dan majemuk dengan struktur teks dan unsur kebahasaan yang tepat.",
    };
    return officialCP;
  };

  const getAllChaptersForGrade = (selectedGrade) =>
    Object.keys(gradeData[selectedGrade] || {});
  const getUnitsForChapter = (selectedChapter, selectedGrade = kelas) =>
    Object.keys(gradeData[selectedGrade]?.[selectedChapter] || {});
  const getUnitDetails = (
    selectedChapter,
    selectedUnit,
    selectedGrade = kelas
  ) => gradeData[selectedGrade]?.[selectedChapter]?.[selectedUnit] || {};

  const handleGradeChange = (newGrade) => {
    setKelas(newGrade);
    const firstChapter = getAllChaptersForGrade(newGrade)[0];
    const firstUnit = getUnitsForChapter(firstChapter, newGrade)[0];
    setChapter(firstChapter || "");
    setTopik(firstUnit || "");
  };

  const handleChapterChange = (newChapter) => {
    setChapter(newChapter);
    const firstUnit = getUnitsForChapter(newChapter, kelas)[0];
    setTopik(firstUnit || "");
  };

  const handleDimensiChange = (d) => {
    setDimensi((prevDimensi) =>
      prevDimensi.includes(d)
        ? prevDimensi.filter((item) => item !== d)
        : [...prevDimensi, d]
    );
  };

  const resetModul = () => {
    setNamaSekolah("SMP Muslimin Cililin");
    setNamaGuru("");
    setMapel("Bahasa Inggris");
    setKelas("7");
    setChapter("Chapter 1 - About Me");
    setTopik("Unit 1 - Galang from Kalimantan");
    setAlokasiWaktu("2");
    setDimensi(["Komunikasi", "Kolaborasi"]);
    setHasilModul(null);
    setError("");
  };

  const generateModul = async () => {
    if (
      !namaSekolah.trim() ||
      !namaGuru.trim() ||
      !topik ||
      dimensi.length < 2
    ) {
      setError(
        "Pastikan semua field bertanda (*) sudah terisi dan pilih minimal 2 Dimensi Profil Lulusan."
      );
      return;
    }

    setLoading(true);
    setError("");
    setHasilModul(null);

    const unitDetails = getUnitDetails(chapter, topik, kelas);
    const officialCP = getOfficialCP(kelas);

    const systemPrompt = `Anda adalah guru Bahasa Inggris expert Kurikulum Merdeka yang berpengalaman membuat Modul Ajar sesuai format resmi Kemendikdasmen 2025. Anda memiliki pemahaman mendalam tentang pedagogi pembelajaran mendalam (deep learning) yang berkesadaran, bermakna, dan menggembirakan.

SPESIALISASI KELAS ${kelas}:
${
  kelas === "7"
    ? "Fokus pada pembelajaran dasar, aktivitas interaktif, dan membangun kepercayaan diri siswa dalam berbahasa Inggris dengan pendekatan yang menyenangkan dan kontekstual."
    : kelas === "8"
    ? "Fokus pada pembelajaran berbasis nilai moral, lingkungan, dan pengembangan karakter dengan pendekatan storytelling dan project-based learning sederhana."
    : "Fokus pada berbagai jenis teks kompleks, critical thinking, dan project-based learning yang menantang."
}

PENTING:
1. Berikan respons dalam format JSON yang valid dan lengkap dengan struktur yang terorganisir dan detail
2. Pastikan setiap komponen saling terkait dan koheren
3. Sesuaikan dengan fase perkembangan siswa (Fase D)
4. Integrasikan nilai-nilai Pancasila secara konkret dalam kegiatan pembelajaran
5. Gunakan pendekatan diferensiasi yang sesuai dengan kebutuhan heterogen siswa
6. Sertakan asesmen autentik yang bermakna`;

    const userPrompt = `
BUAT MODUL AJAR KOMPREHENSIF SESUAI FORMAT KEMENDIKDASMEN 2025 DENGAN KRITERIA BERIKUT:

INFORMASI UMUM:
- Nama Sekolah: ${namaSekolah}
- Nama Guru: ${namaGuru}
- Mata Pelajaran: ${mapel}
- Kelas: ${kelas} (Fase D)
- Unit/Tema: ${topik}
- Tipe Teks: ${unitDetails.textType || "General"}
- Alokasi Waktu: ${alokasiWaktu} JP (${alokasiWaktu * 40} menit)
- Dimensi Profil Lulusan: ${dimensi.join(", ")}

CAPAIAN PEMBELAJARAN RESMI:
- Elemen Menyimak-Berbicara: "${officialCP.listening_speaking}"
- Elemen Membaca-Memirsa: "${officialCP.reading_viewing}"
- Elemen Menulis-Mempresentasikan: "${officialCP.writing_presenting}"

MATERI PEMBELAJARAN:
- Sumber Utama: Buku "ENGLISH FOR NUSANTARA" Kelas ${kelas}
- Halaman: ${unitDetails.pages || "TBD"}
- Fokus Keterampilan: ${unitDetails.skills || "Integrated Skills"}
- Fokus Tata Bahasa: ${unitDetails.grammar || "Basic Grammar"}
- Kosakata Inti: ${unitDetails.vocabulary || "General vocabulary"}
- Jenis Teks: ${unitDetails.textType || "General"}
- Kompetensi Inti: ${unitDetails.coreCompetencies || "General communication"}

FORMAT OUTPUT JSON YANG DIMINTA:
{
  "informasiUmum": {
    "identitas": {
      "namaSekolah": "${namaSekolah}",
      "namaGuru": "${namaGuru}",
      "fase": "D",
      "kelas": "${kelas === "7" ? "VII" : kelas === "8" ? "VIII" : "IX"}",
      "mataPelajaran": "Bahasa Inggris",
      "tema": "${topik}",
      "subTema": "[Tentukan sub-tema yang relevan berdasarkan topik utama]",
      "jenisText": "${unitDetails.textType || "General"}",
      "alokasiWaktu": "${alokasiWaktu} JP (${alokasiWaktu * 40} menit)",
      "tahunAjaran": "2024/2025",
      "mingguKe": "[Tentukan minggu ke- dalam semester]"
    },
    "bahanAjar": {
      "sumberUtama": "Buku English for Nusantara Kelas ${kelas}",
      "halaman": "${unitDetails.pages || "TBD"}",
      "materiInti": "[Jelaskan materi inti yang akan diajarkan]",
      "prasyaratPengetahuan": "[Sebutkan pengetahuan prasyarat yang harus dikuasai siswa]"
    }
  },
  "capaianPembelajaran": {
    "elemen": ["Menyimak-Berbicara", "Membaca-Memirsa", "Menulis-Mempresentasikan"],
    "capaianUtama": {
      "menyimakBerbicara": "${officialCP.listening_speaking}",
      "membacaMemirsa": "${officialCP.reading_viewing}",
      "menulisMempresentasikan": "${officialCP.writing_presenting}"
    },
    "indikatorKeberhasilan": [
      {
        "keterampilan": "Menyimak",
        "indikator": "[3-4 indikator spesifik kemampuan menyimak]"
      },
      {
        "keterampilan": "Berbicara",
        "indikator": "[3-4 indikator spesifik kemampuan berbicara]"
      },
      {
        "keterampilan": "Membaca",
        "indikator": "[3-4 indikator spesifik kemampuan membaca]"
      },
      {
        "keterampilan": "Menulis",
        "indikator": "[3-4 indikator spesifik kemampuan menulis]"
      }
    ]
  },
  "tujuanPembelajaran": {
    "tujuanUmum": "Setelah mengikuti pembelajaran, siswa mampu ${
      unitDetails.coreCompetencies || "berkomunikasi"
    } menggunakan ${
      unitDetails.textType || "teks"
    } dengan tepat dalam konteks yang relevan",
    "tujuanKhusus": [
      {
        "aspek": "Pengetahuan",
        "tujuan": "[Tujuan terkait pengetahuan yang harus dikuasai]"
      },
      {
        "aspek": "Keterampilan", 
        "tujuan": "[Tujuan terkait keterampilan yang harus dimiliki]"
      },
      {
        "aspek": "Sikap",
        "tujuan": "[Tujuan terkait sikap yang dikembangkan]"
      }
    ],
    "kriteriaKeberhasilan": ["[Sebutkan kriteria keberhasilan pembelajaran dalam bentuk array string, setiap poin menjadi satu item]"]
  },
  "dimensiLulusan": {
    "dimensiUtama": "${dimensi.join(", ")}",
    "indikatorDimensi": [
      {
        "dimensi": "[Dimensi pertama]",
        "indikator": "[Indikator perilaku yang diharapkan]"
      },
      {
        "dimensi": "[Dimensi kedua]", 
        "indikator": "[Indikator perilaku yang diharapkan]"
      }
    ],
    "integrasiDalamPembelajaran": {
      "kegiatanIntegrasi": "[Jelaskan kegiatan konkret untuk mengintegrasikan nilai-nilai Pancasila]",
      "strategiPenguatan": "[Strategi untuk memperkuat internalisasi nilai]"
    }
  },
  "pendekatanPembelajaranMendalam": {
      "prinsip": "Berkesadaran, Bermakna, dan Menggembirakan",
      "penerapan": "[Jelaskan secara ringkas bagaimana seluruh rangkaian kegiatan pembelajaran dirancang untuk mewujudkan ketiga prinsip tersebut. Contoh: Kegiatan eksplorasi dirancang agar siswa menemukan hubungan materi dengan kehidupan nyata (bermakna), diskusi kelompok melatih empati dan mendengarkan (berkesadaran), dan permainan interaktif diintegrasikan untuk menciptakan suasana belajar yang positif (menggembirakan).]"
  },
  "kegiatanPembelajaran": {
    "pendahuluan": {
      "waktu": "10 menit",
      "tujuan": "[Tujuan kegiatan pendahuluan]",
      "kegiatan": [
        "Guru membuka pembelajaran dengan salam, doa, dan presensi",
        "Guru melakukan apersepsi dengan menanyakan pengalaman siswa terkait ${topik.toLowerCase()}",
        "Guru menyampaikan tujuan pembelajaran dan manfaatnya dalam kehidupan sehari-hari",
        "Guru memotivasi siswa dengan cerita, video pendek, atau gambar yang relevan",
        "Guru melakukan icebreaker singkat terkait tema"
      ],
      "metode": "Interactive questioning, storytelling, brainstorming",
      "media": "[Sebutkan media yang digunakan]",
      "nilaiKarakter": "Religius, Komunikatif, Rasa Ingin Tahu"
    },
    "inti": {
      "waktu": "${alokasiWaktu * 40 - 20} menit",
      "tahapan": {
        "eksplorasi": {
          "waktu": "${Math.floor((alokasiWaktu * 40 - 20) * 0.4)} menit",
          "tujuan": "[Tujuan tahap eksplorasi]",
          "kegiatan": [
            "Siswa mengamati ${
              unitDetails.textType || "teks"
            } dari buku halaman ${unitDetails.pages || "TBD"}",
            "Guru memfasilitasi tanya jawab tentang isi ${
              unitDetails.textType || "teks"
            }",
            "Siswa mengidentifikasi ${
              unitDetails.vocabulary || "kosakata"
            } baru dan struktur ${unitDetails.grammar || "tata bahasa"}",
            "Siswa mengeksplorasi konteks penggunaan bahasa target"
          ],
          "metode": "Discovery learning, questioning, observation",
          "peranGuru": "Fasilitator, motivator",
          "peranSiswa": "Aktif mengeksplorasi, bertanya, mengamati"
        },
        "elaborasi": {
          "waktu": "${Math.floor((alokasiWaktu * 40 - 20) * 0.4)} menit",
          "tujuan": "[Tujuan tahap elaborasi]",
          "kegiatan": [
            "Siswa berlatih ${
              unitDetails.skills || "keterampilan"
            } dalam kelompok kecil dengan panduan LKPD",
            "Guru memberikan guidance untuk penggunaan ${
              unitDetails.grammar || "tata bahasa"
            } yang tepat",
            "Siswa membuat karya sederhana menggunakan ${
              unitDetails.textType || "format teks"
            }",
            "Siswa berkolaborasi menyelesaikan tugas proyek kecil"
          ],
          "metode": "Collaborative learning, project-based learning, practice",
          "peranGuru": "Pembimbing, pemberi umpan balik",
          "peranSiswa": "Berlatih, berkolaborasi, menghasilkan karya"
        },
        "konfirmasi": {
          "waktu": "${Math.floor((alokasiWaktu * 40 - 20) * 0.2)} menit",
          "tujuan": "[Tujuan tahap konfirmasi]",
          "kegiatan": [
            "Siswa mempresentasikan hasil kerja kelompok",
            "Guru memberikan feedback konstruktif dan penguatan",
            "Siswa melakukan refleksi terhadap proses pembelajaran",
            "Guru menjelaskan kembali konsep yang masih sulit dipahami"
          ],
          "metode": "Presentation, feedback, reflection",
          "peranGuru": "Evaluator, pemberi penguatan",
          "peranSiswa": "Mempresentasikan, merefleksi, mengkonfirmasi pemahaman"
        }
      },
      "nilaiKarakter": "Kolaboratif, Kreatif, Komunikatif, Percaya Diri"
    },
    "penutup": {
      "waktu": "10 menit",
      "tujuan": "[Tujuan kegiatan penutup]",
      "kegiatan": [
        "Guru dan siswa melakukan refleksi pembelajaran hari ini",
        "Siswa menyimpulkan materi yang telah dipelajari dengan bimbingan guru",
        "Guru memberikan umpan balik terhadap proses dan hasil belajar",
        "Guru memberikan preview materi selanjutnya dan tugas pengayaan",
        "Guru menutup pembelajaran dengan doa dan salam"
      ],
      "metode": "Reflection, summary, reinforcement",
      "nilaiKarakter": "Reflektif, Religius, Bertanggung Jawab"
    }
  },
  "diferensiasi": {
    "diferensiasiKonten": {
      "pemula": {
        "materi": "Materi dasar ${
          unitDetails.textType || "teks"
        } dengan vocabulary sederhana dan contoh konkret",
        "dukungan": "Scaffolding lebih banyak, contoh lebih detail, langkah-langkah terurai"
      },
      "menengah": {
        "materi": "Materi standar sesuai buku dengan latihan tambahan dan variasi konteks",
        "dukungan": "Guidance sesuai kebutuhan, contoh sedang, tantangan sesuai level"
      },
      "mahir": {
        "materi": "Materi diperkaya dengan sumber tambahan dan tantangan lebih kompleks",
        "dukungan": "Tantangan kreatif, proyek mandiri, kesempatan menjadi tutor sebaya"
      }
    },
    "diferensiasiProses": {
      "visual": "Menggunakan gambar, diagram, mind mapping, dan video demonstrasi",
      "auditori": "Mendengarkan audio, diskusi, presentasi lisan, dan podcast pendek",
      "kinestetik": "Role play, games, simulasi, dan aktivitas hands-on",
      "readwrite": "Membaca teks, menulis catatan, membuat ringkasan, dan worksheet terstruktur"
    },
    "diferensiasiProduk": {
      "pilihan1": {
        "jenis": "Presentasi lisan",
        "deskripsi": "Presentasi individu atau kelompok tentang hasil belajar"
      },
      "pilihan2": {
        "jenis": "Karya tulis kreatif",
        "deskripsi": "Menulis teks sesuai jenis teks yang dipelajari dengan tema bebas"
      },
      "pilihan3": {
        "jenis": "Video pendek atau poster digital",
        "deskripsi": "Membuat media visual yang merepresentasikan pemahaman konsep"
      },
      "pilihan4": {
        "jenis": "Proyek kolaboratif",
        "deskripsi": "Bekerja dalam kelompok menghasilkan produk tertentu"
      }
    }
  },
  "asesmen": {
    "asesmenFormatif": {
      "teknik": [
        "Observasi partisipasi selama pembelajaran",
        "Tanya jawab langsung untuk cek pemahaman",
        "Exit ticket di akhir pembelajaran",
        "Peer assessment dalam kerja kelompok",
        "Self-assessment melalui jurnal belajar",
        "Kuis singkat untuk evaluasi pemahaman"
      ],
      "instrumen": "Checklist observasi, rubrik penilaian, lembar cek pemahaman, kuis",
      "waktu": "Selama proses pembelajaran (on-process assessment)",
      "tujuan": "Memantau perkembangan belajar dan memberikan umpan balik segera"
    },
    "asesmenSumatif": {
      "teknik": [
        "Tes tertulis dengan soal objektif dan subjektif",
        "Performance assessment melalui presentasi", 
        "Portfolio assessment kumpulan karya siswa",
        "Project-based assessment untuk tugas akhir"
      ],
      "instrumen": "Soal tes, rubrik penilaian kinerja, panduan penilaian portofolio",
      "waktu": "Akhir pembelajaran atau sesuai jadwal (end-point assessment)",
      "tujuan": "Mengukur pencapaian hasil belajar secara komprehensif"
    },
    "rubrikPenilaian": {
      "aspekPenilaian": [
        {
          "aspek": "Pengetahuan",
          "indikator": "[Indikator penilaian pengetahuan]",
          "skala": "1-4 dengan deskripsi setiap level"
        },
        {
          "aspek": "Keterampilan",
          "indikator": "[Indikator penilaian keterampilan]",
          "skala": "1-4 dengan deskripsi setiap level"
        },
        {
          "aspek": "Sikap",
          "indikator": "[Indikator penilaian sikap]",
          "skala": "1-4 dengan deskripsi setiap level"
        }
      ]
    }
  },
  "sumberBelajar": {
    "sumberUtama": [
      "Buku English for Nusantara Kelas ${kelas} halaman ${
      unitDetails.pages || "TBD"
    }",
      "Buku guru dan buku siswa Kurikulum Merdeka",
      "Audio files dan video pendukung dari buku siswa"
    ],
    "sumberPendukung": [
      "Video pembelajaran dari YouTube atau platform edukasi lainnya",
      "Aplikasi pembelajaran bahasa Inggris interaktif",
      "Worksheet dan LKPD yang dikembangkan guru",
      "Real objects atau realia terkait tema",
      "Gambar, chart, dan poster pendukung"
    ],
    "teknologiDigital": [
      "Google Classroom untuk tugas dan diskusi",
      "Kahoot atau Quizizz untuk quiz interaktif",
      "Padlet untuk kolaborasi dan curah pendapat",
      "Canva untuk membuat presentasi dan poster",
      "Platform video untuk merekam presentasi"
    ]
  },
  "refleksiGuru": {
    "evaluasiPembelajaran": {
      "kelebihan": "[Catatan tentang aspek yang berjalan efektif]",
      "kendala": "[Identifikasi hambatan selama pembelajaran]",
      "strategiMengatasi": "[Rencana mengatasi kendala]"
    },
    "tindakLanjut": {
      "remedial": "Program untuk siswa yang belum mencapai target",
      "pengayaan": "Aktivitas untuk siswa yang telah mencapai target",
      "perbaikanRPP": "Penyempurnaan untuk pembelajaran berikutnya"
    },
    "catatanKhusus": {
      "siswaBerkebutuhan": "Observasi tentang siswa yang memerlukan perhatian khusus",
      "ketercapaianTujuan": "Analisis tingkat pencapaian tujuan pembelajaran",
      "rekomendasi": "Saran untuk pembelajaran topik serupa di masa datang"
    }
  }
}
`; // Tambahan instruksi khusus
    const additionalInstructions = `
PETUNJUK KHUSUS:
1. Isi semua bagian dalam kurung siku [] dengan konten yang relevan dan spesifik
2. Pastikan alokasi waktu untuk setiap kegiatan proporsional dan realistis
3. Rancang kegiatan yang sesuai dengan fase perkembangan siswa kelas ${kelas}
4. Integrasikan literasi digital dan keterampilan abad 21 dalam pembelajaran
5. Sertakan contoh konkret untuk setiap kegiatan pembelajaran
6. Gunakan pendekatan saintifik (5M) dalam kegiatan inti
7. Pastikan asesmen sesuai dengan tujuan pembelajaran yang ditetapkan
8. Berikan pilihan diferensiasi yang praktis dan dapat diterapkan
9. PENTING: Implementasikan pendekatan Pembelajaran Mendalam (Deep Learning) dalam seluruh kegiatan pembelajaran, khususnya pada bagian 'inti'. Pastikan kegiatan yang dirancang relevan dengan dimensi 'berkesadaran', 'bermakna', dan 'menggembirakan'.`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt + additionalInstructions },
          ],
          max_tokens: 4000,
          temperature: 0.7,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Groq API Error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      const generatedContent = data.choices[0].message.content;

      let jsonMatch = generatedContent.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const cleanJson = jsonMatch[0]
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          const modulData = JSON.parse(cleanJson);

          if (
            modulData.informasiUmum &&
            modulData.capaianPembelajaran &&
            modulData.kegiatanPembelajaran
          ) {
            setHasilModul(modulData);
          } else {
            throw new Error("Incomplete JSON structure");
          }
        } catch (parseError) {
          setError(
            "AI menghasilkan format yang tidak valid. Coba ulangi atau periksa kembali isian Anda."
          );
          console.error("JSON Parse Error:", parseError);
        }
      } else {
        setError("AI tidak menghasilkan format JSON. Mohon coba kembali.");
      }
    } catch (err) {
      console.error("Groq API Error:", err);
      setError(
        `Terjadi kesalahan: ${err.message}. Mohon periksa koneksi internet Anda atau coba lagi nanti.`
      );
    } finally {
      setLoading(false);
    }
  };

  const printModul = () => {
    window.print();
  };

  const exportToWord = () => {
    // Fungsi ini memerlukan library eksternal seperti `html-to-docx` dan `file-saver`
    // Jalankan `npm install html-to-docx file-saver` terlebih dahulu di terminal

    // Asumsi: htmlToDocx dan saveAs sudah diimpor.
    // import { htmlToDocx } from "html-to-docx";
    // import { saveAs } from "file-saver";

    if (!hasilModul) {
      alert("Mohon buat modul terlebih dahulu sebelum mengekspor.");
      return;
    }

    const docContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Calibri, sans-serif; line-height: 1.5; padding: 2cm; }
            h1 { text-align: center; font-size: 24pt; margin-bottom: 5px; }
            h2 { font-size: 18pt; margin-top: 20px; border-bottom: 1px solid #000; padding-bottom: 5px; }
            h3 { font-size: 14pt; margin-top: 15px; }
            p { margin: 0 0 5px 0; }
            .identity-table { display: table; width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .identity-row { display: table-row; }
            .identity-cell-label { display: table-cell; width: 25%; font-weight: bold; vertical-align: top; }
            .identity-cell-value { display: table-cell; width: 75%; vertical-align: top; }
            ul, ol { margin: 0 0 10px 20px; padding: 0; }
            li { margin-bottom: 5px; }
            .section-header { margin-top: 30px; border-bottom: 2px solid #333; padding-bottom: 5px; }
          </style>
        </head>
        <body>
          <h1>MODUL AJAR</h1>
          <h2>I. INFORMASI UMUM</h2>
          <div class="identity-table">
            <div class="identity-row">
              <div class="identity-cell-label">Nama Sekolah</div>
              <div class="identity-cell-value">: ${
                hasilModul.informasiUmum.identitas.namaSekolah
              }</div>
            </div>
            <div class="identity-row">
              <div class="identity-cell-label">Nama Penyusun</div>
              <div class="identity-cell-value">: ${
                hasilModul.informasiUmum.identitas.namaGuru
              }</div>
            </div>
            <div class="identity-row">
              <div class="identity-cell-label">Mata Pelajaran</div>
              <div class="identity-cell-value">: ${hasilModul.informasiUmum.identitas.mataPelajaran.toUpperCase()}</div>
            </div>
            <div class="identity-row">
              <div class="identity-cell-label">Fase / Kelas / Semester</div>
              <div class="identity-cell-value">: ${
                hasilModul.informasiUmum.identitas.fase
              } - ${hasilModul.informasiUmum.identitas.kelas} / 1</div>
            </div>
            <div class="identity-row">
              <div class="identity-cell-label">Alokasi Waktu</div>
              <div class="identity-cell-value">: ${
                hasilModul.informasiUmum.identitas.alokasiWaktu
              }</div>
            </div>
            <div class="identity-row">
              <div class="identity-cell-label">Tahun Penyusunan</div>
              <div class="identity-cell-value">: 2025</div>
            </div>
          </div>

          <h2 class="section-header">II. CAPAIAN PEMBELAJARAN & TUJUAN</h2>
          <h3>Capaian Pembelajaran</h3>
          <ul>
            <li><strong>Menyimak-Berbicara:</strong> ${
              hasilModul.capaianPembelajaran.capaianUtama.menyimakBerbicara
            }</li>
            <li><strong>Membaca-Memirsa:</strong> ${
              hasilModul.capaianPembelajaran.capaianUtama.membacaMemirsa
            }</li>
            <li><strong>Menulis-Mempresentasikan:</strong> ${
              hasilModul.capaianPembelajaran.capaianUtama
                .menulisMempresentasikan
            }</li>
          </ul>
          <h3>Tujuan Pembelajaran</h3>
          <p>${hasilModul.tujuanPembelajaran.tujuanUmum}</p>
          <h3>Indikator Keberhasilan</h3>
          <ul>
            ${hasilModul.tujuanPembelajaran.kriteriaKeberhasilan
              .map((item) => `<li>${item}</li>`)
              .join("")}
          </ul>

          <h2 class="section-header">III. DIMENSI LULUSAN & PEMBELAJARAN MENDALAM</h2>
          <h3>Dimensi Profil Lulusan</h3>
          <p>${hasilModul.dimensiLulusan.dimensiUtama}</p>
          <ul>
            ${hasilModul.dimensiLulusan.indikatorDimensi
              .map(
                (dim) =>
                  `<li><strong>${dim.dimensi}:</strong> ${dim.indikator}</li>`
              )
              .join("")}
          </ul>
          <h3>Pendekatan Pembelajaran Mendalam</h3>
          <p><em>Prinsip: Berkesadaran, Bermakna, dan Menggembirakan</em></p>
          <p>${hasilModul.pendekatanPembelajaranMendalam.penerapan}</p>

          <h2 class="section-header">IV. KEGIATAN PEMBELAJARAN</h2>
          <h3>Pendahuluan</h3>
          <ul>
            ${hasilModul.kegiatanPembelajaran.pendahuluan.kegiatan
              .map((keg) => `<li>${keg}</li>`)
              .join("")}
          </ul>
          <h3>Kegiatan Inti</h3>
          ${Object.entries(hasilModul.kegiatanPembelajaran.inti.tahapan)
            .map(
              ([tahap, data]) => `
            <h4>${tahap.charAt(0).toUpperCase() + tahap.slice(1)}</h4>
            <ul>
              ${data.kegiatan.map((keg) => `<li>${keg}</li>`).join("")}
            </ul>
          `
            )
            .join("")}
          <h3>Penutup</h3>
          <ul>
            ${hasilModul.kegiatanPembelajaran.penutup.kegiatan
              .map((keg) => `<li>${keg}</li>`)
              .join("")}
          </ul>

          <h2 class="section-header">V. DIFERENSIASI</h2>
          <h3>Diferensiasi Konten</h3>
          <ul>
            <li><strong>Pemula:</strong> ${
              hasilModul.diferensiasi.diferensiasiKonten.pemula.materi
            }</li>
            <li><strong>Menengah:</strong> ${
              hasilModul.diferensiasi.diferensiasiKonten.menengah.materi
            }</li>
            <li><strong>Mahir:</strong> ${
              hasilModul.diferensiasi.diferensiasiKonten.mahir.materi
            }</li>
          </ul>
          <h3>Diferensiasi Proses</h3>
          <p>${hasilModul.diferensiasi.diferensiasiProses.visual}, ${
      hasilModul.diferensiasi.diferensiasiProses.auditori
    }, ${hasilModul.diferensiasi.diferensiasiProses.kinestetik}, ${
      hasilModul.diferensiasi.diferensiasiProses.readwrite
    }.</p>
          <h3>Diferensiasi Produk</h3>
          <ul>
            ${Object.values(hasilModul.diferensiasi.diferensiasiProduk)
              .map(
                (item) =>
                  `<li><strong>${item.jenis}:</strong> ${item.deskripsi}</li>`
              )
              .join("")}
          </ul>

          <h2 class="section-header">VI. ASESMEN</h2>
          <h3>Asesmen Formatif</h3>
          <ul>
            ${hasilModul.asesmen.asesmenFormatif.teknik
              .map((t) => `<li>${t}</li>`)
              .join("")}
          </ul>
          <h3>Asesmen Sumatif</h3>
          <ul>
            ${hasilModul.asesmen.asesmenSumatif.teknik
              .map((t) => `<li>${t}</li>`)
              .join("")}
          </ul>

          <p style="page-break-before: always;"></p>

          <h2 class="section-header">VII. SUMBER BELAJAR</h2>
          <h3>Sumber Utama</h3>
          <ul>
            ${hasilModul.sumberBelajar.sumberUtama
              .map((s) => `<li>${s}</li>`)
              .join("")}
          </ul>
          <h3>Sumber Pendukung</h3>
          <ul>
            ${hasilModul.sumberBelajar.sumberPendukung
              .map((s) => `<li>${s}</li>`)
              .join("")}
          </ul>
          <h3>Teknologi Digital</h3>
          <ul>
            ${hasilModul.sumberBelajar.teknologiDigital
              .map((s) => `<li>${s}</li>`)
              .join("")}
          </ul>

          <h2 class="section-header">VIII. REFLEKSI GURU</h2>
          <h3>Evaluasi Pembelajaran</h3>
          <ul>
            <li><strong>Kelebihan:</strong> ${
              hasilModul.refleksiGuru.evaluasiPembelajaran.kelebihan
            }</li>
            <li><strong>Kendala:</strong> ${
              hasilModul.refleksiGuru.evaluasiPembelajaran.kendala
            }</li>
            <li><strong>Strategi Mengatasi:</strong> ${
              hasilModul.refleksiGuru.evaluasiPembelajaran.strategiMengatasi
            }</li>
          </ul>
          <h3>Tindak Lanjut</h3>
          <ul>
            <li><strong>Remedial:</strong> ${
              hasilModul.refleksiGuru.tindakLanjut.remedial
            }</li>
            <li><strong>Pengayaan:</strong> ${
              hasilModul.refleksiGuru.tindakLanjut.pengayaan
            }</li>
            <li><strong>Perbaikan RPP:</strong> ${
              hasilModul.refleksiGuru.tindakLanjut.perbaikanRPP
            }</li>
          </ul>
        </body>
      </html>
    `;

    // Ini adalah kode placeholder. Untuk membuatnya berfungsi, Anda perlu menginstal
    // pustaka `html-to-docx` dan `file-saver`.
    // htmlToDocx(docContent).then((blob) => {
    //   saveAs(blob, "Modul Ajar.docx");
    // });

    alert(
      "Fungsi ekspor ke Word memerlukan instalasi library eksternal (`html-to-docx` dan `file-saver`). Silakan lihat kode untuk panduan implementasinya."
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-blue-900">
              {" "}
              EasyModul Generator{" "}
            </h1>
          </div>
          <p className="text-blue-600 text-lg">
            {" "}
            Generator Modul Ajar Kurikulum Merdeka 2025{" "}
          </p>
          <div className="flex justify-center gap-4 mt-4"></div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
            <Target className="w-6 h-6" /> Informasi Modul Ajar{" "}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nama Sekolah */}
            <div>
              <label className="block text-blue-900 font-semibold mb-2">
                {" "}
                Nama Sekolah *{" "}
              </label>
              <input
                type="text"
                value={namaSekolah}
                onChange={(e) => setNamaSekolah(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Contoh: SMP Muslimin Cililin"
                disabled={loading}
              />
            </div>
            {/* Nama Guru */}
            <div>
              <label className="block text-blue-900 font-semibold mb-2">
                {" "}
                Nama Guru *{" "}
              </label>
              <input
                type="text"
                value={namaGuru}
                onChange={(e) => setNamaGuru(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Masukkan nama lengkap Anda"
                disabled={loading}
              />
            </div>
            {/* Kelas */}
            <div>
              <label className="block text-blue-900 font-semibold mb-2">
                {" "}
                Kelas *{" "}
              </label>
              <select
                value={kelas}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                disabled={loading}>
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            </div>
            {/* Alokasi Waktu */}
            <div>
              <label className="block text-blue-900 font-semibold mb-2">
                {" "}
                Alokasi Waktu (JP){" "}
              </label>
              <input
                type="number"
                value={alokasiWaktu}
                onChange={(e) => setAlokasiWaktu(e.target.value)}
                min="1"
                max="4"
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>
            {/* Chapter */}
            <div>
              <label className="block text-blue-900 font-semibold mb-2">
                {" "}
                Chapter *{" "}
              </label>
              <select
                value={chapter}
                onChange={(e) => handleChapterChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                disabled={loading}>
                {getAllChaptersForGrade(kelas).map((chap) => (
                  <option key={chap} value={chap}>
                    {" "}
                    {chap}{" "}
                  </option>
                ))}
              </select>
            </div>
            {/* Unit/Topik */}
            <div>
              <label className="block text-blue-900 font-semibold mb-2">
                {" "}
                Unit/Topik *{" "}
              </label>
              <select
                value={topik}
                onChange={(e) => setTopik(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                disabled={loading}>
                {getUnitsForChapter(chapter, kelas).map((unit) => (
                  <option key={unit} value={unit}>
                    {" "}
                    {unit}{" "}
                  </option>
                ))}
              </select>
              {topik && (
                <div className="mt-2 flex gap-2">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {" "}
                    {getUnitDetails(chapter, topik, kelas).textType ||
                      "General"}{" "}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {" "}
                    {getUnitDetails(chapter, topik, kelas).skills ||
                      "Integrated Skills"}{" "}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dimensi Profil Lulusan */}
          <div className="mt-6">
            <label className="block text-blue-900 font-semibold mb-4">
              {" "}
              Pilih Dimensi Profil Lulusan (Minimal 3){" "}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {semuaDimensi.map((d) => (
                <label
                  key={d}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-blue-50 ${
                    dimensi.includes(d)
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-blue-200 bg-white text-blue-700"
                  }`}>
                  <input
                    type="checkbox"
                    checked={dimensi.includes(d)}
                    onChange={() => handleDimensiChange(d)}
                    className="mr-2 accent-blue-600"
                    disabled={loading}
                  />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={generateModul}
              disabled={
                loading ||
                dimensi.length < 2 ||
                !topik ||
                !namaSekolah.trim() ||
                !namaGuru.trim()
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 px-8 rounded-lg transition-colors flex items-center justify-center gap-2">
              <CheckCircle
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Membangun Modul..." : "Buat Modul Ajar"}
            </button>
            <button
              onClick={resetModul}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-bold py-4 px-8 rounded-lg transition-colors flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              Reset
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
              <p className="font-semibold">Terjadi Kesalahan:</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Output Section */}
        {hasilModul && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-blue-100 print:shadow-none print:border-none">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                <Monitor className="w-6 h-6" /> Hasil Modul Ajar
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={resetModul}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Buat Modul Baru
                </button>
                <button
                  onClick={printModul}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  Print/Save PDF
                </button>
                <button
                  onClick={exportToWord}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Export ke Word
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-2xl font-bold">MODUL AJAR</h1>
              <h2 className="text-lg">BAHASA INGGRIS - KELAS {kelas}</h2>
              <p className="text-sm">
                Topik: {hasilModul.informasiUmum.identitas.tema}
              </p>
            </div>

            {/* Modul Sections */}
            <section className="mb-6">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                I. Informasi Umum
              </h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  <strong>Nama Sekolah</strong>:
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                  {hasilModul.informasiUmum.identitas.namaSekolah}
                </p>
                <p>
                  <strong>Nama Penyusun</strong>:
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                  {hasilModul.informasiUmum.identitas.namaGuru}
                </p>
                <p>
                  <strong>Mata Pelajaran</strong>:
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                  {hasilModul.informasiUmum.identitas.mataPelajaran.toUpperCase()}
                </p>
                <p>
                  <strong>Fase / Kelas / Semester</strong>: &nbsp;{" "}
                  {hasilModul.informasiUmum.identitas.fase} -{" "}
                  {hasilModul.informasiUmum.identitas.kelas} / 1
                </p>
                <p>
                  <strong>Alokasi Waktu</strong>:
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                  {hasilModul.informasiUmum.identitas.alokasiWaktu}
                </p>
                <p>
                  <strong>Tahun Penyusunan</strong>:
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 2025
                </p>
              </div>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                II. Capaian Pembelajaran & Tujuan
              </h3>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">
                  Capaian Pembelajaran
                </h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  <li>
                    <span className="font-semibold">Menyimak-Berbicara:</span>{" "}
                    {
                      hasilModul.capaianPembelajaran.capaianUtama
                        .menyimakBerbicara
                    }
                  </li>
                  <li>
                    <span className="font-semibold">Membaca-Memirsa:</span>{" "}
                    {hasilModul.capaianPembelajaran.capaianUtama.membacaMemirsa}
                  </li>
                  <li>
                    <span className="font-semibold">
                      Menulis-Mempresentasikan:
                    </span>{" "}
                    {
                      hasilModul.capaianPembelajaran.capaianUtama
                        .menulisMempresentasikan
                    }
                  </li>
                </ul>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">
                  Tujuan Pembelajaran
                </h4>
                <p className="text-sm text-blue-700">
                  {hasilModul.tujuanPembelajaran.tujuanUmum}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">
                  Indikator Keberhasilan
                </h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {hasilModul.tujuanPembelajaran.kriteriaKeberhasilan.map(
                    (item, index) => (
                      <li key={index}>{item}</li>
                    )
                  )}
                </ul>
              </div>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                III. Dimensi Lulusan & Pembelajaran Mendalam
              </h3>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">
                  Dimensi Profil Lulusan
                </h4>
                <p className="text-sm text-blue-700">
                  {hasilModul.dimensiLulusan.dimensiUtama}
                </p>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1 mt-2">
                  {hasilModul.dimensiLulusan.indikatorDimensi.map(
                    (dim, index) => (
                      <li key={index}>
                        <span className="font-semibold">{dim.dimensi}:</span>{" "}
                        {dim.indikator}
                      </li>
                    )
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">
                  Pendekatan Pembelajaran Mendalam
                </h4>
                <p className="text-sm italic text-blue-700">
                  Prinsip: Berkesadaran, Bermakna, dan Menggembirakan
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {hasilModul.pendekatanPembelajaranMendalam.penerapan}
                </p>
              </div>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                IV. Kegiatan Pembelajaran
              </h3>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">Pendahuluan</h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {hasilModul.kegiatanPembelajaran.pendahuluan.kegiatan.map(
                    (keg, index) => (
                      <li key={index}>{keg}</li>
                    )
                  )}
                </ul>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">Kegiatan Inti</h4>
                {Object.entries(
                  hasilModul.kegiatanPembelajaran.inti.tahapan
                ).map(([tahap, data], index) => (
                  <div
                    key={index}
                    className="pl-4 mb-2 border-l-2 border-blue-200">
                    <h5 className="font-semibold text-blue-800 capitalize">
                      {tahap}
                    </h5>
                    <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                      {data.kegiatan.map((keg, idx) => (
                        <li key={idx}>{keg}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Penutup</h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {hasilModul.kegiatanPembelajaran.penutup.kegiatan.map(
                    (keg, index) => (
                      <li key={index}>{keg}</li>
                    )
                  )}
                </ul>
              </div>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                V. Diferensiasi
              </h3>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">
                  Diferensiasi Konten
                </h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  <li>
                    <span className="font-semibold">Pemula:</span>{" "}
                    {hasilModul.diferensiasi.diferensiasiKonten.pemula.materi}{" "}
                  </li>
                  <li>
                    <span className="font-semibold">Menengah:</span>{" "}
                    {hasilModul.diferensiasi.diferensiasiKonten.menengah.materi}
                  </li>
                  <li>
                    <span className="font-semibold">Mahir:</span>{" "}
                    {hasilModul.diferensiasi.diferensiasiKonten.mahir.materi}{" "}
                  </li>
                </ul>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">
                  Diferensiasi Proses
                </h4>
                <p className="text-sm text-blue-700">
                  {hasilModul.diferensiasi.diferensiasiProses.visual}, &nbsp;
                  {hasilModul.diferensiasi.diferensiasiProses.auditori}, &nbsp;
                  {hasilModul.diferensiasi.diferensiasiProses.kinestetik},
                  &nbsp;
                  {hasilModul.diferensiasi.diferensiasiProses.readwrite}.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">
                  Diferensiasi Produk
                </h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {Object.values(
                    hasilModul.diferensiasi.diferensiasiProduk
                  ).map((item, index) => (
                    <li key={index}>
                      <span className="font-semibold">{item.jenis}:</span>{" "}
                      {item.deskripsi}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                VI. Asesmen
              </h3>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">
                  Asesmen Formatif
                </h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {hasilModul.asesmen.asesmenFormatif.teknik.map((t, index) => (
                    <li key={index}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Asesmen Sumatif</h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {hasilModul.asesmen.asesmenSumatif.teknik.map((t, index) => (
                    <li key={index}>{t}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mb-6 print:hidden">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                VII. Sumber Belajar
              </h3>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">Sumber Utama</h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {hasilModul.sumberBelajar.sumberUtama.map((s, index) => (
                    <li key={index}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">
                  Sumber Pendukung
                </h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {hasilModul.sumberBelajar.sumberPendukung.map((s, index) => (
                    <li key={index}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">
                  Teknologi Digital
                </h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {hasilModul.sumberBelajar.teknologiDigital.map((s, index) => (
                    <li key={index}>{s}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mb-6 print:hidden">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                VIII. Refleksi Guru
              </h3>
              <div className="mb-4">
                <h4 className="font-semibold text-blue-900">
                  Evaluasi Pembelajaran
                </h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  <li>
                    <span className="font-semibold">Kelebihan:</span>{" "}
                    {hasilModul.refleksiGuru.evaluasiPembelajaran.kelebihan}
                  </li>
                  <li>
                    <span className="font-semibold">Kendala:</span>{" "}
                    {hasilModul.refleksiGuru.evaluasiPembelajaran.kendala}
                  </li>
                  <li>
                    <span className="font-semibold">Strategi Mengatasi:</span>{" "}
                    {
                      hasilModul.refleksiGuru.evaluasiPembelajaran
                        .strategiMengatasi
                    }
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-6 print:hidden">
              <h4 className="font-semibold text-blue-900">Tindak Lanjut</h4>
              <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                <li>
                  <span className="font-semibold">Remedial:</span>{" "}
                  {hasilModul.refleksiGuru.tindakLanjut.remedial}
                </li>
                <li>
                  <span className="font-semibold">Pengayaan:</span>{" "}
                  {hasilModul.refleksiGuru.tindakLanjut.pengayaan}
                </li>
                <li>
                  <span className="font-semibold">Perbaikan RPP:</span>{" "}
                  {hasilModul.refleksiGuru.tindakLanjut.perbaikanRPP}
                </li>
              </ul>
            </section>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 print:hidden">
              <button
                onClick={resetModul}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                Buat Modul Baru
              </button>
              <button
                onClick={printModul}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Print/Save PDF
              </button>
              <button
                onClick={exportToWord}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Export ke Word
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EasyModul;
