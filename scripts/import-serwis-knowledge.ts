/**
 * Import projektu SERWIS z eksportu ActiveCollab do bazy wiedzy (knowledge_sources/knowledge_chunks),
 * żeby AI mogło z niego korzystać przy sugestiach rozwiązań w zgłoszeniach serwisowych
 * (app/api/zgloszenie/knowledge-suggestion) oraz zespół przy ręcznych zapytaniach (/baza-wiedzy).
 *
 * Tworzy JEDNO źródło (type="text") + wiele wycinków (chunkText) — tak samo jak przy ręcznym
 * wgraniu dużego dokumentu tekstowego, więc reszta bazy wiedzy działa bez żadnych zmian.
 *
 * Wymaga w .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Użycie:
 *   npx tsx --env-file=.env.local scripts/import-serwis-knowledge.ts -- --dry-run
 *   npx tsx --env-file=.env.local scripts/import-serwis-knowledge.ts -- --yes
 */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { stripAcHtml } from "../lib/dashboard/ac-history-types";
import { chunkText } from "../lib/knowledge/chunking";

const AC_EXPORT_DIR =
  process.env.AC_EXPORT_DIR ??
  "C:\\sieciowy\\AC rentgen jason export gull109507_220069_1785241411\\export";
const WORK_DIR =
  process.env.AC_WORK_DIR ??
  "C:\\Users\\biuro\\AppData\\Local\\Temp\\claude\\C--Users-biuro-Desktop-Rentgen-firmy\\24fd5614-d030-4afd-898f-6f7b71474b7d\\scratchpad\\ac_extracted";

const SERWIS_ZIP = "serwis-10.zip";
const SOURCE_TITLE = "Archiwum SERWIS z ActiveCollab (2019–2026)";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w env.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function extractedDir(): string {
  const dest = path.join(WORK_DIR, "serwis-10");
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    execFileSync("unzip", ["-q", "-o", path.join(AC_EXPORT_DIR, "projects", SERWIS_ZIP), "-d", dest]);
  }
  const sub = fs.readdirSync(dest).find((f) => fs.statSync(path.join(dest, f)).isDirectory());
  if (!sub) throw new Error("Nie udało się rozpakować archiwum SERWIS.");
  return path.join(dest, sub);
}

function readJson<T>(dir: string, file: string): T {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return [] as unknown as T;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function fmtDate(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return "brak daty";
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function buildCorpus(dir: string): { text: string; taskCount: number; commentCount: number } {
  const tasks = readJson<any[]>(dir, "tasks.json");
  const subtasks = readJson<any[]>(dir, "subtasks.json");
  const comments = readJson<any[]>(dir, "comments.json");

  const subtasksByTask = new Map<number, any[]>();
  for (const s of subtasks) {
    const arr = subtasksByTask.get(s.task_id) ?? [];
    arr.push(s);
    subtasksByTask.set(s.task_id, arr);
  }
  const commentsByTask = new Map<number, any[]>();
  for (const c of comments) {
    if (c.parent_type !== "Task") continue;
    const arr = commentsByTask.get(c.parent_id) ?? [];
    arr.push(c);
    commentsByTask.set(c.parent_id, arr);
  }

  const sortedTasks = [...tasks]
    .filter((t) => !t.is_trashed)
    .sort((a, b) => (a.created_on ?? 0) - (b.created_on ?? 0));

  const blocks: string[] = [];
  let commentCount = 0;

  for (const task of sortedTasks) {
    const title = (task.name ?? "").trim();
    if (!title) continue;

    const body = stripAcHtml(task.body ?? "");
    const status = task.is_completed ? "zamknięte" : "otwarte";
    const lines: string[] = [`### Zgłoszenie serwisowe: ${title} [${status}] (${fmtDate(task.created_on)})`];
    if (body) lines.push(body);

    const taskSubtasks = subtasksByTask.get(task.id) ?? [];
    if (taskSubtasks.length) {
      lines.push("");
      lines.push("Kroki:");
      for (const s of taskSubtasks) {
        const stepTitle = (s.body ?? "").trim();
        if (!stepTitle) continue;
        lines.push(`- [${s.is_completed ? "x" : " "}] ${stepTitle}`);
      }
    }

    const taskComments = (commentsByTask.get(task.id) ?? []).sort(
      (a, b) => (a.created_on ?? 0) - (b.created_on ?? 0),
    );
    if (taskComments.length) {
      lines.push("");
      lines.push("Przebieg / komentarze:");
      for (const c of taskComments) {
        const commentBody = stripAcHtml(c.body ?? "");
        if (!commentBody) continue;
        const author = c.created_by_name || c.created_by_email || "Nieznany autor";
        lines.push(`[${fmtDate(c.created_on)}] ${author}: ${commentBody}`);
        commentCount++;
      }
    }

    blocks.push(lines.join("\n"));
  }

  return { text: blocks.join("\n\n---\n\n"), taskCount: sortedTasks.length, commentCount };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const assumeYes = process.argv.includes("--yes");
  if (!dryRun && !assumeYes) {
    console.error("Podaj --dry-run (podgląd) albo --yes (wykonaj zapis).");
    process.exit(1);
  }

  const dir = extractedDir();
  const { text, taskCount, commentCount } = buildCorpus(dir);
  const chunks = chunkText(text, { chunkSize: 1500, overlap: 150 });

  console.log(`Zadania: ${taskCount}, komentarze: ${commentCount}`);
  console.log(`Długość tekstu: ${text.length} znaków, wycinków: ${chunks.length}`);
  console.log(`Przykładowy pierwszy wycinek:\n---\n${chunks[0]?.slice(0, 400)}\n---`);

  if (dryRun) {
    console.log("\n[PODGLĄD] Nic nie zapisano (uruchom z --yes).");
    return;
  }

  const sb = admin();

  const { data: existing } = await sb
    .from("knowledge_sources")
    .select("id")
    .eq("title", SOURCE_TITLE)
    .maybeSingle();

  let sourceId: string;
  if (existing) {
    sourceId = existing.id;
    await sb.from("knowledge_chunks").delete().eq("source_id", sourceId);
    await sb
      .from("knowledge_sources")
      .update({
        char_count: text.length,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);
    console.log(`Zaktualizowano istniejące źródło (id=${sourceId}), stare wycinki usunięte.`);
  } else {
    const { data: inserted, error } = await sb
      .from("knowledge_sources")
      .insert({
        type: "text",
        title: SOURCE_TITLE,
        description:
          "Historyczne zgłoszenia serwisowe (2019–2026) zaimportowane z dawnego systemu ActiveCollab — zadania, kroki naprawy i komentarze zespołu. Używane przez AI do sugestii rozwiązań przy nowych zgłoszeniach.",
        status: "ready",
        char_count: text.length,
        created_by_name: "Import ActiveCollab",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(`Nie udało się utworzyć źródła: ${error?.message}`);
    }
    sourceId = inserted.id;
    console.log(`Utworzono nowe źródło (id=${sourceId}).`);
  }

  const rows = chunks.map((content, index) => ({
    source_id: sourceId,
    chunk_index: index,
    content,
  }));

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await sb.from("knowledge_chunks").insert(batch);
    if (error) {
      console.error(`  [BŁĄD] batch ${i}: ${error.message}`);
    }
  }

  console.log(`\nZapisano ${rows.length} wycinków dla źródła "${SOURCE_TITLE}".`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
