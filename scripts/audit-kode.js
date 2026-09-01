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
  let out = content.replace(/\/\*[\s\S]*?\*\//g, (block) =>
    block.replace(/[^\n]/g, " "),
  );
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
        brokenDetails.push(
          `${toRel(file)}:${lineNo} → import "${importPath}" (target gak ketemu)`,
        );
      }
    }
  }

  if (brokenCount > 0) {
    pushIssue(
      issues,
      "critical",
      `${brokenCount} broken import ditemukan`,
      "Import nunjuk ke file yang gak ada di disk. Ini bakal bikin build gagal atau blank screen kalau route-nya diakses.",
      brokenDetails.slice(0, 50),
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
      orphans.slice(0, 80),
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
      [],
    );
    return { issues };
  }

  const menuContent = fs.readFileSync(menuConfigPath, "utf8");
  const sidebarContent = fs.readFileSync(sidebarConfigPath, "utf8");

  const menuKeys = new Set(
    [...menuContent.matchAll(/path:\s*["'`]\/([a-zA-Z0-9_-]*)["'`]/g)].map(
      (m) => m[1],
    ),
  );

  const sidebarPages = [
    ...sidebarContent.matchAll(/page:\s*["'`]([a-zA-Z0-9_-]+)["'`]/g),
  ].map((m) => m[1]);

  const brokenLinks = [...new Set(sidebarPages)].filter(
    (page) => !menuKeys.has(page),
  );

  if (brokenLinks.length > 0) {
    pushIssue(
      issues,
      "critical",
      `${brokenLinks.length} item sidebar nunjuk ke page yang gak ada di menuConfig`,
      "Item sidebar ini bakal ke-klik tapi gak nyambung ke route mana pun (atau nyasar ke halaman lain / 404). Cek sidebarConfig.js dan pastiin 'page' cocok sama 'path' (tanpa leading slash) di menuConfig.js.",
      brokenLinks,
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
      .map(
        ([file, count]) => `${file} — ${count} class belum ada dark: variant`,
      );

    pushIssue(
      issues,
      "info",
      `${totalFlagged} class warna (di ${perFileCount.size} file) kemungkinan belum dark-mode-aware`,
      "Ini backlog, bukan berarti semua salah — bisa aja file itu emang belum kena giliran migrasi theme-*, atau sengaja gak butuh dark mode (misal komponen buat print/PDF). Diurutin dari file paling banyak class polos-nya, biar keliatan mana yang paling worth dibenerin duluan. Heuristik regex, review manual tetep perlu.",
      details,
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
      nakedDetails.slice(0, 50),
    );
  }

  if (hintedDetails.length > 0) {
    pushIssue(
      issues,
      "info",
      `${hintedDetails.length} embedded join yang UDAH pake disambiguation hint`,
      "FYI aja — ternyata di banyak file (CetakRaport, ReportHelpers, AdminReports, dll) project ini sebenernya pake embedded join Supabase, bukan resolve manual semua di JS. Yang ini kelihatannya udah aman karena udah ada hint (`!inner`, `!nama_fk`, atau `alias:table`) yang secara eksplisit nunjuk relasi mana yang dimaksud — itu emang cara resmi Supabase buat ngehindarin PGRST200. Kalau ternyata ini emang pattern yang lo pake sengaja, gue bakal update catatan gue soal ini.",
      hintedDetails.slice(0, 50),
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
      [],
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
      unknownDetails.slice(0, 50),
    );
  }

  const neverUsed = [...validTables].filter((t) => !usedTables.has(t)).sort();
  if (neverUsed.length > 0) {
    pushIssue(
      issues,
      "info",
      `${neverUsed.length} tabel di schema gak pernah dipanggil lewat .from() di kode`,
      "Belum tentu masalah — bisa aja view, tabel yang diakses cuma dari Supabase function/edge function, atau memang belum dipakai. Sekedar info.",
      neverUsed.slice(0, 50),
    );
  }

  return { issues };
}

// ---------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------

function main() {
  console.log("🔍 Audit kode dimulai...\n");
  const startTime = Date.now();

  if (!fs.existsSync(SRC_DIR)) {
    console.error(
      "❌ Folder src/ gak ketemu. Jalankan script ini dari root project.",
    );
    process.exit(1);
  }

  const allFiles = walk(SRC_DIR);
  console.log(`📁 ${allFiles.length} file .js/.jsx ditemukan di src/`);

  const importResult = checkImportsAndOrphans(allFiles);
  console.log(
    `   → import & orphan check selesai (${importResult.brokenCount} broken import, ${importResult.orphanCount} orphan file)`,
  );

  const menuResult = checkMenuSidebarConsistency();
  console.log(`   → menu/sidebar consistency check selesai`);

  const darkModeResult = checkDarkModeRegression(allFiles);
  console.log(
    `   → dark mode heuristic selesai (${darkModeResult.flaggedCount} flagged)`,
  );

  const joinResult = checkEmbeddedJoins(allFiles);
  console.log(
    `   → embedded join check selesai (${joinResult.nakedCount} tanpa hint, ${joinResult.hintedCount} udah ada hint)`,
  );

  const tableResult = checkTableDrift(allFiles);
  console.log(`   → table name drift check selesai`);

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
  ];

  let critical = 0,
    warning = 0,
    info = 0;
  categories.forEach((cat) =>
    cat.issues.forEach((issue) => {
      if (issue.severity === "critical") critical++;
      else if (issue.severity === "warning") warning++;
      else info++;
    }),
  );

  const overallStatus =
    critical > 0 ? "critical" : warning > 0 ? "warning" : "healthy";

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
    `   Status: ${overallStatus.toUpperCase()} | Critical: ${critical} | Warning: ${warning} | Info: ${info}`,
  );
  console.log(`   Laporan disimpan ke: ${toRel(OUTPUT_FILE)}`);
  console.log(
    `   Buka app -> Monitor Sistem -> tab "Code Audit" buat liat hasilnya.\n`,
  );
}

main();
