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

const PANDUAN = [
  {
    id: "pembagian-ruangan",
    title: "Peserta & Pembagian Ruangan",
    iconName: "DoorOpen",
    langkah: [
      {
        judul: "Pilih Jenis Ujian & Tahun Ajaran",
        deskripsi:
          'Dari halaman utama Manajemen Ujian, pilih jenis ujian (PSAS/PSAT/PSAJ), lalu buka kartu "Peserta & Pembagian Ruangan" dan pilih Tahun Ajaran yang sesuai.',
      },
      {
        judul: "Proses Pembagian",
        deskripsi:
          'Kapasitas per ruangan sudah terisi otomatis sesuai jenis ujian (bisa diubah manual). Klik "Proses Pembagian" untuk membuat preview otomatis berdasarkan jumlah siswa aktif per kelas.',
      },
      {
        judul: "Sesuaikan Quota per Ruangan",
        deskripsi:
          'Cek & edit quota manual di tab "Edit" kalau perlu. Pastikan baris "Target" tiap kelas tidak berwarna merah -- artinya total siswa per kelas sudah pas.',
      },
      {
        judul: "Cek Preview",
        deskripsi:
          'Gunakan tab "Preview" untuk melihat tampilan daftar peserta per ruangan sebelum disimpan atau dicetak.',
      },
      {
        judul: "Simpan ke Database",
        deskripsi:
          'Klik "Simpan ke Database" agar hasil pembagian tersimpan. Sub-fitur lain (Jadwal & Pengawas, Kartu Ujian, Presensi) baru bisa jalan setelah data ini tersimpan.',
      },
      {
        judul: "Export Daftar Peserta",
        deskripsi:
          'Di tab "Export", unduh daftar peserta per ruangan atau semua ruangan sekaligus dalam format Excel atau PDF -- untuk ditempel di pintu ruangan.',
      },
    ],
  },
  {
    id: "jadwal-pengawas",
    title: "Jadwal & Pengawas",
    iconName: "CalendarClock",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran",
        deskripsi: "Buka kartu, lalu pilih Tahun Ajaran yang sama dengan Pembagian Ruangan.",
      },
      {
        judul: "Tab Jadwal Sesi",
        deskripsi:
          "Tambahkan sesi ujian satu per satu: tanggal, jam, dan mata pelajaran yang diujikan.",
      },
      {
        judul: "Tab Daftar Pengawas",
        deskripsi:
          "Daftarkan guru yang bertugas sebagai pengawas beserta kode singkatnya (dipakai di jadwal ngawas & kartu pengawas).",
      },
      {
        judul: "Tab Jadwal Ngawas",
        deskripsi:
          "Tetapkan guru pengawas untuk tiap ruangan pada setiap sesi. Daftar ruangan diambil otomatis dari hasil Pembagian Ruangan -- kalau belum muncul, pastikan sub-fitur itu sudah diproses & disimpan dulu.",
      },
    ],
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
          "Pilih guru pengawas, lalu cetak kartu penugasan berdasarkan jadwal ngawas yang sudah diatur di sub-fitur Jadwal & Pengawas.",
      },
    ],
    catatan:
      "Pastikan Pembagian Ruangan dan Jadwal & Pengawas sudah lengkap dulu supaya data di kartu akurat.",
  },
  {
    id: "presensi-berita-acara",
    title: "Presensi & Berita Acara",
    iconName: "FileBarChart2",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran & Sesi",
        deskripsi:
          "Pilih Tahun Ajaran, lalu pilih Sesi Ujian dari dropdown (daftar sesi diambil dari Jadwal & Pengawas).",
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
    title: "Kepanitiaan & Regulasi",
    iconName: "FileText",
    belumTersedia: true,
    langkah: [],
    catatan:
      "Sub-fitur ini belum dibangun. Rencananya akan berisi SK panitia, SK tugas pengawas, dan tata tertib ujian.",
  },
  {
    id: "anggaran-biaya",
    title: "Anggaran & Biaya",
    iconName: "Wallet",
    langkah: [
      {
        judul: "Pilih Tahun Ajaran",
        deskripsi: "Buka kartu, lalu pilih Tahun Ajaran.",
      },
      {
        judul: "Tambah Pos Anggaran",
        deskripsi:
          'Klik "Tambah Pos", isi Kategori (mis. ATK, Konsumsi, Honor Pengawas), Uraian, dan nominal Anggaran yang direncanakan.',
      },
      {
        judul: "Isi Realisasi Setelah Belanja",
        deskripsi:
          "Setelah biaya benar-benar dikeluarkan, klik ikon pensil pada pos terkait dan isi kolom Realisasi dengan nominal aktual yang terpakai.",
      },
      {
        judul: "Pantau Ringkasan",
        deskripsi:
          "Lihat kartu ringkasan Total Anggaran, Total Realisasi, dan Sisa Anggaran di bagian atas -- angka merah berarti realisasi sudah melebihi anggaran yang direncanakan.",
      },
      {
        judul: "Hapus Pos yang Salah",
        deskripsi:
          "Klik ikon tempat sampah pada pos yang tidak jadi/salah input. Akan ada konfirmasi sebelum data benar-benar dihapus.",
      },
    ],
  },
];

export { PANDUAN };
