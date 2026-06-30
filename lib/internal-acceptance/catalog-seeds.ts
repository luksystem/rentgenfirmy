import type { InternalAcceptanceTemplateStaticItem } from "@/lib/internal-acceptance/template-config";
import { withStaticItemPositions } from "@/lib/internal-acceptance/template-config";

/** Domyślne punkty odbioru per pozycja katalogu specyfikacji (seed przy pierwszej edycji). */
export const SPECIFICATION_CATALOG_ACCEPTANCE_SEEDS: Record<
  string,
  Omit<InternalAcceptanceTemplateStaticItem, "position">[]
> = {
  Oświetlenie: [
    item("light-circuits", "Obwody oświetleniowe", "Sprawdzono wszystkie obwody.", "Oświetlenie", "critical", true),
    item("light-scenes", "Sceny oświetlenia", "Sceny działają poprawnie.", "Oświetlenie", "critical", true),
    item("light-buttons", "Przyciski", "Przyciski fizyczne i w aplikacji.", "Oświetlenie", "normal", true),
    item("light-app", "Sterowanie z aplikacji", "Sterowanie z aplikacji mobilnej / panelu.", "Oświetlenie", "normal", true),
    item("light-emergency", "Awaryjne wyłączenie", "Funkcja awaryjnego wyłączenia.", "Oświetlenie", "critical", true),
  ],
  "Rolety / żaluzje": [
    item("blind-each", "Każda roleta działa", "Indywidualne sterowanie rolet.", "Rolety", "critical", true),
    item("blind-direction", "Kierunki poprawne", "Kierunek jazdy zgodny z oczekiwaniem.", "Rolety", "normal", true),
    item("blind-groups", "Grupy", "Grupowe sterowanie rolet.", "Rolety", "normal", true),
  ],
  "Muzyka multiroom": [
    item("audio-zones", "Strefy audio", "Wszystkie strefy odtwarzają.", "Audio", "critical", true),
    item("audio-sources", "Źródła", "Przełączanie źródeł działa.", "Audio", "normal", true),
  ],
  Klimatyzacja: [
    item("hvac-zones", "Strefy HVAC", "Sterowanie strefami działa.", "HVAC", "critical", true),
    item("hvac-temps", "Temperatury", "Odczyty i setpointy poprawne.", "HVAC", "critical", true),
  ],
  "Ogrzewanie / HVAC": [
    item("hvac-modes", "Tryby pracy", "Grzanie / chłodzenie / auto.", "HVAC", "normal", true),
    item("hvac-schedules", "Harmonogramy HVAC", "Harmonogramy temperatur.", "HVAC", "normal", true),
  ],
  "Monitoring / kamery": [
    item("mon-cameras", "Kamery", "Obraz z wszystkich kamer.", "Monitoring", "critical", true),
    item("mon-recording", "Nagrywanie", "Nagrywanie / archiwum.", "Monitoring", "normal", true),
  ],
  "Alarm / czujki": [
    item("alarm-sensors", "Czujki", "Wszystkie czujki raportują poprawnie.", "Alarm", "critical", true),
    item("alarm-arm", "Uzbrojenie / rozbrojenie", "Procedura uzbrojenia działa.", "Alarm", "critical", true),
  ],
};

function item(
  id: string,
  name: string,
  description: string,
  category: string,
  priority: InternalAcceptanceTemplateStaticItem["priority"],
  mandatory: boolean,
): Omit<InternalAcceptanceTemplateStaticItem, "position"> {
  return { id, name, description, category, priority, mandatory };
}

export function seedCatalogAcceptanceItems(
  catalogName: string,
  existing: InternalAcceptanceTemplateStaticItem[],
): InternalAcceptanceTemplateStaticItem[] {
  if (existing.length) {
    return existing;
  }
  const seed = SPECIFICATION_CATALOG_ACCEPTANCE_SEEDS[catalogName];
  if (!seed) {
    return [];
  }
  return withStaticItemPositions(seed.map((entry) => ({ ...entry, position: 0 })));
}

export function normalizeCatalogAcceptanceItems(value: unknown): InternalAcceptanceTemplateStaticItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return withStaticItemPositions(
    value
      .filter(
        (entry): entry is InternalAcceptanceTemplateStaticItem =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as InternalAcceptanceTemplateStaticItem).id === "string" &&
          typeof (entry as InternalAcceptanceTemplateStaticItem).name === "string",
      )
      .map((entry, index) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description ?? "",
        category: entry.category ?? "Specyfikacja",
        priority: entry.priority ?? "normal",
        mandatory: entry.mandatory !== false,
        position: typeof entry.position === "number" ? entry.position : index,
        requireDocumentation: Boolean(entry.requireDocumentation),
        documentationHint:
          typeof entry.documentationHint === "string" ? entry.documentationHint : undefined,
      })),
  );
}
