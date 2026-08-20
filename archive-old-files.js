const fs = require("fs");
const path = require("path");

const srcDir = "src";
const backupDir = "D:\\Aplikasi Produksi\\Backup Administrasi SMP Muslimin";

// File yang JANGAN dipindah walau namanya mirip pola lama (kemungkinan fitur beneran)
const exceptions = ["Attendance-Offline.js"];

function scan(dir, list) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) scan(p, list);
    else if (/\.(js|jsx)$/.test(f)) list.push(p);
  }
}

const allFiles = [];
scan(srcDir, allFiles);

function isSuspect(filePath) {
  const base = path.basename(filePath);
  if (exceptions.includes(base)) return false;
  const inVersiFolder = /[\\/]Versi-\d[\\/]/i.test(filePath);
  const namePattern =
    /-(Asli|Ver\d|Revisi|Fix\d|versi\d|Backup|Lengkap|Pake)|=Asli|0\.js$|Untitled/i.test(
      base,
    );
  return inVersiFolder || namePattern;
}

const suspects = allFiles.filter(isSuspect);

let moved = 0;
for (const filePath of suspects) {
  const relative = path.relative(srcDir, filePath);
  const destPath = path.join(backupDir, relative);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.renameSync(filePath, destPath);
  console.log("MOVED: " + filePath + "  ->  " + destPath);
  moved++;
}

console.log("\nTotal file dipindahkan: " + moved);