// Kopiuje worker pdf.js do public/, żeby dało się go serwować pod stałym, prostym
// URL-em ("/pdf.worker.min.mjs") niezależnie od bundlera (webpack / turbopack).
// Wersja pliku musi się zgadzać z zainstalowaną wersją `pdfjs-dist` — stąd kopiowanie
// przy każdym `npm install` (postinstall), a nie ręczne trzymanie kopii w repo.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const src = join(projectRoot, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(projectRoot, "public");
const dest = join(destDir, "pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.warn(`[copy-pdf-worker] Nie znaleziono ${src} — pomijam kopiowanie.`);
  process.exit(0);
}

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

copyFileSync(src, dest);
console.log(`[copy-pdf-worker] Skopiowano pdf.worker.min.mjs -> ${dest}`);
