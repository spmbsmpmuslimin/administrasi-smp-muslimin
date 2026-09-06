#!/usr/bin/env node
/**
 * audit-kode.js
 * -----------------------------------------------------------------------
 * Static codebase auditor buat Administrasi SMP Muslimin.
 * Ini BUKAN pengganti MonitorSistem (yang ngecek data/business logic
 * runtime lewat Supabase) — ini ngecek KODENYA SENDIRI, hal-hal yang
 * gak akan pernah ketauan cuma dari ngecek data di database:
 *
 *   1. Broken imports        - import nunjuk ke file yang udah gak ada
 *   2. Orphan files           - file dibikin tapi gak pernah di-import
 *   3. Menu/Sidebar mismatch  - sidebarConfig nunjuk ke page yang gak
 *                               terdaftar di menuConfig (link mati)
 *   4. Dark mode regression   - class warna Tailwind hardcoded yang
 *                               kelewat gak di-convert ke token theme-*
 *   5. Supabase embedded join - query yang diam-diam pake embedded
 *                               join (`select('*, table(...)')`) —
 *                               pattern yang udah lo hindari total
 *                               gara-gara PGRST200
 *   6. Table name drift       - .from('nama_tabel') yang nama tabelnya
 *                               gak match strukturfile.txt (typo /
 *                               tabel udah dihapus/direname)
 *
 * CARA PAKAI:
 *   node scripts/audit-kode.js
 *
 * Output: public/audit-report.json — dibaca otomatis sama tab
 * "Code Audit" di Monitor Sistem (src/system/CodeAudit.js).
 * Tinggal buka app -> Monitor Sistem -> tab Code Audit, refresh browser
 * kalo lagi jalan `npm start`.
 *
 * Gak butuh dependency baru — cuma pake fs/path bawaan Node.
 * -----------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const STRUKTUR_FILE = path.join(ROOT, "strukturfile.txt");
const OUTPUT_FILE = path.join(ROOT, "public", "audit-report.json");
const STRUCTURE_OUTPUT_FILE = path.join(ROOT, "public", "structure-report.json");

const CODE_EXT = [".js", ".jsx", ".ts", ".tsx"];

// File yang boleh gak punya "importer" (entry point / dipanggil framework,
// bukan diimport manual dari komponen lain).
const ENTRY_POINT_ALLOWLIST = new Set([
  "src/index.js",
  "src/App.js",
  "src/reportWebVitals.js",
  "src/setupTests.js",
  "src/supabaseClient.js", // dipake di mana-mana tapi kadang lolos regex kalau aliasing aneh
  "src/constants.js",
]);

// Pattern nama file yang juga gak perlu dianggap orphan (test file, dsb)
const ORPHAN_IGNORE_PATTERNS = [/\.test\.jsx?$/, /\.spec\.jsx?$/, /\.d\.ts$/];

// ---------------------------------------------------------------------
// CONFIG buat check #7 (academicYearService usage) — SESUAIN INI kalau
// nama field / nama service / lokasi file di project lo beda. Heuristik
// regex, jadi kalau kebanyakan false positive, longgarin pattern-nya.
// ---------------------------------------------------------------------

// Substring path import yang dianggap "udah pake academicYearService".
// Case-insensitive. Cocok buat `from "../services/academicYearService"`,
// `from "services/academicYearService"`, dst.
const ACADEMIC_YEAR_SERVICE_IMPORT_HINT = /academicYearService/i;

// File service itu sendiri — jangan di-flag ke diri sendiri.
const ACADEMIC_YEAR_SERVICE_FILE_HINT = /academicYearService\.[jt]sx?$/i;

// Query LANGSUNG ke tabel academic_years — ini sinyal PALING KUAT.
// File yang query tabel ini sendiri (biasanya buat ambil daftar tahun
// ajaran dan/atau nentuin mana yang aktif) tapi gak lewat service berarti
// dia REIMPLEMENT logic yang harusnya dipusatkan di academicYearService.
const ACADEMIC_YEARS_TABLE_RE = /\.from\(\s*["'`]academic_years["'`]\s*\)/;

// Pola "nentuin tahun aktif sendiri" — misal `.find(y => y.is_active)`
// atau sejenisnya, dibarengin query academic_years di atas. Ini
// memperkuat (bukan syarat wajib) bahwa file itu reimplement logic
// service, bukan cuma baca 1-2 kolom buat keperluan lain.
const IS_ACTIVE_LOGIC_RE = /is_active/;

// Nama kolom FK tahun ajaran di tabel LAIN (bukan academic_years).
// Sekadar filter tabel lain pake academic_year_id itu WAJAR kalau ID-nya
// emang dikasih dari luar (parameter/prop) — makanya field ini SENDIRIAN
// bukan bukti kuat. Dipakai cuma buat sinyal sekunder yang levelnya "info",
// bukan "warning", biar gak berisik kayak kasus AttendancePDF.js kemarin
// (nerima academicYearId sebagai parameter, cuma filter, itu sah-sah aja).
const ACADEMIC_YEAR_FIELD_RE =
  /["'`](academic_year_id|academicYearId|tahun_ajaran_id|tahunAjaranId)["'`]/;

const SUPABASE_CALL_RE = /\.from\(\s*["'`]/;

// Sinyal buat hardcode-kalender: fungsi yang ngitung tahun ajaran sendiri
// dari `new Date()` / `.getMonth()`, bukan dari database atau service sama
// sekali. Biasanya nongol sebagai template literal kayak
// `${currentYear}/${currentYear + 1}` — dua interpolasi yang sama-sama
// ngandung kata "year", dipisah "/". Ini POLA, bukan syarat pasti-benar;
// perlu dibarengin `.getMonth()` di file yang sama biar lebih yakin ini
// beneran ngitung dari kalender, bukan cuma nampilin string tahun ajaran
// yang udah didapat dari tempat lain (misal `selectedYear.year`).
const GET_MONTH_CALL_RE = /\.getMonth\(\)/;
const HARDCODED_YEAR_TEMPLATE_RE = /`\$\{[^`]*?[Yy]ear[^`]*?\}\s*\/\s*\$\{[^`]*?[Yy]ear[^`]*?\}`/;

// Pattern backup/restore: query academic_years yang muncul cuma sebagai
// bagian dari operasi bulk multi-tabel (backup/restore/cleanup seluruh
// database), BUKAN usaha nentuin "tahun ajaran aktif". Dua tanda:
//  a) baris .from("academic_years") diikuti .delete(/.insert( dalam 2
//     baris berikutnya (restore: hapus semua lalu insert ulang dari file
//     backup) — ini query tabel sebagai OBJEK backup, bukan buat dibaca
//     nilainya.
//  b) match ada di dalem blok Promise.all([...]) yang isinya banyak
//     .from(tabel_lain) lain juga (pattern "backup semua tabel sekaligus").
const DELETE_OR_INSERT_RE = /\.delete\(|\.insert\(/;
const PROMISE_ALL_RE = /Promise\.all\(/;
const BACKUP_WINDOW = 6; // baris sebelum/sesudah yang dicek buat konteks bulk backup/restore

function isLikelyBulkBackupRestore(lines, matchIdx) {
  const start = Math.max(0, matchIdx - BACKUP_WINDOW);
  const end = Math.min(lines.length, matchIdx + BACKUP_WINDOW + 1);
  const window = lines.slice(start, end).join("\n");
  // 2 baris setelah match langsung .delete(/.insert( -> restore tabel ini
  const nextFew = lines.slice(matchIdx, matchIdx + 3).join("\n");
  if (DELETE_OR_INSERT_RE.test(nextFew)) return true;
  // Promise.all() di sekitar match, DAN ada >=3 .from( lain di window yang
  // sama -> pattern "fetch semua tabel sekaligus buat backup/dashboard"
  if (PROMISE_ALL_RE.test(window)) {
    const fromCount = (window.match(/\.from\(\s*["'`]/g) || []).length;
    if (fromCount >= 4) return true;
  }
  return false;
}

// ---------------------------------------------------------------------
// UTIL
// ---------------------------------------------------------------------

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, fileList);
    } else if (CODE_EXT.includes(path.extname(entry.name))) {
      fileList.push(full);
    }
  }
  return fileList;
}

// Sama kayak walk(), tapi TANPA filter ekstensi — dipake khusus buat
// render tree text polos (semua file: .js, .png, .webp, .html, dst),
// bukan buat analisis import/fungsi (yang emang cuma masuk akal untuk
// file kode).
function walkAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAllFiles(full, fileList);
    } else {
      fileList.push(full);
    }
  }
  return fileList;
}

// Render ASCII tree text klasik (format `|--` / `` ` -- ``), mirip output
// command `tree --charset=ascii`. Folder duluan baru file, alfabetis —
// biar konsisten sama urutan di tab interaktif.
function buildAsciiTree(allFiles, rootDir) {
  const root = { name: path.basename(rootDir), children: {} };
  for (const file of allFiles) {
    const parts = path.relative(rootDir, file).split(path.sep);
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (!cursor.children) cursor.children = {};
      if (isFile) {
        cursor.children[part] = { name: part, type: "file" };
      } else {
        if (!cursor.children[part]) {
          cursor.children[part] = { name: part, type: "folder", children: {} };
        }
        cursor = cursor.children[part];
      }
    }
  }

  function sortedChildren(node) {
    return Object.values(node.children || {}).sort((a, b) => {
      const aIsFolder = a.type === "folder";
      const bIsFolder = b.type === "folder";
      if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
      // Case-sensitive (bukan localeCompare) biar urutannya sama kayak
      // command `tree` bawaan OS: huruf besar duluan, baru huruf kecil.
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
  }

  const lines = [`|-- ${root.name}`];
  function render(node, prefix) {
    const children = sortedChildren(node);
    children.forEach((child, idx) => {
      const isLast = idx === children.length - 1;
      const connector = isLast ? "`-- " : "|-- ";
      lines.push(prefix + connector + child.name);
      if (child.type === "folder") {
        render(child, prefix + (isLast ? "    " : "|   "));
      }
    });
  }
  render(root, "|   ");

  return lines.join("\n");
}

function toRel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function readFileLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/);
}

// Strip komentar biar contoh kode di comment / import yang di-comment-out
// gak ke-flag sebagai temuan asli. Heuristik (bukan full parser) tapi
// cukup buat kodebase JS/JSX biasa: block comment /* */ dihapus (baris
// tetap dijaga biar nomor baris gak geser), line comment // dihapus
// kecuali nempel langsung setelah ':' (biar gak ke-mutilasi "https://").
function stripComments(content) {
  let out = content.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  out = out
    .split(/\r?\n/)
    .map((line) => {
      for (let i = 0; i < line.length - 1; i++) {
        if (line[i] === "/" && line[i + 1] === "/" && line[i - 1] !== ":") {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join("\n");
  return out;
}

function resolveImport(fromFile, importPath) {
  const baseDir = path.dirname(fromFile);
  const target = path.resolve(baseDir, importPath);
  const candidates = [
    target,
    ...CODE_EXT.map((ext) => target + ext),
    ...CODE_EXT.map((ext) => path.join(target, "index" + ext)),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function pushIssue(bucket, severity, title, description, details) {
  bucket.push({ severity, title, description, details: details || [] });
}

// ---------------------------------------------------------------------
// 1 & 2: BROKEN IMPORTS + ORPHAN FILES
// ---------------------------------------------------------------------

function checkImportsAndOrphans(allFiles) {
  const issues = [];
  const referenced = new Set();
  const brokenDetails = [];
  let brokenCount = 0;

  const IMPORT_RE =
    /(?:import\s+(?:[\w*\s{},]+from\s+)?|export\s+(?:[\w*\s{},]+from\s+)?|require\()\s*["'`](\.[^"'`]+)["'`]\)?/g;

  for (const file of allFiles) {
    const raw = fs.readFileSync(file, "utf8");
    const content = stripComments(raw);
    let match;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = resolveImport(file, importPath);
      if (resolved) {
        referenced.add(resolved);
      } else {
        brokenCount++;
        // cari nomor baris approx
        const upTo = content.slice(0, match.index);
        const lineNo = upTo.split(/\r?\n/).length;
        brokenDetails.push(`${toRel(file)}:${lineNo} → import "${importPath}" (target gak ketemu)`);
      }
    }
  }

  if (brokenCount > 0) {
    pushIssue(
      issues,
      "critical",
      `${brokenCount} broken import ditemukan`,
      "Import nunjuk ke file yang gak ada di disk. Ini bakal bikin build gagal atau blank screen kalau route-nya diakses.",
      brokenDetails.slice(0, 50)
    );
  }

  // orphan files: file yang gak pernah muncul di `referenced`
  const orphans = [];
  for (const file of allFiles) {
    const rel = toRel(file);
    if (ENTRY_POINT_ALLOWLIST.has(rel)) continue;
    if (ORPHAN_IGNORE_PATTERNS.some((re) => re.test(rel))) continue;
    if (!referenced.has(file)) {
      orphans.push(rel);
    }
  }

  if (orphans.length > 0) {
    pushIssue(
      issues,
      "info",
      `${orphans.length} file gak pernah di-import di mana pun (dead file candidate)`,
      "File-file ini gak ketemu di-import statis dari file lain. Kemungkinan sisa refactor / fitur lama. Cek manual dulu sebelum dihapus — bisa aja dipake lewat dynamic import atau string reference yang gak kebaca regex.",
      orphans.slice(0, 80)
    );
  }

  return { issues, brokenCount, orphanCount: orphans.length };
}

// ---------------------------------------------------------------------
// 3: MENU CONFIG vs SIDEBAR CONFIG CONSISTENCY
// ---------------------------------------------------------------------

function checkMenuSidebarConsistency() {
  const issues = [];
  const menuConfigPath = path.join(SRC_DIR, "config", "menuConfig.js");
  const sidebarConfigPath = path.join(SRC_DIR, "config", "sidebarConfig.js");

  if (!fs.existsSync(menuConfigPath) || !fs.existsSync(sidebarConfigPath)) {
    pushIssue(
      issues,
      "warning",
      "menuConfig.js atau sidebarConfig.js gak ketemu",
      "Skip pengecekan konsistensi menu/sidebar.",
      []
    );
    return { issues };
  }

  const menuContent = fs.readFileSync(menuConfigPath, "utf8");
  const sidebarContent = fs.readFileSync(sidebarConfigPath, "utf8");

  const menuKeys = new Set(
    [...menuContent.matchAll(/path:\s*["'`]\/([a-zA-Z0-9_-]*)["'`]/g)].map((m) => m[1])
  );

  const sidebarPages = [...sidebarContent.matchAll(/page:\s*["'`]([a-zA-Z0-9_-]+)["'`]/g)].map(
    (m) => m[1]
  );

  const brokenLinks = [...new Set(sidebarPages)].filter((page) => !menuKeys.has(page));

  if (brokenLinks.length > 0) {
    pushIssue(
      issues,
      "critical",
      `${brokenLinks.length} item sidebar nunjuk ke page yang gak ada di menuConfig`,
      "Item sidebar ini bakal ke-klik tapi gak nyambung ke route mana pun (atau nyasar ke halaman lain / 404). Cek sidebarConfig.js dan pastiin 'page' cocok sama 'path' (tanpa leading slash) di menuConfig.js.",
      brokenLinks
    );
  }

  return {
    issues,
    menuEntryCount: menuKeys.size,
    sidebarEntryCount: sidebarPages.length,
  };
}

// ---------------------------------------------------------------------
// 4: DARK MODE HARDCODED COLOR HEURISTIC
// ---------------------------------------------------------------------

function getGloballyDarkOverriddenClasses() {
  const cssPath = path.join(SRC_DIR, "index.css");
  const overridden = new Set();
  if (!fs.existsSync(cssPath)) return overridden;
  const css = fs.readFileSync(cssPath, "utf8");
  const re = /\.dark\s+\.([a-zA-Z0-9_-]+)\s*{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    overridden.add(m[1]);
  }
  return overridden;
}

function checkDarkModeRegression(allFiles) {
  const issues = [];
  const overridden = getGloballyDarkOverriddenClasses();
  const perFileCount = new Map();
  let totalFlagged = 0;

  // class warna "polos" tanpa dark: variant yang berpotensi kelewat
  const COLOR_CLASS_RE =
    /\b(bg|text|border)-(gray|slate|zinc|neutral|stone|white|black)-?\d{0,3}\b/g;

  for (const file of allFiles) {
    const rel = toRel(file);
    if (rel.includes("/system/") && rel.includes("checkers/")) continue;

    const stripped = stripComments(fs.readFileSync(file, "utf8"));
    const lines = stripped.split(/\r?\n/);
    let fileCount = 0;
    lines.forEach((line) => {
      if (!line.includes("className")) return;
      let m;
      COLOR_CLASS_RE.lastIndex = 0;
      while ((m = COLOR_CLASS_RE.exec(line)) !== null) {
        const cls = m[0];
        if (overridden.has(cls)) continue; // udah di-handle global .dark override
        const darkVariantRe = new RegExp(`dark:${cls}\\b`);
        if (darkVariantRe.test(line)) continue;
        fileCount++;
      }
    });
    if (fileCount > 0) {
      perFileCount.set(rel, fileCount);
      totalFlagged += fileCount;
    }
  }

  if (totalFlagged > 0) {
    const sorted = [...perFileCount.entries()].sort((a, b) => b[1] - a[1]);
    const details = sorted
      .slice(0, 40)
      .map(([file, count]) => `${file} — ${count} class belum ada dark: variant`);

    pushIssue(
      issues,
      "info",
      `${totalFlagged} class warna (di ${perFileCount.size} file) kemungkinan belum dark-mode-aware`,
      "Ini backlog, bukan berarti semua salah — bisa aja file itu emang belum kena giliran migrasi theme-*, atau sengaja gak butuh dark mode (misal komponen buat print/PDF). Diurutin dari file paling banyak class polos-nya, biar keliatan mana yang paling worth dibenerin duluan. Heuristik regex, review manual tetep perlu.",
      details
    );
  }

  return { issues, flaggedCount: totalFlagged, fileCount: perFileCount.size };
}

// ---------------------------------------------------------------------
// 5: SUPABASE EMBEDDED JOIN DETECTION
// ---------------------------------------------------------------------

function checkEmbeddedJoins(allFiles) {
  const issues = [];
  const nakedDetails = [];
  const hintedDetails = [];

  // .select("... , identifier( ... ) ...")  -> tanda embedded join
  const SELECT_RE = /\.select\(\s*([`'"])([\s\S]*?)\1/g;
  // identifier langsung diikuti "(" -> embed. Kalau didahului "!" atau ":"
  // nempel ke identifier itu (atau identifier lain persis sebelumnya lewat
  // ":"), berarti udah ada disambiguation hint.
  const EMBED_RE =
    /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(|([a-zA-Z_][a-zA-Z0-9_]*)\s*!\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(|\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;

  for (const file of allFiles) {
    const rel = toRel(file);
    const content = stripComments(fs.readFileSync(file, "utf8"));
    let m;
    SELECT_RE.lastIndex = 0;
    while ((m = SELECT_RE.exec(content)) !== null) {
      const selectArg = m[2];
      EMBED_RE.lastIndex = 0;
      let em;
      let hasEmbed = false;
      let allHinted = true;
      while ((em = EMBED_RE.exec(selectArg)) !== null) {
        hasEmbed = true;
        const isHinted = em[1] !== undefined || em[3] !== undefined; // alias: atau !hint
        if (!isHinted) allHinted = false;
      }
      if (!hasEmbed) continue;

      const upTo = content.slice(0, m.index);
      const lineNo = upTo.split(/\r?\n/).length;
      const snippet = selectArg.replace(/\s+/g, " ").trim().slice(0, 90);
      const line = `${rel}:${lineNo} → select("${snippet}")`;
      if (allHinted) {
        hintedDetails.push(line);
      } else {
        nakedDetails.push(line);
      }
    }
  }

  if (nakedDetails.length > 0) {
    pushIssue(
      issues,
      "warning",
      `${nakedDetails.length} embedded join TANPA disambiguation hint`,
      "Query ini pake relational select (`select('*, table(...)')`) tanpa hint kayak `!inner`, `!nama_fk`, atau `alias:table`. Ini yang paling rawan kena PGRST200 kalau ada lebih dari satu foreign key antar 2 tabel itu. Worth di-cek satu-satu.",
      nakedDetails.slice(0, 50)
    );
  }

  if (hintedDetails.length > 0) {
    pushIssue(
      issues,
      "info",
      `${hintedDetails.length} embedded join yang UDAH pake disambiguation hint`,
      "FYI aja — ternyata di banyak file (CetakRaport, ReportHelpers, AdminReports, dll) project ini sebenernya pake embedded join Supabase, bukan resolve manual semua di JS. Yang ini kelihatannya udah aman karena udah ada hint (`!inner`, `!nama_fk`, atau `alias:table`) yang secara eksplisit nunjuk relasi mana yang dimaksud — itu emang cara resmi Supabase buat ngehindarin PGRST200. Kalau ternyata ini emang pattern yang lo pake sengaja, gue bakal update catatan gue soal ini.",
      hintedDetails.slice(0, 50)
    );
  }

  return {
    issues,
    nakedCount: nakedDetails.length,
    hintedCount: hintedDetails.length,
  };
}

// ---------------------------------------------------------------------
// 6: TABLE NAME DRIFT vs strukturfile.txt
// ---------------------------------------------------------------------

function parseSchemaTables() {
  const tables = new Set();
  if (!fs.existsSync(STRUKTUR_FILE)) return tables;
  const content = fs.readFileSync(STRUKTUR_FILE, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
    if (m) tables.add(m[1]);
    if (line.includes("===")) break; // berhenti pas masuk bagian struktur file
  }
  return tables;
}

function checkTableDrift(allFiles) {
  const issues = [];
  const validTables = parseSchemaTables();
  if (validTables.size === 0) {
    pushIssue(
      issues,
      "info",
      "strukturfile.txt gak ketemu / gak ada daftar tabel",
      "Skip pengecekan table name drift.",
      []
    );
    return { issues };
  }

  const FROM_RE = /\.from\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_]*)["'`]\s*\)/g;
  const usedTables = new Set();
  const unknownDetails = [];

  for (const file of allFiles) {
    const rel = toRel(file);
    const content = stripComments(fs.readFileSync(file, "utf8"));
    let m;
    FROM_RE.lastIndex = 0;
    while ((m = FROM_RE.exec(content)) !== null) {
      const tableName = m[1];
      usedTables.add(tableName);
      if (!validTables.has(tableName)) {
        const upTo = content.slice(0, m.index);
        const lineNo = upTo.split(/\r?\n/).length;
        unknownDetails.push(`${rel}:${lineNo} → .from("${tableName}")`);
      }
    }
  }

  if (unknownDetails.length > 0) {
    pushIssue(
      issues,
      "critical",
      `${unknownDetails.length} query .from() nunjuk ke tabel yang gak ada di strukturfile.txt`,
      "Kemungkinan typo nama tabel, atau tabel udah direname/dihapus tapi kodenya belum di-update, atau strukturfile.txt-nya yang basi. Query ini bakal error di runtime.",
      unknownDetails.slice(0, 50)
    );
  }

  const neverUsed = [...validTables].filter((t) => !usedTables.has(t)).sort();
  if (neverUsed.length > 0) {
    pushIssue(
      issues,
      "info",
      `${neverUsed.length} tabel di schema gak pernah dipanggil lewat .from() di kode`,
      "Belum tentu masalah — bisa aja view, tabel yang diakses cuma dari Supabase function/edge function, atau memang belum dipakai. Sekedar info.",
      neverUsed.slice(0, 50)
    );
  }

  return { issues };
}

// ---------------------------------------------------------------------
// 7: FILE YANG HARUSNYA PAKE academicYearService TAPI BELUM
// ---------------------------------------------------------------------

function checkAcademicYearServiceUsage(allFiles) {
  const issues = [];
  // Sinyal KUAT: file query tabel academic_years langsung (reimplement
  // "ambil daftar / tentuin tahun aktif" yang harusnya di service).
  const reimplementDetails = [];
  // Sinyal LEMAH: file cuma filter tabel lain pake academic_year_id.
  // Bisa jadi ID-nya emang dikasih dari luar (parameter/prop) — itu sah.
  // Ditaruh di "info" biar gak berisik, tapi tetep kelihatan buat di-scan manual.
  const fieldUsageDetails = [];
  // Sinyal KUAT #2: hardcode tahun ajaran dari kalender (`.getMonth()` +
  // template literal `${year}/${year+1}`) — sama sekali gak nyentuh DB
  // atau service, jadi kalau tahun aktif di-override manual di database,
  // file ini gak bakal pernah ikutan sinkron.
  const hardcodedCalendarDetails = [];
  let bulkBackupExcludedCount = 0;

  for (const file of allFiles) {
    const rel = toRel(file);
    if (ACADEMIC_YEAR_SERVICE_FILE_HINT.test(rel)) continue;
    // Checker tools di system/checkers/ SENGAJA query database mentah buat
    // validasi independen dari layer aplikasi — bukan bug, exclude.
    if (rel.includes("/system/") && rel.includes("checkers/")) continue;

    const raw = fs.readFileSync(file, "utf8");
    const content = stripComments(raw);

    // Udah import service-nya? Skip semua sinyal, aman.
    if (ACADEMIC_YEAR_SERVICE_IMPORT_HINT.test(content)) continue;

    const lines = content.split(/\r?\n/);

    // --- Sinyal kuat #1: query academic_years langsung ---
    let matchedStrongTableSignal = false;
    if (ACADEMIC_YEARS_TABLE_RE.test(content)) {
      lines.forEach((line, idx) => {
        if (ACADEMIC_YEARS_TABLE_RE.test(line)) {
          if (isLikelyBulkBackupRestore(lines, idx)) {
            bulkBackupExcludedCount++;
            return; // bagian backup/restore/dashboard multi-tabel, bukan "nentuin tahun aktif"
          }
          matchedStrongTableSignal = true;
          const extra = IS_ACTIVE_LOGIC_RE.test(content)
            ? " (kayaknya juga nentuin 'tahun aktif' sendiri — cek pola is_active)"
            : "";
          reimplementDetails.push(
            `${rel}:${idx + 1} → query tabel academic_years langsung${extra}`
          );
        }
      });
    }

    // --- Sinyal kuat #2: hardcode tahun ajaran dari kalender ---
    if (GET_MONTH_CALL_RE.test(content) && HARDCODED_YEAR_TEMPLATE_RE.test(content)) {
      lines.forEach((line, idx) => {
        if (HARDCODED_YEAR_TEMPLATE_RE.test(line)) {
          hardcodedCalendarDetails.push(
            `${rel}:${idx + 1} → hardcode tahun ajaran dari kalender (pola \`\${...year...}/\${...year...}\`), gak lewat DB/service — bisa gak sinkron kalau tahun aktif di-override manual`
          );
        }
      });
    }

    // --- Sinyal lemah: cuma filter tabel lain pake academic_year_id ---
    // Skip kalau file udah kena sinyal kuat #1 (biar gak dobel-flag hal
    // yang sama), tapi tetep jalan meski kena sinyal kuat #2, karena itu
    // isu yang beda (hardcode kalender vs filter-by-id).
    if (!matchedStrongTableSignal) {
      lines.forEach((line, idx) => {
        if (ACADEMIC_YEAR_FIELD_RE.test(line) && SUPABASE_CALL_RE.test(content)) {
          fieldUsageDetails.push(
            `${rel}:${idx + 1} → filter pakai academic_year_id (cek: ID-nya didapat dari mana — kalau dikasih via parameter/prop, ini WAJAR & gak perlu import service)`
          );
        }
      });
    }
  }

  if (reimplementDetails.length > 0) {
    pushIssue(
      issues,
      "warning",
      `${reimplementDetails.length} lokasi query tabel academic_years langsung tanpa academicYearService`,
      "File ini query tabel academic_years sendiri (biasanya buat ambil daftar tahun ajaran dan/atau nentuin mana yang aktif) tanpa lewat academicYearService. Kalau logic 'tahun ajaran aktif itu yang mana' berubah di masa depan, tempat ini gampang kelewat sinkron. Worth dipertimbangkan buat dipindah ke service.",
      reimplementDetails.slice(0, 50)
    );
  }

  if (hardcodedCalendarDetails.length > 0) {
    pushIssue(
      issues,
      "warning",
      `${hardcodedCalendarDetails.length} lokasi kemungkinan hardcode tahun ajaran dari kalender, bukan dari DB/service`,
      "File ini ngitung tahun ajaran sendiri dari tanggal hari ini (pola `.getMonth()` + template literal semacam `${currentYear}/${currentYear + 1}`), gak pernah nyentuh tabel academic_years atau academicYearService sama sekali. Ini lebih riskan daripada sekadar 'belum pake service' — kalau tahun ajaran aktif di database di-override manual (misal kalender akademik meleset dari asumsi kode), nilai di file ini gak bakal pernah ikut berubah. Cek manual apakah ini emang disengaja (misal fallback pas query gagal) atau beneran jadi sumber utama.",
      hardcodedCalendarDetails.slice(0, 50)
    );
  }

  if (fieldUsageDetails.length > 0) {
    pushIssue(
      issues,
      "info",
      `${fieldUsageDetails.length} lokasi filter pakai academic_year_id tanpa import academicYearService`,
      "Sekadar FYI, BUKAN otomatis berarti salah. File ini filter query pakai academic_year_id tapi gak import academicYearService — ini sah-sah aja kalau ID-nya emang diterima dari luar (parameter fungsi / prop komponen) dan file ini cuma 'consumer', bukan yang nentuin tahun aktif. Cek manual satu-satu.",
      fieldUsageDetails.slice(0, 50)
    );
  }

  return {
    issues,
    reimplementCount: reimplementDetails.length,
    hardcodedCalendarCount: hardcodedCalendarDetails.length,
    fieldUsageCount: fieldUsageDetails.length,
    bulkBackupExcludedCount,
  };
}

// ---------------------------------------------------------------------
// PROJECT STRUCTURE ANALYZER
// -----------------------------------------------------------------------
// Bangun peta lengkap src/: tree folder, fungsi/component tiap file,
// siapa-import-siapa (importsMap) dan siapa-diimport-oleh-siapa
// (importedByMap). Ini dipisah dari checkImportsAndOrphans supaya reusable
// buat 2 keperluan sekaligus (structure viewer + calon dependency map),
// tapi tetep pakai IMPORT_RE/resolveImport/stripComments yang sama biar
// hasilnya konsisten sama broken-import & orphan check di atas.
// -----------------------------------------------------------------------

const IMPORT_RE_STRUCT =
  /(?:import\s+(?:[\w*\s{},]+from\s+)?|export\s+(?:[\w*\s{},]+from\s+)?|require\()\s*["'`](\.[^"'`]+)["'`]\)?/g;

// Regex buat nangkep nama fungsi/component yang di-export dari sebuah
// file. Heuristik (bukan full AST parser), tapi cukup buat konvensi kode
// project ini (function declaration, arrow function assignment, class,
// default export).
const FUNCTION_PATTERNS = [
  /export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g,
  /export\s+function\s+([A-Za-z_$][\w$]*)/g,
  /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g,
  /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z_$]/g,
  /export\s+class\s+([A-Za-z_$][\w$]*)/g,
  /^function\s+([A-Za-z_$][\w$]*)/gm,
  /^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/gm,
];

function extractFunctionNames(content) {
  const names = new Set();
  for (const re of FUNCTION_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      names.add(m[1]);
    }
  }
  return Array.from(names);
}

// Klasifikasi kasar tipe file berdasarkan lokasi folder — cuma buat
// pengelompokan visual di UI, bukan sumber kebenaran teknis.
function classifyFileType(rel) {
  if (/\/pages\//i.test(rel) || rel.includes("Page")) return "page";
  if (/\/components\//i.test(rel)) return "component";
  if (/\/hooks\//i.test(rel) || /\/use[A-Z]/.test(rel)) return "hook";
  if (/\/services\//i.test(rel)) return "service";
  if (/\/system\/checkers\//i.test(rel)) return "checker";
  if (/\/system\//i.test(rel)) return "system";
  if (/\/lib\//i.test(rel) || /\/utils\//i.test(rel)) return "util";
  if (/\/config\//i.test(rel) || /Config\.[jt]sx?$/.test(rel)) return "config";
  return "other";
}

function buildProjectStructure(allFiles) {
  const nodes = {}; // rel path -> node metadata
  const importsMap = {}; // rel -> [rel]
  const importedByMap = {}; // rel -> [rel]

  // Pass 1: baca tiap file, ekstrak imports + functions
  for (const file of allFiles) {
    const rel = toRel(file);
    const raw = fs.readFileSync(file, "utf8");
    const content = stripComments(raw);
    const lines = content.split(/\r?\n/);

    const imports = [];
    IMPORT_RE_STRUCT.lastIndex = 0;
    let match;
    while ((match = IMPORT_RE_STRUCT.exec(content)) !== null) {
      const resolved = resolveImport(file, match[1]);
      if (resolved) imports.push(toRel(resolved));
    }

    nodes[rel] = {
      path: rel,
      type: classifyFileType(rel),
      lines: lines.length,
      functions: extractFunctionNames(content),
      imports,
      importedBy: [], // diisi di pass 2
    };
    importsMap[rel] = imports;
  }

  // Pass 2: balik importsMap jadi importedByMap
  for (const rel of Object.keys(importsMap)) {
    for (const target of importsMap[rel]) {
      if (!importedByMap[target]) importedByMap[target] = [];
      importedByMap[target].push(rel);
    }
  }
  for (const rel of Object.keys(nodes)) {
    nodes[rel].importedBy = importedByMap[rel] || [];
    nodes[rel].isOrphan =
      nodes[rel].importedBy.length === 0 &&
      !ENTRY_POINT_ALLOWLIST.has(rel) &&
      !ORPHAN_IGNORE_PATTERNS.some((re) => re.test(rel));
  }

  // Bangun tree folder dari flat node list, biar UI bisa render collapsible.
  const tree = { name: "src", path: "src", type: "folder", children: {} };
  for (const rel of Object.keys(nodes).sort()) {
    const parts = rel.split("/").slice(1); // buang "src" di depan
    let cursor = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        if (!cursor.children) cursor.children = {};
        cursor.children[part] = { name: part, type: "file", file: nodes[rel] };
      } else {
        if (!cursor.children) cursor.children = {};
        if (!cursor.children[part]) {
          cursor.children[part] = {
            name: part,
            path: cursor.path ? `${cursor.path}/${part}` : part,
            type: "folder",
            children: {},
          };
        }
        cursor = cursor.children[part];
      }
    }
  }

  // children dari object -> array (lebih gampang di-render di React,
  // dan urutannya folder dulu baru file, alfabetis).
  function toArrayTree(node) {
    if (node.type === "file") return node;
    const childArr = Object.values(node.children || {})
      .map(toArrayTree)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    return { name: node.name, path: node.path, type: "folder", children: childArr };
  }

  return {
    tree: toArrayTree(tree),
    totalFiles: Object.keys(nodes).length,
    totalFunctions: Object.values(nodes).reduce((sum, n) => sum + n.functions.length, 0),
    orphanCount: Object.values(nodes).filter((n) => n.isOrphan).length,
    byType: Object.values(nodes).reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {}),
    nodes, // flat map, dipakai UI buat detail panel per file tanpa jalan-jalan di tree
  };
}

// ---------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------

function main() {
  console.log("🔍 Audit kode dimulai...\n");
  const startTime = Date.now();

  if (!fs.existsSync(SRC_DIR)) {
    console.error("❌ Folder src/ gak ketemu. Jalankan script ini dari root project.");
    process.exit(1);
  }

  const allFiles = walk(SRC_DIR);
  console.log(`📁 ${allFiles.length} file .js/.jsx ditemukan di src/`);

  const importResult = checkImportsAndOrphans(allFiles);
  console.log(
    `   → import & orphan check selesai (${importResult.brokenCount} broken import, ${importResult.orphanCount} orphan file)`
  );

  const menuResult = checkMenuSidebarConsistency();
  console.log(`   → menu/sidebar consistency check selesai`);

  const darkModeResult = checkDarkModeRegression(allFiles);
  console.log(`   → dark mode heuristic selesai (${darkModeResult.flaggedCount} flagged)`);

  const joinResult = checkEmbeddedJoins(allFiles);
  console.log(
    `   → embedded join check selesai (${joinResult.nakedCount} tanpa hint, ${joinResult.hintedCount} udah ada hint)`
  );

  const tableResult = checkTableDrift(allFiles);
  console.log(`   → table name drift check selesai`);

  const academicYearResult = checkAcademicYearServiceUsage(allFiles);
  console.log(
    `   → academicYearService usage check selesai (${academicYearResult.reimplementCount} reimplement langsung, ${academicYearResult.hardcodedCalendarCount} hardcode kalender, ${academicYearResult.fieldUsageCount} sekadar filter field, ${academicYearResult.bulkBackupExcludedCount} di-exclude karena bulk backup/restore)`
  );

  const categories = [
    {
      id: "imports",
      label: "Import & Dead Files",
      issues: importResult.issues,
    },
    {
      id: "menuSidebar",
      label: "Menu / Sidebar Consistency",
      issues: menuResult.issues,
    },
    {
      id: "darkMode",
      label: "Dark Mode Regression",
      issues: darkModeResult.issues,
    },
    {
      id: "embeddedJoin",
      label: "Supabase Embedded Join",
      issues: joinResult.issues,
    },
    { id: "tableDrift", label: "Table Name Drift", issues: tableResult.issues },
    {
      id: "academicYearService",
      label: "Academic Year Service Usage",
      issues: academicYearResult.issues,
    },
  ];

  let critical = 0,
    warning = 0,
    info = 0;
  categories.forEach((cat) =>
    cat.issues.forEach((issue) => {
      if (issue.severity === "critical") critical++;
      else if (issue.severity === "warning") warning++;
      else info++;
    })
  );

  const overallStatus = critical > 0 ? "critical" : warning > 0 ? "warning" : "healthy";

  const report = {
    generatedAt: new Date().toISOString(),
    executionTimeMs: Date.now() - startTime,
    filesScanned: allFiles.length,
    summary: {
      status: overallStatus,
      criticalCount: critical,
      warningCount: warning,
      infoCount: info,
      totalIssues: critical + warning + info,
    },
    categories,
  };

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), "utf8");

  console.log(`\n✅ Selesai dalam ${report.executionTimeMs}ms`);
  console.log(
    `   Status: ${overallStatus.toUpperCase()} | Critical: ${critical} | Warning: ${warning} | Info: ${info}`
  );
  console.log(`   Laporan disimpan ke: ${toRel(OUTPUT_FILE)}`);
  console.log(`   Buka app -> Monitor Sistem -> tab "Code Audit" buat liat hasilnya.\n`);

  // --- Project Structure Analyzer (file terpisah, ditampilin di tab
  // "Struktur Project") ---
  console.log("🗂️  Membangun peta struktur project...");
  const structureStart = Date.now();
  const structure = buildProjectStructure(allFiles);
  const allFilesUnfiltered = walkAllFiles(SRC_DIR);
  const asciiTree = buildAsciiTree(allFilesUnfiltered, SRC_DIR);
  const structureReport = {
    generatedAt: new Date().toISOString(),
    executionTimeMs: Date.now() - structureStart,
    ...structure,
    asciiTree,
    totalAllFiles: allFilesUnfiltered.length, // termasuk asset non-kode (gambar, html, dll)
  };
  fs.writeFileSync(STRUCTURE_OUTPUT_FILE, JSON.stringify(structureReport, null, 2), "utf8");
  console.log(
    `   → ${structure.totalFiles} file kode, ${allFilesUnfiltered.length} total file (termasuk asset), ${structure.totalFunctions} fungsi/component, ${structure.orphanCount} kemungkinan orphan`
  );
  console.log(`   Laporan struktur disimpan ke: ${toRel(STRUCTURE_OUTPUT_FILE)}`);
  console.log(`   Buka app -> Monitor Sistem -> tab "Struktur Project" buat liat hasilnya.\n`);
}

main();
