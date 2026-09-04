#!/usr/bin/env node
/**
 * db-struktur.js
 * -----------------------------------------------------------------------
 * Generate struktur database (tabel, kolom, tipe, PK/FK) dari Supabase,
 * jalan di TERMINAL — bukan dari browser.
 *
 * KENAPA HARUS DARI TERMINAL, PADAHAL DatabaseStructure.js AWALNYA
 * DIRENCANAIN FETCH LANGSUNG DARI UI?
 * Per 8 April 2026, Supabase NUTUP akses endpoint OpenAPI schema
 * (`/rest/v1/`) buat anon key — sekarang cuma bisa diakses pakai
 * `service_role` key (breaking change dari Supabase sendiri, alasannya
 * keamanan: skema tabel jangan sampai bisa diintip siapapun yang cuma
 * pegang anon key). Detail: https://supabase.com/changelog/42949
 *
 * `service_role` key TIDAK BOLEH PERNAH nyentuh kode yang jalan di
 * browser — kalau bocor ke client bundle, siapapun bisa akses SELURUH
 * database tanpa kena RLS sama sekali. Makanya script ini WAJIB jalan di
 * Node (server-side/lokal), persis kayak audit-kode.js.
 *
 * SETUP (SEKALI SAJA):
 *   1. Ambil `service_role` key dari Supabase Dashboard -> Project
 *      Settings -> API -> `service_role` `secret`.
 *   2. Tambahin ke file .env (BUKAN .env yang di-commit, dan JANGAN
 *      pernah kasih prefix REACT_APP_ — kalau ke-prefix REACT_APP_,
 *      Create React App bakal ikut nge-bundle ke kode browser):
 *
 *        SUPABASE_SERVICE_ROLE_KEY=xxxxxxxx
 *
 *      (SUPABASE_URL boleh pakai ulang REACT_APP_SUPABASE_URL yang
 *      udah ada, karena URL project bukan rahasia.)
 *
 * CARA PAKAI:
 *   node scripts/db-struktur.js
 *
 * Output: public/db-structure-report.json — dibaca sama tab
 * "Struktur Database" di Monitor Sistem (src/system/DatabaseStructure.js).
 * -----------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT, "public", "db-structure-report.json");

// ---------------------------------------------------------------------
// Baca .env manual (gak nambah dependency baru, cukup fs bawaan Node).
// Support .env dan .env.local, prioritas .env.local kalau ada (sama
// urutan CRA).
// ---------------------------------------------------------------------
function loadEnvFile(filename) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const vars = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  });
  return vars;
}

const env = {
  ...loadEnvFile(".env"),
  ...loadEnvFile(".env.local"),
  ...process.env, // env asli (misal export manual di shell) tetap menang
};

const SUPABASE_URL = env.SUPABASE_URL || env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_URL / REACT_APP_SUPABASE_URL gak ketemu di .env");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY gak ketemu di .env");
  console.error("   Ambil dari Supabase Dashboard -> Project Settings -> API -> service_role.");
  console.error("   Tambahin ke .env sebagai: SUPABASE_SERVICE_ROLE_KEY=xxxxx");
  console.error("   (JANGAN pakai prefix REACT_APP_ — biar gak ke-bundle ke browser.)");
  process.exit(1);
}

// ---------------------------------------------------------------------
// Fetch OpenAPI schema pakai https/http bawaan Node (gak butuh
// node-fetch di Node versi lama).
// ---------------------------------------------------------------------
function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error(`Response bukan JSON valid: ${err.message}`));
        }
      });
    });
    req.on("error", reject);
  });
}

// Parse catatan PK/FK yang disisipin PostgREST di description kolom.
function parseColumnNotes(description) {
  if (!description) return { isPrimaryKey: false, foreignKey: null };
  const isPrimaryKey = /<pk\/>/.test(description);
  const fkMatch = description.match(/<fk table=['"]([^'"]+)['"] column=['"]([^'"]+)['"]\s*\/>/);
  return {
    isPrimaryKey,
    foreignKey: fkMatch ? { table: fkMatch[1], column: fkMatch[2] } : null,
  };
}

async function main() {
  console.log("🔍 Mengambil struktur database dari Supabase...\n");
  const startTime = Date.now();

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/`;
  let doc;
  try {
    doc = await fetchJson(url, {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Accept: "application/openapi+json",
    });
  } catch (err) {
    console.error(`❌ Gagal ambil schema: ${err.message}`);
    process.exit(1);
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

  // Format list polos "tabel : kolom1,kolom2,..." — enak buat ditempel ke
  // dokumentasi/chat, beda kegunaan sama tabel interaktif yang detail per
  // kolom (tipe, PK, FK).
  const plainList =
    "## Daftar Tabel Database Supabase\n" +
    tables.map((t) => `${t.name} : ${t.columns.map((c) => c.name).join(",")}`).join("\n");

  const report = {
    generatedAt: new Date().toISOString(),
    executionTimeMs: Date.now() - startTime,
    totalTables: tables.length,
    tables,
    plainList,
  };

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), "utf8");

  console.log(`✅ ${tables.length} tabel ditemukan (${report.executionTimeMs}ms)`);
  console.log(`   Laporan disimpan ke: ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(`   Buka app -> Monitor Sistem -> tab "Struktur Database" buat liat hasilnya.\n`);
  console.log(
    "⚠️  public/db-structure-report.json berisi peta lengkap skema database (nama tabel,"
  );
  console.log("   kolom, relasi FK). Ini bukan data rahasia setara service_role key, tapi tetep");
  console.log("   worth dipertimbangkan buat di-.gitignore kalau repo-nya public, biar gak jadi");
  console.log("   peta siap-pakai buat orang luar.\n");
}

main();
