// setting/kelola-ujian/petunjukPenggunaanData.js
// Sumber TUNGGAL isi panduan "Petunjuk & Penggunaan Aplikasi" -- dipakai
// bareng oleh PetunjukPenggunaanTab.js (tampilan accordion di app) dan
// petunjukPenggunaanPdf.js (versi unduhan PDF), supaya kalau ada alur
// sub-fitur yang berubah, cukup edit di SATU tempat ini saja dan kedua
// versi otomatis ikut sinkron.
//
// `iconName` cuma string (bukan komponen React) biar file ini aman
// di-import dari petunjukPenggunaanPdf.js juga (generator PDF nggak
// butuh render ikon apa-apa).
//
// `id` di sini cuma dipakai internal (state accordion di
// PetunjukPenggunaanTab.js & key React) -- TIDAK dipakai buat routing
// sub-fitur (itu urusan JenisUjianMenuTab.js), tapi sengaja diseragamkan
// sama id di SUB_FITUR (JenisUjianMenuTab.js) biar gampang di-cross-check
// kalau ada rename lagi ke depannya.

const PANDUAN = [
  {
    id: "jadwal-ruangan",
    title: "Jadwal, Peserta & Pembagian Ruangan",
    iconName: "CalendarClock",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran",
        deskripsi:
          "Buka kartu, lalu pilih Tahun Ajaran yang sama dengan Daftar & Jadwal Pengawas.",
      },
      {
        judul: "Tab Jadwal Sesi",
        deskripsi:
          "Tambahkan sesi ujian satu per satu: tanggal, jam, dan mata pelajaran yang diujikan.",
      },
      {
        judul: "Tab Komposisi Ruangan",
        deskripsi:
          "Bandingkan dulu hasil 2 versi algoritma (V1 Rotasi Penuh vs V2 Rantai Muter) sebelum diproses beneran. Ini murni hitungan preview, belum menyimpan apa pun ke database.",
      },
      {
        judul: "Tab Pembagian Ruangan",
        deskripsi:
          'Pilih versi algoritma & kapasitas per ruangan, klik "Proses Pembagian" untuk membuat preview otomatis, sesuaikan quota manual per kelas per ruangan (pastikan baris "Target" tidak merah), lalu klik "Simpan ke Database".',
      },
      {
        judul: "Tab Preview Per Ruangan",
        deskripsi:
          "Lihat tampilan daftar peserta per ruangan sebelum dicetak. Isinya mengikuti quota yang sedang tampil di layar, termasuk perubahan yang belum disimpan -- enak buat ngecek hasil editan quota.",
      },
      {
        judul: "Tab Export Daftar Peserta",
        deskripsi:
          'Unduh daftar peserta per ruangan atau semua ruangan sekaligus dalam format Excel atau PDF -- untuk ditempel di pintu ruangan & pegangan pengawas. Sama seperti Preview, isinya WYSIWYG mengikuti quota yang lagi tampil di layar, termasuk yang belum diklik "Simpan ke Database".',
      },
      {
        judul: "Wajib Disimpan Dulu",
        deskripsi:
          "Selama pembagian ruangan belum disimpan, daftar ruangan belum tersedia untuk sub-fitur lain -- Daftar & Jadwal Pengawas, Kartu Ujian, dan Presensi & Berita Acara baru bisa jalan setelah data ini tersimpan.",
      },
    ],
  },
  {
    id: "daftar-pengawas",
    title: "Daftar & Jadwal Pengawas",
    iconName: "DoorOpen",
    langkah: [
      {
        judul: "Pilih Jenis Ujian & Tahun Ajaran",
        deskripsi:
          'Dari halaman utama Manajemen Ujian, pilih jenis ujian (PSAS/PSAT/PSAJ), lalu buka kartu "Daftar & Jadwal Pengawas" dan pilih Tahun Ajaran yang sesuai.',
      },
      {
        judul: "Tab Daftar Pengawas",
        deskripsi:
          "Daftarkan guru yang bertugas sebagai pengawas beserta kode singkatnya (dipakai di jadwal ngawas & kartu pengawas).",
      },
      {
        judul: "Tab Jadwal Ngawas",
        deskripsi:
          "Tetapkan guru pengawas untuk tiap ruangan pada setiap hari pelaksanaan. Daftar ruangan & sesi diambil otomatis dari kartu Jadwal, Peserta & Pembagian Ruangan.",
      },
      {
        judul: "Tab Rekap",
        deskripsi:
          "Lihat rekap semua sesi & ruangan dalam satu tabel per hari -- bahan cek cepat sebelum dicetak.",
      },
    ],
    catatan:
      'Cetak/unduh daftar peserta sekarang ada di kartu "Jadwal, Peserta & Pembagian Ruangan" (tab Export Daftar Peserta), bukan di sini lagi.',
  },
  {
    id: "kartu-ujian",
    title: "Kartu Ujian",
    iconName: "IdCard",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran",
        deskripsi: "Buka kartu, lalu pilih Tahun Ajaran.",
      },
      {
        judul: "Pilih Template",
        deskripsi:
          'Pilih tab "Kartu Peserta" untuk kartu siswa, atau "Kartu Pengawas" untuk kartu guru.',
      },
      {
        judul: "Cetak Kartu Peserta",
        deskripsi:
          "Pilih ruangan (atau semua ruangan sekaligus), lalu cetak PDF berisi identitas siswa, nomor peserta, dan ruangan ujian.",
      },
      {
        judul: "Cetak Kartu Pengawas",
        deskripsi:
          "Pilih guru pengawas, lalu cetak kartu penugasan berdasarkan jadwal ngawas yang sudah diatur di sub-fitur Daftar & Jadwal Pengawas.",
      },
    ],
    catatan:
      "Pastikan Daftar & Jadwal Pengawas dan Jadwal, Peserta & Pembagian Ruangan sudah lengkap dulu supaya data di kartu akurat.",
  },
  {
    id: "laporan",
    title: "Presensi & Berita Acara",
    iconName: "FileBarChart2",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran & Sesi",
        deskripsi:
          "Pilih Tahun Ajaran, lalu pilih Sesi Ujian dari dropdown (daftar sesi diambil dari Jadwal, Peserta & Pembagian Ruangan).",
      },
      {
        judul: "Cetak Daftar Hadir",
        deskripsi:
          'Klik "Cetak Semua Daftar Hadir" untuk mengunduh PDF form kosong seluruh ruangan sekaligus, atau cetak per ruangan lewat tombol pada kartu ruangan masing-masing.',
      },
      {
        judul: "Cetak Berita Acara",
        deskripsi:
          "Sama seperti Daftar Hadir -- dicetak kosong per ruangan atau sekaligus semua ruangan.",
      },
    ],
    catatan:
      "Kedua dokumen ini BUKAN presensi digital. Kolom tanda tangan pengawas & siswa memang sengaja dikosongkan untuk diisi & ditandatangani manual di kertas saat ujian berlangsung.",
  },
  {
    id: "kepanitiaan",
    title: "Program Kerja Pelaksanaan",
    iconName: "FileText",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran",
        deskripsi: "Buka kartu, lalu pilih Tahun Ajaran.",
      },
      {
        judul: "Isi Surat Keputusan Panitia",
        deskripsi:
          "Masukkan nomor & tanggal SK panitia -- diketik manual tiap tahun ajaran.",
      },
      {
        judul: "Susun Panitia",
        deskripsi:
          "Tambah baris per jabatan (Penanggung Jawab, Ketua, Sekretaris, Bendahara, Anggota, dst) beserta nama gurunya. Data ini belum ada tabelnya di database, jadi diisi manual tiap kali generate.",
      },
      {
        judul: "Isi Jadwal per Sesi",
        deskripsi:
          "Tambahkan tanggal, waktu, dan mata pelajaran tiap sesi ujian secara manual -- belum ada sumber data terstruktur buat ini.",
      },
      {
        judul: "Pembagian Ruang & Pengawas",
        deskripsi:
          "Bagian ini otomatis, diambil dari data yang sudah tersimpan di Jadwal, Peserta & Pembagian Ruangan serta Daftar & Jadwal Pengawas -- tidak perlu isi ulang.",
      },
      {
        judul: "Export PDF",
        deskripsi:
          'Klik "Export PDF" untuk mengunduh dokumen lengkap: dasar hukum, susunan panitia, jadwal per sesi, pembagian ruang & pengawas, sampai Tata Tertib Peserta dan Tata Tertib Pengawas (isinya baku, otomatis ditambahkan, tidak perlu diketik).',
      },
    ],
    catatan:
      "Dokumen ini untuk SEBELUM ujian berlangsung -- bahan pemeriksaan pengawas/pengawas satuan pendidikan.",
  },
  {
    id: "laporan-rekap-akhir",
    title: "Rekap & Evaluasi",
    iconName: "ClipboardCheck",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran",
        deskripsi: "Buka kartu, lalu pilih Tahun Ajaran.",
      },
      {
        judul: "Rekap Otomatis (Peserta & Ruangan, Pengawas)",
        deskripsi:
          "2 item ini read-only di sini, datanya reuse langsung dari Jadwal, Peserta & Pembagian Ruangan dan Daftar & Jadwal Pengawas -- pastikan kedua sub-fitur itu sudah lengkap dulu supaya rekapnya akurat.",
      },
      {
        judul: "Isi Rekap Kehadiran",
        deskripsi:
          "Setelah ujian selesai, rekap ulang jumlah hadir/tidak hadir per ruangan ke sini berdasarkan Daftar Hadir kertas dari sub-fitur Presensi & Berita Acara, lalu klik Simpan per ruangan.",
      },
    ],
    catatan:
      'Dokumen ini untuk SETELAH ujian selesai -- kebalikan dari Program Kerja Pelaksanaan yang isinya rencana sebelum ujian. Kartu ini TIDAK punya tombol cetak PDF -- setelah semua rekap di atas terisi, buka kartu "Laporan Lengkap" untuk mengunduh PDF resminya.',
  },
  {
    id: "laporan-lengkap",
    title: "Laporan Lengkap",
    iconName: "FileStack",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran",
        deskripsi:
          'Buka kartu, lalu pilih Tahun Ajaran yang sama dengan yang dipakai di "Rekap & Evaluasi".',
      },
      {
        judul: "Cek Status Tiap Bagian",
        deskripsi:
          'Daftar bagian laporan ditandai "Siap" (hijau) atau "Belum diisi" (kuning). Bagian yang kuning tetap bisa dicetak, tapi isinya kosong -- isi dulu lewat kartu "Rekap & Evaluasi" kalau mau lengkap.',
      },
      {
        judul: "Unduh PDF",
        deskripsi:
          'Klik "Generate Laporan Lengkap (PDF)" untuk mengunduh 1 file PDF resmi: Sampul, Kata Pengantar, Daftar Isi, Pendahuluan, seluruh rekap, dan Penutup dengan tanda tangan Kepala Sekolah.',
      },
    ],
    catatan:
      'Kartu ini cuma membaca ulang data yang sudah diisi di "Rekap & Evaluasi" -- tidak ada input data di sini, murni tempat cetak PDF resminya.',
  },
];

export { PANDUAN };
