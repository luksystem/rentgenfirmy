// Renderuje StageReportContent do stałego tekstu szablonu (docs/role/03 §3) — do przycisku
// "Kopiuj". Sekcje i ich kolejność są zamknięte (nie zmieniać). Pola, których ROT/zmiany nie
// śledzą dziś (np. "termin"/"właściciel" per pozycja PRZENIESIONE, "potrzebne do"/"skutek zwłoki"
// per pozycja CZEGO POTRZEBUJEMY) drukują się jako jawny placeholder, nie znikają i nie są zmyślane.
import { formatDate } from "@/lib/utils";
import type { StageReportContent } from "@/lib/stage-report/types";

function formatMoney(value: number | null) {
  if (value == null) return null;
  return `${value.toLocaleString("pl-PL")} zł`;
}

export function renderStageReportText(content: StageReportContent, coordinatorComment: string): string {
  const lines: string[] = [];

  lines.push("RAPORT ZAMKNIĘCIA ETAPU");
  lines.push(`Projekt: ${content.projectName}        Etap: ${content.stageTitle}`);
  lines.push(`Kamień milowy: ${content.milestoneTitle} — OSIĄGNIĘTY ${formatDate(content.milestoneReachedAt)}`);
  lines.push("");

  lines.push("CO ZOSTAŁO ZROBIONE");
  if (content.completedItems.length === 0) {
    lines.push("  brak ukończonych pozycji");
  } else {
    for (const item of content.completedItems) {
      const kindLabel = item.kind === "protocol" ? "protokół" : "checklista";
      lines.push(`  • ${item.title} (${kindLabel})${item.completedAt ? ` — ${formatDate(item.completedAt)}` : ""}`);
    }
  }
  lines.push("");

  lines.push("DOKUMENTY DO PAŃSTWA WGLĄDU");
  if (content.documents.length === 0) {
    lines.push("  brak udostępnionych dokumentów");
  } else {
    for (const doc of content.documents) {
      lines.push(`  • ${doc.title}: ${doc.url ?? "(brak włączonego publicznego linku)"}`);
    }
  }
  lines.push("");

  lines.push("ZMIANY W TYM ETAPIE");
  if (content.changes.length === 0) {
    lines.push("  brak zmian projektowych w tym etapie");
  } else {
    for (const change of content.changes) {
      const cost = formatMoney(change.costGross) ?? formatMoney(change.costNet);
      lines.push(`  • ${change.title}`);
      if (change.costNote) lines.push(`    Wpływ: ${change.costNote}`);
      if (cost) lines.push(`    Koszt: ${cost}`);
      if (change.approvedByName) {
        lines.push(
          `    Zaakceptowano: ${change.approvedByName}${change.approvedAt ? ` (${formatDate(change.approvedAt)})` : ""}`,
        );
      }
    }
  }
  lines.push("");

  lines.push("PRZENIESIONE DO NASTĘPNEGO ETAPU");
  if (content.carriedOverItems.length === 0) {
    lines.push("  brak pozycji otwartych");
  } else {
    for (const item of content.carriedOverItems) {
      lines.push(`  • ${item.title}${item.detail ? ` — ${item.detail}` : ""} (${item.daysOpen} dni)`);
    }
  }
  lines.push("");

  lines.push("CZEGO POTRZEBUJEMY OD PAŃSTWA");
  if (content.clientNeeds.length === 0) {
    lines.push("  nic w tej chwili");
  } else {
    for (const item of content.clientNeeds) {
      lines.push(`  Decyzja: ${item.title}${item.detail ? ` (${item.detail})` : ""}`);
      lines.push(`    Potrzebna do: nie śledzone dziś | Skutek zwłoki: nie śledzone dziś`);
    }
  }
  lines.push("");

  lines.push("NASTĘPNY ETAP");
  if (!content.nextStage) {
    lines.push("  brak — to ostatni etap szablonu");
  } else {
    const stage = content.nextStage;
    lines.push(
      `  ${stage.title} — planowany start ${stage.plannedStartDate ? formatDate(stage.plannedStartDate) : "nieustalony"} — warunki rozpoczęcia: ${
        stage.startConditions.length > 0 ? stage.startConditions.join(", ") : "brak zdefiniowanych warunków"
      }`,
    );
    lines.push(`  Odpowiedzialny: ${stage.responsibleRoleLabel ?? "nieustalony"}${stage.responsibleName ? `, ${stage.responsibleName}` : ""}`);
    lines.push(`  Rytm kontaktu w tym etapie: ${stage.rhythmLabel ?? "nieustalony"}`);
  }
  lines.push("");

  lines.push("KOMENTARZ OPIEKUNA");
  lines.push(`  ${coordinatorComment || "(brak komentarza)"}`);
  lines.push("");

  lines.push("Prosimy o potwierdzenie zapoznania się z raportem.");
  lines.push("Brak uwag w ciągu 7 dni traktujemy jako potwierdzenie.");

  return lines.join("\n");
}
