/**
 * Usuwa nieużywany szablon procesu (gdy żaden project_processes go nie referencuje).
 *
 *   npx tsx scripts/delete-unused-process-template.ts Dom --dry-run
 *   npx tsx scripts/delete-unused-process-template.ts Dom --yes
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
}

const projectType = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const assumeYes = process.argv.includes("--yes");

if (!projectType) {
  console.error("Użycie: npx tsx scripts/delete-unused-process-template.ts <projectType> [--dry-run|--yes]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: template, error: templateError } = await supabase
    .from("process_templates")
    .select("id, project_type, name, updated_at")
    .eq("project_type", projectType)
    .maybeSingle();

  if (templateError) throw new Error(templateError.message);
  if (!template) {
    console.log(`Brak szablonu dla typu „${projectType}”.`);
    return;
  }

  const { count: anchoredCount, error: anchoredError } = await supabase
    .from("project_processes")
    .select("id", { count: "exact", head: true })
    .eq("template_id", template.id);

  if (anchoredError) throw new Error(anchoredError.message);

  const { data: stages } = await supabase
    .from("process_stages")
    .select("id, title, position")
    .eq("template_id", template.id)
    .order("position");

  const { count: itemCount } = await supabase
    .from("process_items")
    .select("id", { count: "exact", head: true })
    .in(
      "milestone_id",
      (
        await supabase
          .from("process_milestones")
          .select("id")
          .in("stage_id", (stages ?? []).map((s) => s.id))
      ).data?.map((m) => m.id) ?? [],
    );

  console.log(`Szablon: ${template.name} (${template.project_type})`);
  console.log(`ID: ${template.id}`);
  console.log(`Etapów: ${stages?.length ?? 0}`);
  console.log(`Elementów w szablonie: ${itemCount ?? 0}`);
  console.log(`Projektów zakotwiczonych: ${anchoredCount ?? 0}`);
  stages?.forEach((s) => console.log(`  [${s.position}] ${s.title}`));

  if ((anchoredCount ?? 0) > 0) {
    console.error("Nie można usunąć — szablon jest używany przez projekty.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("\nDry-run: szablon zostałby usunięty.");
    return;
  }

  if (!assumeYes) {
    console.error("\nDodaj --yes aby potwierdzić usunięcie.");
    process.exit(1);
  }

  const { error: deleteError } = await supabase
    .from("process_templates")
    .delete()
    .eq("id", template.id);

  if (deleteError) throw new Error(deleteError.message);

  console.log(`\nUsunięto szablon „${projectType}”.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
