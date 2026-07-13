/**
 * Jednorazowa synchronizacja zakotwiczonych procesów projektów z aktualnymi szablonami.
 *
 * Uruchom:
 *   npm run sync:process-templates -- --dry-run
 *   npm run sync:process-templates -- --yes
 *   npm run sync:process-templates -- --yes --active-only
 *
 * Wymaga w .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { syncAllProjectProcessFromTemplates } from "../lib/supabase/process-bulk-sync-server";

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const activeOnly = hasFlag("--active-only");
  const assumeYes = hasFlag("--yes");

  if (!dryRun && !assumeYes) {
    console.error(
      [
        "To polecenie nadpisze snapshot procesu we wszystkich projektach aktualnym szablonem typu.",
        "Postęp elementów zostanie zachowany tam, gdzie element nadal istnieje w szablonie.",
        "",
        "Najpierw uruchom podgląd:",
        "  npm run sync:process-templates -- --dry-run",
        "",
        "Potem wykonanie:",
        "  npm run sync:process-templates -- --yes",
        "",
        "Opcjonalnie tylko aktywne projekty:",
        "  npm run sync:process-templates -- --yes --active-only",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(
    dryRun
      ? "Podgląd synchronizacji szablonów procesu (dry-run)…"
      : "Synchronizacja szablonów procesu we wszystkich projektach…",
  );
  if (activeOnly) {
    console.log("Zakres: tylko aktywne projekty.");
  }

  const summary = await syncAllProjectProcessFromTemplates({ dryRun, activeOnly });

  for (const result of summary.results) {
    const prefix =
      result.status === "error" ? "BŁĄD" : result.status === "skipped" ? "POMINIĘTO" : "OK";
    console.log(`[${prefix}] ${result.projectName} (${result.projectType || "brak typu"})`);
    if (result.message) {
      console.log(`       ${result.message}`);
    }
  }

  console.log("");
  console.log(
    `Podsumowanie: ${summary.total} projektów · ${summary.synced} ${
      dryRun ? "do sync" : "zsynchronizowano"
    } · ${summary.skipped} pominięto · ${summary.errors} błędów`,
  );

  if (summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
