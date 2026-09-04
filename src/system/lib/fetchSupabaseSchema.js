// system/lib/fetchSupabaseSchema.js
// -----------------------------------------------------------------------
// Ambil struktur database (tabel, kolom, tipe data, primary key, foreign
// key) LANGSUNG dari Supabase, real-time, tanpa perlu script Node
// terpisah — beda sama Project Structure yang wajib baca file dari disk.
//
// Caranya: PostgREST (mesin REST API di balik Supabase) otomatis expose
// dokumentasi OpenAPI/Swagger di endpoint root REST-nya
// (`${SUPABASE_URL}/rest/v1/`). Dokumen itu berisi definition tiap tabel
// yang RLS-nya ngasih akses SELECT ke role yang dipakai (anon/authenticated),
// lengkap sama nama kolom, tipe, dan catatan PK/FK yang disisipkan
// PostgREST di field `description`.
//
// KETERBATASAN JUJUR:
//  - Tabel yang RLS-nya nutup total buat role ini gak akan muncul di sini
//    (dari sisi client, itu justru behavior yang benar — kita gak boleh
//    liat struktur yang emang dikunci).
//  - RLS ON/OFF per tabel dan isi policy TIDAK bisa dibaca dari sini.
//    PostgREST OpenAPI gak expose itu, dan `pg_policies` butuh akses
//    database level yang gak dipunyai anon key. Kalau butuh info ini,
//    caranya bikin RPC function khusus (`security definer`) yang di-expose
//    manual — di luar scope helper ini.
// -----------------------------------------------------------------------

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Parse catatan PK/FK yang disisipin PostgREST di description kolom.
// Contoh isi description asli dari PostgREST:
//   "Note:\nThis is a Primary Key.<pk/>"
//   "Note:\nThis is a Foreign Key to `students.id`.<fk table='students' column='id'/>"
function parseColumnNotes(description) {
  if (!description) return { isPrimaryKey: false, foreignKey: null };
  const isPrimaryKey = /<pk\/>/.test(description);
  const fkMatch = description.match(/<fk table=['"]([^'"]+)['"] column=['"]([^'"]+)['"]\s*\/>/);
  return {
    isPrimaryKey,
    foreignKey: fkMatch ? { table: fkMatch[1], column: fkMatch[2] } : null,
  };
}

export async function fetchSupabaseSchema() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      success: false,
      error: "REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY gak ketemu di env.",
      tables: [],
    };
  }

  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/openapi+json",
      },
    });
  } catch (err) {
    return {
      success: false,
      error: `Gagal konek ke Supabase REST endpoint: ${err.message}`,
      tables: [],
    };
  }

  if (!res.ok) {
    return {
      success: false,
      error: `Supabase REST endpoint balikin status ${res.status}`,
      tables: [],
    };
  }

  let doc;
  try {
    doc = await res.json();
  } catch (err) {
    return {
      success: false,
      error: "Response bukan JSON valid — cek apakah project ini beneran pake PostgREST/Supabase.",
      tables: [],
    };
  }

  const definitions = doc.definitions || doc.components?.schemas || {};
  const tables = Object.entries(definitions).map(([tableName, def]) => {
    const requiredCols = new Set(def.required || []);
    const properties = def.properties || {};
    const columns = Object.entries(properties).map(([colName, colDef]) => {
      const notes = parseColumnNotes(colDef.description);
      return {
        name: colName,
        type: colDef.format || colDef.type || "unknown",
        nullable: !requiredCols.has(colName),
        isPrimaryKey: notes.isPrimaryKey,
        foreignKey: notes.foreignKey,
        default: colDef.default !== undefined ? String(colDef.default) : null,
      };
    });
    return {
      name: tableName,
      columns,
      primaryKeys: columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
      foreignKeys: columns
        .filter((c) => c.foreignKey)
        .map((c) => ({
          column: c.name,
          refTable: c.foreignKey.table,
          refColumn: c.foreignKey.column,
        })),
    };
  });

  tables.sort((a, b) => a.name.localeCompare(b.name));

  return {
    success: true,
    error: null,
    fetchedAt: new Date().toISOString(),
    totalTables: tables.length,
    tables,
  };
}
