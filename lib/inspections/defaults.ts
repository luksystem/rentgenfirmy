import type { InspectionGlobalSettings } from "@/lib/inspections/types";

export const DEFAULT_INSPECTION_SYSTEMS: InspectionGlobalSettings["systems"] = [
  { code: "ssp", label: "SSP — System Sygnalizacji Pożaru", active: true },
  { code: "sswin", label: "SSWiN — System Sygnalizacji Włamania i Napadu", active: true },
  { code: "cctv", label: "CCTV — Monitoring wizyjny", active: true },
  { code: "kd", label: "KD — Kontrola dostępu", active: true },
  { code: "bms", label: "BMS — Automatyka budynkowa", active: true },
];

export const DEFAULT_INSPECTION_SETTINGS: InspectionGlobalSettings = {
  systems: DEFAULT_INSPECTION_SYSTEMS,
};

export function normalizeInspectionGlobalSettings(raw: unknown): InspectionGlobalSettings {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const systemsRaw = Array.isArray(data.systems) ? data.systems : DEFAULT_INSPECTION_SYSTEMS;

  const systems = systemsRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const code = typeof row.code === "string" ? row.code.trim().toLowerCase() : "";
      const label = typeof row.label === "string" ? row.label.trim() : "";
      if (!code || !label) {
        return null;
      }
      return {
        code,
        label,
        active: row.active !== false,
      };
    })
    .filter(Boolean) as InspectionGlobalSettings["systems"];

  return {
    systems: systems.length ? systems : DEFAULT_INSPECTION_SYSTEMS,
  };
}
