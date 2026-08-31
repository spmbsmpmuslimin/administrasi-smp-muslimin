// supabase/functions/rekap-presensi/index.ts
// Fungsi ini jalan di project Aplikasi Guru.
// Tugasnya: terima request dari Aplikasi TU (lewat proxy), balikin rekap
// presensi (hadir/sakit/izin/alpha per siswa) untuk 1 kelas + 1 semester.
// HANYA baca data (SELECT), tidak pernah insert/update/delete.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  // Browser preflight request (OPTIONS) — wajib di-handle biar CORS gak error
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ 1. Cek shared secret — cuma request yang bawa secret yang benar yang boleh lanjut
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_SECRET");

    if (!expectedSecret || internalSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ 2. Ambil parameter dari body request
    const { class_id, academic_year_id, semester } = await req.json();

    if (!class_id || !academic_year_id || !semester) {
      return new Response(
        JSON.stringify({ error: "class_id, academic_year_id, dan semester wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ 3. Bikin Supabase client pake SERVICE ROLE KEY (akses penuh baca data,
    // tapi key ini cuma ada di server, ga pernah kekirim ke browser TU)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ✅ 4. Query raw attendances + join nama siswa
    const { data, error } = await supabase
      .from("attendances")
      .select("student_id, status, students(full_name, nis)")
      .eq("class_id", class_id)
      .eq("academic_year_id", academic_year_id)
      .eq("semester", semester);

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: "Gagal mengambil data presensi" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ 5. Agregasi manual: dari baris-baris mentah jadi rekap per siswa
    const rekapMap = new Map();

    for (const row of data) {
      const studentId = row.student_id;
      const studentInfo = row.students;

      if (!rekapMap.has(studentId)) {
        rekapMap.set(studentId, {
          student_id: studentId,
          full_name: studentInfo?.full_name || "Tidak diketahui",
          nis: studentInfo?.nis || "-",
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0,
        });
      }

      const entry = rekapMap.get(studentId);
      const status = (row.status || "").toLowerCase();

      if (status === "hadir") entry.hadir += 1;
      else if (status === "sakit") entry.sakit += 1;
      else if (status === "izin") entry.izin += 1;
      else if (status === "alpha" || status === "alpa") entry.alpha += 1;
    }

    // Urutin berdasarkan nama biar rapi
    const rekap = Array.from(rekapMap.values()).sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );

    return new Response(JSON.stringify({ data: rekap }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Terjadi kesalahan server" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
