/**
 * Import historii (zadania + komentarze) z eksportu ActiveCollab do Rentgena.
 *
 * Dopasowuje projekty z eksportu AC (folder projects/*.zip) do istniejących
 * projektów w Rentgenie po nazwie, a następnie wciąga tasks.json/subtasks.json/
 * comments.json do project_ac_link + project_ac_history_items.
 *
 * Wymaga w .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Wymaga rozpakowanych archiwów projektów w AC_WORK_DIR (patrz extractMatched()).
 *
 * Użycie:
 *   npx tsx --env-file=.env.local scripts/import-activecollab.ts match
 *   npx tsx --env-file=.env.local scripts/import-activecollab.ts extract
 *   npx tsx --env-file=.env.local scripts/import-activecollab.ts import -- --dry-run
 *   npx tsx --env-file=.env.local scripts/import-activecollab.ts import -- --yes
 */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const AC_EXPORT_DIR =
  process.env.AC_EXPORT_DIR ??
  "C:\\sieciowy\\AC rentgen jason export gull109507_220069_1785241411\\export";
const AC_WORK_DIR =
  process.env.AC_WORK_DIR ??
  "C:\\Users\\biuro\\AppData\\Local\\Temp\\claude\\C--Users-biuro-Desktop-Rentgen-firmy\\24fd5614-d030-4afd-898f-6f7b71474b7d\\scratchpad\\ac_extracted";
const MATCH_REPORT_PATH = path.join(AC_WORK_DIR, "..", "ac_match_report.json");
const MIN_SCORE = Number(process.env.AC_MIN_SCORE ?? "0.7");

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w env.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function normalize(s: string): string {
  return s
    .replace(/[\u0142\u0141]/g, "l")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOP = new Set(["id", "dom", "bms", "priv", "w", "i", "ramach", "wspolpracy", "sp", "zoo", "z", "o", "sa", "el"]);

function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function stem(t: string, n = 5): string {
  return t.length > n ? t.slice(0, n) : t;
}

function seqRatio(a: string, b: string): number {
  // Bardzo prosty ratio oparty na najdłuższym wspólnym podciągu (wystarczający jako sygnał pomocniczy)
  const m = a.length,
    n = b.length;
  if (m === 0 || n === 0) return 0;
  const dp = new Array(n + 1).fill(0);
  let max = 0;
  for (let i = 1; i <= m; i++) {
    let prev = 0;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : 0;
      if (dp[j] > max) max = dp[j];
      prev = tmp;
    }
  }
  return (2 * max) / (m + n);
}

type AcProjectEntry = {
  zip: string;
  name: string;
  company: string;
  tasks: number;
  comments: number;
  updatedOn: number;
};

