// supabase/functions/extract-raport-pdf/index.ts
// Dipanggil dari ImportRaportForm.js (src/setting/kelola-raport/) lewat
// `supabase.functions.invoke("extract-raport-pdf", { body: { path } })`
// setelah admin upload PDF ke storage bucket "raport-pdf".
//
// Alur function ini:
//   1. Download PDF dari storage berdasarkan `path`
//   2. Extract teks mentahnya
//   3. Parse teks itu jadi data per-siswa (nama, NIS, daftar mapel+nilai)
//   4. Balikin array siswa ke frontend buat ditampilin di PreviewImportTable.js
//
// ============================================================================
// PENTING -- BACA INI SEBELUM PAKAI DI PRODUCTION:
// Regex parsing di `parseRaportText()` ini BEST-EFFORT, dibikin berdasarkan
// contoh tampilan raport di dokumentasi (bag. 8: "Nama :", "Kelas :", tabel
// "Mata Pelajaran | Nilai"), BUKAN hasil test terhadap PDF e-Raport
// Pemerintah yang ASLI. PDF resmi biasanya punya kop surat, tabel bergaris,
// dan spacing yang lebih ribet dari mockup itu.
//
// Sebelum dipakai beneran:
//   1. Ambil 1 PDF raport asli, extract teksnya (deploy function ini lalu
//      test, atau pakai `pdftotext -layout file.pdf -` di lokal buat liat
//      hasil raw text-nya)
//   2. Bandingkan sama regex di STUDENT_BLOCK marker & SCORE_LINE_REGEX
//   3. Sesuaikan sampai jumlah siswa & nilai yang ke-parse itu akurat
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { path } = await req.json();
    if (!path) {
      return jsonResponse(
        { error: "Parameter 'path' (lokasi file PDF di storage) wajib diisi" },
        400,
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Download PDF dari bucket "raport-pdf"
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("raport-pdf")
      .download(path);

    if (downloadError || !fileBlob) {
      return jsonResponse(
        { error: `Gagal ambil file dari storage: ${downloadError?.message}` },
        400,
      );
    }

    // 2. Extract teks mentah dari PDF
    const buffer = new Uint8Array(await fileBlob.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });

    // 3. Parse teks jadi data per-siswa
    const siswaList = parseRaportText(text);

    if (siswaList.length === 0) {
      return jsonResponse(
        {
          error:
            "Ga ada data siswa yang berhasil kebaca dari PDF ini. Cek format filenya.",
        },
        422,
      );
    }

    return jsonResponse({ siswaList });
  } catch (err) {
    console.error("extract-raport-pdf error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Gagal memproses PDF" },
      500,
    );
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Parsing logic -- TODO: kalibrasi ulang pakai teks hasil extract PDF ASLI.
// ---------------------------------------------------------------------------

interface ExtractedGrade {
  subject: string;
  score: number;
}

interface ExtractedSiswa {
  id: string;
  name: string;
  nis: string;
  status: "valid" | "warning" | "failed";
  grades: ExtractedGrade[];
}

const EXPECTED_MIN_SUBJECTS = 3; // dipakai buat validasi "jumlah mapel wajar"

// Baris "Nama Mapel .... 88" -- nama mapel diikuti spasi lalu angka 0-100 di ujung baris
const SCORE_LINE_REGEX = /^([A-Za-zÀ-ÿ.,'()\- ]+?)\s+(\d{1,3})\s*$/gm;

function parseRaportText(rawText: string): ExtractedSiswa[] {
  const normalized = rawText.replace(/\r/g, "").replace(/[ \t]+/g, " ");

  // Pecah teks jadi per-blok-siswa berdasarkan kemunculan "Nama :" berulang
  // (asumsi 1 siswa = 1 halaman/section yang selalu diawali field "Nama").
  const blocks = splitByStudentBlocks(normalized);

  return blocks.map((block, index) => {
    const name = extractField(block, /Nama\s*:?\s*(.+)/i);
    const nis = extractField(block, /(?:NIS\/NISN|NISN|NIS)\s*:?\s*(.+)/i);
    const grades = extractGrades(block);

    let status: ExtractedSiswa["status"] = "valid";
    if (!name || !nis) status = "warning"; // nama/NIS ga kebaca -> perlu diperiksa manual
    if (grades.length < EXPECTED_MIN_SUBJECTS) status = "warning";
    if (!name && !nis && grades.length === 0) status = "failed"; // blok kedetect tapi kosong total

    return {
      id: `extract-${index}-${Date.now()}`,
      name: name || "(nama tidak terbaca)",
      nis: nis || "(NIS tidak terbaca)",
      status,
      grades,
    };
  });
}

function splitByStudentBlocks(text: string): string[] {
  const markers = [...text.matchAll(/Nama\s*:?\s*/gi)].map((m) => m.index ?? 0);
  if (markers.length === 0) return [text];

  const blocks: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i];
    const end = i + 1 < markers.length ? markers[i + 1] : text.length;
    blocks.push(text.slice(start, end));
  }
  return blocks;
}

function extractField(block: string, regex: RegExp): string | null {
  const match = block.match(regex);
  return match ? match[1].trim().split("\n")[0].trim() : null;
}

function extractGrades(block: string): ExtractedGrade[] {
  const grades: ExtractedGrade[] = [];
  const regex = new RegExp(SCORE_LINE_REGEX);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(block)) !== null) {
    const subject = match[1].trim();
    const score = Number(match[2]);
    // Filter baris yang jelas bukan mapel (mis. kebaca dari "Tahun 2026" dsb)
    if (subject.length < 3 || score < 0 || score > 100) continue;
    grades.push({ subject, score });
  }
  return grades;
}