function loadAcProjectIndex(): AcProjectEntry[] {
  const projDir = path.join(AC_EXPORT_DIR, "projects");
  const companies: { id: number; name: string }[] = JSON.parse(
    fs.readFileSync(path.join(AC_EXPORT_DIR, "companies.json"), "utf-8"),
  );
  const companyById = new Map(companies.map((c) => [c.id, c.name]));
  const zips = fs.readdirSync(projDir).filter((f) => f.endsWith(".zip"));

  const entries: AcProjectEntry[] = [];
  for (const zip of zips) {
    const zipPath = path.join(projDir, zip);
    // Wyciągamy tylko project.json do stdout przez unzip -p (bez rozpakowywania całości)
    let raw: string;
    try {
      raw = execFileSync("unzip", ["-p", zipPath, "*/project.json"], { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
    } catch (err) {
      console.error(`  [!] nie udało się odczytać project.json z ${zip}: ${(err as Error).message}`);
      continue;
    }
    const d = JSON.parse(raw);
    entries.push({
      zip,
      name: d.name ?? "",
      company: companyById.get(d.company_id) ?? "",
      tasks: (d.task_ids ?? []).length,
      comments: (d.comment_ids ?? []).length,
      updatedOn: d.updated_on ?? 0,
    });
  }
  return entries;
}

type RentgenProject = { id: string; name: string; type: string };

type MatchResult = {
  projectId: string;
  projectName: string;
  type: string;
  zip: string | null;
  acName: string | null;
  score: number;
  tasks: number | null;
  comments: number | null;
  runnerUp: { zip: string; acName: string; score: number } | null;
  conflict?: boolean;
};

async function computeMatches(): Promise<MatchResult[]> {
  const sb = admin();
  const { data: projects, error } = await sb.from("projects").select("id, name, type");
  if (error) throw error;
  const rentgen = projects as RentgenProject[];

  const ac = loadAcProjectIndex();
  const acWithTokens = ac.map((a) => ({
    ...a,
    toks: tokens(a.name),
    stems: new Set(tokens(a.name).map((t) => stem(t))),
    norm: normalize(a.name),
  }));

  // Dopasowanie zbliżonych długością tokenów (chroni przed kolizją krótszego
  // tokenu będącego przypadkowym prefiksem dłuższego, np. "marcin" / "marcinkowski").
  function stemsCompatible(t1: string, t2: string): boolean {
    if (t1 === t2) return true;
    const shorter = Math.min(t1.length, t2.length);
    const longer = Math.max(t1.length, t2.length);
    if (shorter < 6) return false; // zbyt krótkie, żeby ufać samemu prefiksowi
    return shorter / longer >= 0.8 && stem(t1, 6) === stem(t2, 6);
  }

  const results: MatchResult[] = [];
  for (const p of rentgen) {
    const ptoks = tokens(p.name);
    const pnorm = normalize(p.name);

    const scored = acWithTokens
      .map((a) => {
        // 1) dokładne dopasowanie tokenów (najbardziej wiarygodne)
        let exact = 0;
        for (const t of ptoks) if (a.toks.includes(t)) exact++;
        const exactScore = ptoks.length ? exact / ptoks.length : 0;

        // 2) miękkie dopasowanie (odmiany/literówki) — tylko jako sygnał pomocniczy,
        //    ograniczone tak by nie osiągnąć progu "pewnego" dopasowania samodzielnie
        let soft = 0;
        for (const t of ptoks) if (a.toks.some((at) => stemsCompatible(t, at))) soft++;
        const softScore = ptoks.length ? (soft / ptoks.length) * 0.65 : 0;

        const score = Math.max(exactScore, softScore);
        return { a, score, exactScore };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score);

    const best = scored[0];
    const runnerUp = scored[1];
    results.push({
      projectId: p.id,
      projectName: p.name,
      type: p.type,
      zip: best?.a.zip ?? null,
      acName: best?.a.name ?? null,
      score: best ? Math.round(best.score * 100) / 100 : 0,
      tasks: best?.a.tasks ?? null,
      comments: best?.a.comments ?? null,
      runnerUp: runnerUp ? { zip: runnerUp.a.zip, acName: runnerUp.a.name, score: Math.round(runnerUp.score * 100) / 100 } : null,
    });
  }

  // Ręczne korekty — przypadki sprawdzone osobiście, gdzie automat trafia
  // na fałszywą kolizję tokenów (np. wspólne imię) albo na zbyt niski wynik
  // przez różnicę w formatowaniu nazwy (myślnik, szyk wyrazów).
  const MANUAL_OVERRIDES: Record<string, string> = {
    "Grzesiński": "grzesinscy-nadolice-1395.zip",
    "Kasprzyk Adam": "kasprzyk-wierzchowisko-300.zip",
    "Ostapkowicz Dariusz": "ostapkowicz-id-219.zip",
    "Metal-worx Zjeżdżalnie": "zjezdzalnie-metalworx-1181.zip",
  };
  for (const r of results) {
    const overrideZip = MANUAL_OVERRIDES[r.projectName];
    if (!overrideZip) continue;
    const acEntry = acWithTokens.find((a) => a.zip === overrideZip);
    if (!acEntry) continue;
    r.zip = acEntry.zip;
    r.acName = acEntry.name;
    r.score = 1;
    r.tasks = acEntry.tasks;
    r.comments = acEntry.comments;
    r.runnerUp = null;
  }

  // Wykrywanie konfliktów: dwa różne projekty Rentgena "pewnie" wskazujące na to samo archiwum AC.
  const claimCount = new Map<string, number>();
  for (const r of results) {
    if (r.zip && r.score >= MIN_SCORE) claimCount.set(r.zip, (claimCount.get(r.zip) ?? 0) + 1);
  }
  for (const r of results) {
    if (r.zip && r.score >= MIN_SCORE && (claimCount.get(r.zip) ?? 0) > 1) {
      (r as any).conflict = true;
    }
  }

  return results;
}

async function cmdMatch() {
  const results = await computeMatches();
  const strong = results.filter((r) => r.score >= MIN_SCORE && !r.conflict);
  const conflicts = results.filter((r) => r.score >= MIN_SCORE && r.conflict);
  const weak = results.filter((r) => r.score > 0 && r.score < MIN_SCORE);
  const none = results.filter((r) => r.score === 0);

  console.log(`Rentgen: ${results.length} projektów`);
  console.log(`  Pewne dopasowania (>= ${MIN_SCORE}, bez konfliktu): ${strong.length}`);
  console.log(`  Konflikt — kilka projektów wskazuje ten sam AC-zip: ${conflicts.length}`);
  console.log(`  Do ręcznej weryfikacji (niski wynik): ${weak.length}`);
  console.log(`  Brak żadnego dopasowania: ${none.length}`);

  console.log("\n=== KONFLIKTY (ten sam zip, kilka projektów) ===");
  for (const r of conflicts) {
    console.log(`  ${r.projectName} -> ${r.acName} [${r.zip}] score=${r.score} (zadań=${r.tasks}, kom.=${r.comments})`);
  }

  console.log("\n=== DO RĘCZNEJ WERYFIKACJI (niski wynik) ===");
  for (const r of weak) {
    console.log(`  ${r.projectName} -> ${r.acName} [${r.zip}] score=${r.score} (zadań=${r.tasks}, kom.=${r.comments})`);
    if (r.runnerUp) console.log(`      runner-up: ${r.runnerUp.acName} [${r.runnerUp.zip}] score=${r.runnerUp.score}`);
  }
  console.log("\n=== BRAK DOPASOWANIA ===");
  for (const r of none) console.log(`  ${r.projectName}`);

  fs.mkdirSync(path.dirname(MATCH_REPORT_PATH), { recursive: true });
  fs.writeFileSync(MATCH_REPORT_PATH, JSON.stringify(results, null, 1), "utf-8");
  console.log(`\nZapisano pełny raport: ${MATCH_REPORT_PATH}`);
}

function loadMatchReport(): MatchResult[] {
  if (!fs.existsSync(MATCH_REPORT_PATH)) {
    throw new Error(`Brak raportu dopasowań — uruchom najpierw: match. (${MATCH_REPORT_PATH})`);
  }
  return JSON.parse(fs.readFileSync(MATCH_REPORT_PATH, "utf-8"));
}

async function cmdExtract() {
  const results = loadMatchReport().filter((r) => r.score >= MIN_SCORE && r.zip && !r.conflict);
  fs.mkdirSync(AC_WORK_DIR, { recursive: true });
  let ok = 0;
  for (const r of results) {
    const zipPath = path.join(AC_EXPORT_DIR, "projects", r.zip!);
    const dest = path.join(AC_WORK_DIR, r.zip!.replace(/\.zip$/, ""));
    if (fs.existsSync(dest)) {
      ok++;
      continue;
    }
    fs.mkdirSync(dest, { recursive: true });
    execFileSync("unzip", ["-q", "-o", zipPath, "-d", dest]);
    ok++;
  }
  console.log(`Rozpakowano ${ok}/${results.length} archiwów do ${AC_WORK_DIR}`);
}

function findExtractedProjectDir(zip: string): string | null {
  const base = path.join(AC_WORK_DIR, zip.replace(/\.zip$/, ""));
  if (!fs.existsSync(base)) return null;
  const sub = fs.readdirSync(base).find((f) => fs.statSync(path.join(base, f)).isDirectory());
  return sub ? path.join(base, sub) : null;
}

function readJson<T>(dir: string, file: string): T {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return [] as unknown as T;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function toIso(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

type ImportOneParams = {
  sb: ReturnType<typeof admin>;
  projectId: string;
  projectName: string;
  zip: string;
  acName: string;
  score: number;
  dryRun: boolean;
};

async function importOneZip(p: ImportOneParams): Promise<{ tasks: number; subtasks: number; comments: number } | null> {
  const dir = findExtractedProjectDir(p.zip);
  if (!dir) {
    console.log(`[POMINIĘTO] ${p.projectName} — brak rozpakowanego folderu dla ${p.zip} (uruchom "extract")`);
    return null;
  }

  const tasks = readJson<any[]>(dir, "tasks.json");
  const subtasks = readJson<any[]>(dir, "subtasks.json");
  const comments = readJson<any[]>(dir, "comments.json");
  const attachments = readJson<any[]>(dir, "attachments.json");

  const attByParent = new Map<string, string[]>();
  for (const at of attachments) {
    const key = `${at.parent_type}:${at.parent_id}`;
    const arr = attByParent.get(key) ?? [];
    arr.push(at.name);
    attByParent.set(key, arr);
  }

  type Row = {
    project_id: string;
    kind: "task" | "subtask" | "comment";
    ac_id: number;
    ac_task_id: number | null;
    title: string;
    body: string;
    author_name: string;
    is_completed: boolean;
    attachment_names: string[];
    ac_created_on: string | null;
    ac_completed_on: string | null;
  };

  const rows: Row[] = [];

  for (const t of tasks) {
    rows.push({
      project_id: p.projectId,
      kind: "task",
      ac_id: t.id,
      ac_task_id: null,
      title: t.name ?? "",
      body: t.body ?? "",
      author_name: t.created_by_name || t.created_by_email || "",
      is_completed: Boolean(t.is_completed),
      attachment_names: attByParent.get(`Task:${t.id}`) ?? [],
      ac_created_on: toIso(t.created_on),
      ac_completed_on: toIso(t.completed_on),
    });
  }

  for (const s of subtasks) {
    rows.push({
      project_id: p.projectId,
      kind: "subtask",
      ac_id: s.id,
      ac_task_id: s.task_id ?? null,
      title: s.body ?? "",
      body: "",
      author_name: s.created_by_name || s.created_by_email || "",
      is_completed: Boolean(s.is_completed),
      attachment_names: [],
      ac_created_on: toIso(s.created_on),
      ac_completed_on: toIso(s.completed_on),
    });
  }

  for (const c of comments) {
    if (c.parent_type !== "Task") continue;
    rows.push({
      project_id: p.projectId,
      kind: "comment",
      ac_id: c.id,
      ac_task_id: c.parent_id ?? null,
      title: "",
      body: c.body ?? "",
      author_name: c.created_by_name || c.created_by_email || "",
      is_completed: false,
      attachment_names: attByParent.get(`Comment:${c.id}`) ?? [],
      ac_created_on: toIso(c.created_on),
      ac_completed_on: null,
    });
  }

  const commentCount = rows.filter((row) => row.kind === "comment").length;
  console.log(
    `${p.dryRun ? "[PODGLĄD]" : "[IMPORT]"} ${p.projectName} <- ${p.zip}  zadania=${tasks.length} podzadania=${subtasks.length} komentarze(do zadań)=${commentCount}`,
  );

  if (p.dryRun) {
    return { tasks: tasks.length, subtasks: subtasks.length, comments: commentCount };
  }

  const { error: linkError } = await p.sb
    .from("project_ac_link")
    .upsert(
      {
        project_id: p.projectId,
        ac_project_id: Number(p.zip.match(/-(\d+)\.zip$/)?.[1] ?? 0),
        ac_zip: p.zip,
        ac_project_name: p.acName ?? "",
        match_score: p.score,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "project_id,ac_project_id" },
    );
  if (linkError) {
    console.error(`  [BŁĄD link] ${p.projectName}: ${linkError.message}`);
    return null;
  }

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await p.sb
      .from("project_ac_history_items")
      .upsert(batch, { onConflict: "project_id,kind,ac_id", ignoreDuplicates: true });
    if (error) {
      console.error(`  [BŁĄD historii] ${p.projectName} batch ${i}: ${error.message}`);
    }
  }

  return { tasks: tasks.length, subtasks: subtasks.length, comments: commentCount };
}

// Cztery przypadki potwierdzone ręcznie przez użytkownika (konflikty / wieloznaczności
// z pierwszego przebiegu), do uruchomienia poleceniem "import-extra".
const CONFIRMED_EXTRAS: { projectName: string; zips: string[] }[] = [
  { projectName: "Respondek Kingi", zips: ["respondek-dominik-sw-kingi-440.zip"] },
  { projectName: "Hernacka", zips: ["hernacki-karol-i-karolina-mirowska-1620.zip"] },
  { projectName: "Pałasz Larpspace", zips: ["klockiedupl-tomasz-palasz-73.zip", "palasz-tomasz-gameroom-1431.zip"] },
  { projectName: "Decathlon Magazyny", zips: ["decathlon-gliwice-magazyn-1339.zip", "decathlon-magazyn-lodz--1353.zip"] },
];

async function cmdImportExtra() {
  const dryRun = process.argv.includes("--dry-run");
  const assumeYes = process.argv.includes("--yes");
  if (!dryRun && !assumeYes) {
    console.error("Podaj --dry-run (podgląd) albo --yes (wykonaj zapis).");
    process.exit(1);
  }

  const sb = admin();
  const { data: projects, error } = await sb.from("projects").select("id, name");
  if (error) throw error;
  const byName = new Map((projects as { id: string; name: string }[]).map((p) => [p.name, p.id]));

  const ac = loadAcProjectIndex();
  const acByZip = new Map(ac.map((a) => [a.zip, a]));

  // Rozpakuj brakujące archiwa
  fs.mkdirSync(AC_WORK_DIR, { recursive: true });
  for (const extra of CONFIRMED_EXTRAS) {
    for (const zip of extra.zips) {
      const dest = path.join(AC_WORK_DIR, zip.replace(/\.zip$/, ""));
      if (fs.existsSync(dest)) continue;
      fs.mkdirSync(dest, { recursive: true });
      execFileSync("unzip", ["-q", "-o", path.join(AC_EXPORT_DIR, "projects", zip), "-d", dest]);
    }
  }

  for (const extra of CONFIRMED_EXTRAS) {
    const projectId = byName.get(extra.projectName);
    if (!projectId) {
      console.log(`[BŁĄD] nie znaleziono projektu "${extra.projectName}" w Rentgenie`);
      continue;
    }
    for (const zip of extra.zips) {
      const acEntry = acByZip.get(zip);
      await importOneZip({
        sb,
        projectId,
        projectName: extra.projectName,
        zip,
        acName: acEntry?.name ?? "",
        score: 1,
        dryRun,
      });
    }
  }
}

async function cmdImport() {
  const dryRun = process.argv.includes("--dry-run");
  const assumeYes = process.argv.includes("--yes");
  if (!dryRun && !assumeYes) {
    console.error("Podaj --dry-run (podgląd) albo --yes (wykonaj zapis).");
    process.exit(1);
  }

  const sb = admin();
  const results = loadMatchReport().filter((r) => r.score >= MIN_SCORE && r.zip && !r.conflict);

  let totalTasks = 0;
  let totalSubtasks = 0;
  let totalComments = 0;
  let projectsDone = 0;
  let projectsSkipped = 0;

  for (const r of results) {
    const outcome = await importOneZip({
      sb,
      projectId: r.projectId,
      projectName: r.projectName,
      zip: r.zip!,
      acName: r.acName ?? "",
      score: r.score,
      dryRun,
    });
    if (!outcome) {
      projectsSkipped++;
      continue;
    }
    totalTasks += outcome.tasks;
    totalSubtasks += outcome.subtasks;
    totalComments += outcome.comments;
    projectsDone++;
  }

  console.log("");
  console.log(
    `Podsumowanie: ${projectsDone} projektów przetworzonych, ${projectsSkipped} pominiętych (brak rozpakowania). Łącznie: ${totalTasks} zadań, ${totalSubtasks} podzadań, ${totalComments} komentarzy.`,
  );
}

// 55 archiwów AC ocenione jako projekty klienckie bez żywego odpowiednika w Rentgenie
// (potwierdzone przez użytkownika po przeglądzie ac_remaining_review.html).
// client_id celowo zostaje puste — użytkownik przypisze klientów ręcznie.
const NEW_CLIENT_PROJECTS: { zip: string; name: string; type: "DOM" | "BMS" | "Przemysłowe" }[] = [
  { zip: "chodowieckiego-3.zip", name: "Chodowieckiego", type: "DOM" },
  { zip: "kozera-jakub-idelektryka-177.zip", name: "Kozera Jakub", type: "DOM" },
  { zip: "monka-robert-278.zip", name: "Mońka Robert", type: "DOM" },
  { zip: "klosek-prefabrykowany-dom-pilotaz-558.zip", name: "Kłosek - Prefabrykowany Dom (pilotaż)", type: "DOM" },
  { zip: "szpitale-poznan-termowizja-229.zip", name: "Szpitale Poznań - termowizja", type: "BMS" },
  { zip: "caritas-ces-1132.zip", name: "Caritas CES", type: "BMS" },
  { zip: "golina-zaklad-pd-1774.zip", name: "Golina - zakład PD", type: "Przemysłowe" },
  { zip: "grabowski-dariusz-zarki-537.zip", name: "Grabowski Dariusz - Żarki", type: "DOM" },
  { zip: "kluk-olga-i-wojciech-jaskrow-530.zip", name: "Kluk Olga i Wojciech - Jaskrów", type: "DOM" },
  { zip: "raglewski-dariusz-krakow-1599.zip", name: "Raglewski Dariusz - Kraków", type: "DOM" },
  { zip: "mzyk-daniel-parkowa-warszawa-1118.zip", name: "Mzyk Daniel - Parkowa Warszawa", type: "DOM" },
  { zip: "muter-tomasz-wroclaw-idel-205.zip", name: "Muter Tomasz - Wrocław", type: "DOM" },
  { zip: "pawlikowski-piotr-852.zip", name: "Pawlikowski Piotr", type: "DOM" },
  { zip: "equipo-pruszkow-1020.zip", name: "Equipo Pruszków", type: "Przemysłowe" },
  { zip: "chamczynski-wroclaw-94.zip", name: "Chamczyński - Wrocław", type: "DOM" },
  { zip: "korner-design-285.zip", name: "KORNER Design", type: "BMS" },
  { zip: "anta-projekty-elektryczne-586.zip", name: "ANTA Projekty elektryczne", type: "BMS" },
  { zip: "bartelak-filip-kamyk-conssoni-101.zip", name: "Bartelak Filip - Kamyk Conssoni", type: "DOM" },
  { zip: "prz-equipo-siemianowice-slaskie-859.zip", name: "PRZ Equipo Siemianowice Śląskie", type: "Przemysłowe" },
  { zip: "cieslik-daniel-priv-w-ramach-wspolpracy-699.zip", name: "Cieślik Daniel", type: "DOM" },
  { zip: "equipo-projekt-unijny--1367.zip", name: "Equipo - Projekt unijny", type: "Przemysłowe" },
  { zip: "papalski-konrad-easysystem-alarm-i-monitoring-992.zip", name: "Papalski Konrad - Alarm i Monitoring", type: "DOM" },
  { zip: "oddymianie-poleska-blok-c-390.zip", name: "Oddymianie Poleska Blok C", type: "BMS" },
  { zip: "3s-data-center-1276.zip", name: "3S Data Center", type: "BMS" },
  { zip: "caritas-kuchnia-instalacja-elektryczna-482.zip", name: "Caritas - Kuchnia", type: "BMS" },
  { zip: "zagdanski-lincoln-122.zip", name: "Zagdański - Lincoln", type: "DOM" },
  { zip: "zak-ania-i-marcin-instalacja-elektryczna--236.zip", name: "Żak Ania i Marcin", type: "DOM" },
  { zip: "equipo-siemianowice-rozbudowa-957.zip", name: "Equipo Siemianowice - rozbudowa", type: "Przemysłowe" },
  { zip: "equipo-sluzew-modernizacja-szafek-i-oprogramowania-978.zip", name: "Equipo Służew - modernizacja", type: "Przemysłowe" },
  { zip: "debowska-katarzyna-easysystem-1223.zip", name: "Dębowska Katarzyna", type: "DOM" },
  { zip: "ogrodowa-3-pietro-136.zip", name: "Ogrodowa - 3 piętro", type: "BMS" },
  { zip: "totalizator-knurow-kazimierze-143.zip", name: "Totalizator Knurów Kazimierze", type: "BMS" },
  { zip: "wojdecki-adam-projekt-id-411.zip", name: "Wojdecki Adam", type: "DOM" },
  { zip: "janeczek-emilia-i-artur-678.zip", name: "Janeczek Emilia i Artur", type: "DOM" },
  { zip: "totalizator-rybnik-patriotow-129.zip", name: "Totalizator - Rybnik Patriotów", type: "BMS" },
  { zip: "totalizator-sportowy-blachownia-24.zip", name: "Totalizator Sportowy - Blachownia", type: "BMS" },
  { zip: "karkoszka-adam-1473.zip", name: "Karkoszka Adam", type: "DOM" },
  { zip: "ludowa-anta-636.zip", name: "Ludowa ANTA", type: "BMS" },
  { zip: "azoty-chorzow-726.zip", name: "Azoty Chorzów", type: "Przemysłowe" },
  { zip: "h2o-pensjonat-brandys-838.zip", name: "H2O Pensjonat Brandys", type: "BMS" },
  { zip: "rawlik-michal-685.zip", name: "Rawlik Michał", type: "DOM" },
  { zip: "stefanczyk-agnieszka-kopalino-1076.zip", name: "Stefańczyk Agnieszka - Kopalino", type: "DOM" },
  { zip: "jaworski-jakub-950.zip", name: "Jaworski Jakub", type: "DOM" },
  { zip: "piasecki-wojciech-mieszkanie-wroclaw-1237.zip", name: "Piasecki Wojciech - mieszkanie Wrocław", type: "DOM" },
  { zip: "borecki-michal-warszawa-320.zip", name: "Borecki Michał - Warszawa", type: "DOM" },
  { zip: "foxdesign-pilsudskiego-wroclaw-1416.zip", name: "FOXDESIGN Piłsudskiego Wrocław", type: "BMS" },
  { zip: "wellclinic-gabinety-lekarskie-cctv-kd-wifi-1676.zip", name: "WELLCLINIC - Gabinety Lekarskie", type: "BMS" },
  { zip: "eko-dom-rybnik--1732.zip", name: "Eko-dom Rybnik", type: "DOM" },
  { zip: "ford-city-car-gliwice-1409.zip", name: "Ford City Car Gliwice", type: "BMS" },
  { zip: "abt-minsk--831.zip", name: "ABT Minsk", type: "BMS" },
  { zip: "fc-auto-produkcja-1438.zip", name: "FC-Auto Produkcja", type: "BMS" },
  { zip: "kuterek-radek-mini-id-901.zip", name: "Kuterek Radek", type: "DOM" },
  { zip: "swiergiel-jaroslaw--1244.zip", name: "Świergiel Jarosław", type: "DOM" },
  { zip: "inwald-palace-1402.zip", name: "Inwald Palace", type: "BMS" },
  { zip: "raciborz-uprawa-konopii-leczniczej-1160.zip", name: "Racibórz - uprawa konopii leczniczej", type: "Przemysłowe" },
];

async function cmdCreateClientProjects() {
  const dryRun = process.argv.includes("--dry-run");
  const assumeYes = process.argv.includes("--yes");
  if (!dryRun && !assumeYes) {
    console.error("Podaj --dry-run (podgląd) albo --yes (wykonaj zapis).");
    process.exit(1);
  }

  const sb = admin();
  const ac = loadAcProjectIndex();
  const acByZip = new Map(ac.map((a) => [a.zip, a]));

  fs.mkdirSync(AC_WORK_DIR, { recursive: true });

  let created = 0;
  let skippedExisting = 0;
  let totalTasks = 0;
  let totalSubtasks = 0;
  let totalComments = 0;

  for (const c of NEW_CLIENT_PROJECTS) {
    const acProjectId = Number(c.zip.match(/-(\d+)\.zip$/)?.[1] ?? 0);
    const acEntry = acByZip.get(c.zip);

    const { data: existingLink } = await sb
      .from("project_ac_link")
      .select("project_id")
      .eq("ac_project_id", acProjectId)
      .eq("ac_zip", c.zip)
      .maybeSingle();

    if (existingLink) {
      console.log(`[POMINIĘTO] ${c.name} — już zaimportowany wcześniej (project_id=${existingLink.project_id})`);
      skippedExisting++;
      continue;
    }

    const dest = path.join(AC_WORK_DIR, c.zip.replace(/\.zip$/, ""));
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
      execFileSync("unzip", ["-q", "-o", path.join(AC_EXPORT_DIR, "projects", c.zip), "-d", dest]);
    }

    const lastActivity = acEntry?.updatedOn ? toIso(acEntry.updatedOn)!.slice(0, 10) : new Date().toISOString().slice(0, 10);

    if (dryRun) {
      console.log(`[PODGLĄD-NOWY] ${c.name} (${c.type}) <- ${c.zip}  zadania=${acEntry?.tasks ?? "?"} komentarze=${acEntry?.comments ?? "?"}`);
      created++;
      continue;
    }

    const { data: inserted, error: insertError } = await sb
      .from("projects")
      .insert({
        name: c.name,
        type: c.type,
        flow_status: "Zamknięty",
        stage: "Obsługa pogwarancyjna",
        priority: "Niski",
        next_step_owner: "Lider operacyjny",
        next_contact_date: lastActivity,
        last_contact_date: lastActivity,
        last_changed_by: "Import ActiveCollab",
        is_active: false,
        notes: `Zaimportowano z ActiveCollab (archiwum: ${c.zip}). Klient do przypisania ręcznie.`,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error(`  [BŁĄD tworzenia] ${c.name}: ${insertError?.message}`);
      continue;
    }

    const outcome = await importOneZip({
      sb,
      projectId: inserted.id,
      projectName: c.name,
      zip: c.zip,
      acName: acEntry?.name ?? "",
      score: 1,
      dryRun: false,
    });

    if (outcome) {
      totalTasks += outcome.tasks;
      totalSubtasks += outcome.subtasks;
      totalComments += outcome.comments;
    }
    created++;
  }

  console.log("");
  console.log(
    `Podsumowanie: ${created} projektów utworzonych, ${skippedExisting} pominiętych (już istniały). Łącznie: ${totalTasks} zadań, ${totalSubtasks} podzadań, ${totalComments} komentarzy.`,
  );
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "match") return cmdMatch();
  if (cmd === "extract") return cmdExtract();
  if (cmd === "import") return cmdImport();
  if (cmd === "import-extra") return cmdImportExtra();
  if (cmd === "create-client-projects") return cmdCreateClientProjects();
  console.error("Użycie: import-activecollab.ts <match|extract|import|import-extra|create-client-projects> [--dry-run|--yes]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
