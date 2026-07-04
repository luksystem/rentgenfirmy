import type {
  ServiceAiEstimateProposal,
  ServiceAiMaterialProposal,
  ServiceAiRecognizedTask,
  ServiceAiTravelProposal,
} from "@/lib/service/ai-estimate-types";
import {
  AI_INTAKE_RECOMMENDED_ACTIONS,
  AI_WARRANTY_STATUSES,
  type ServiceAiIntakeRecommendation,
} from "@/lib/service/ai-estimate-types";

function clamp01(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeWarrantyStatus(value: unknown): ServiceAiRecognizedTask["warrantyStatus"] {
  return typeof value === "string" &&
    (AI_WARRANTY_STATUSES as readonly string[]).includes(value)
    ? (value as ServiceAiRecognizedTask["warrantyStatus"])
    : "unknown";
}

function normalizeTask(value: unknown): ServiceAiRecognizedTask | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!name) {
    return null;
  }

  return {
    name,
    category: typeof row.category === "string" ? row.category : "general",
    warrantyStatus: normalizeWarrantyStatus(row.warrantyStatus),
    installerHours: asNumber(row.installerHours),
    helperHours: asNumber(row.helperHours),
    programmerOnsiteHours: asNumber(row.programmerOnsiteHours),
    programmerRemoteHours: asNumber(row.programmerRemoteHours),
    supervisorHours: asNumber(row.supervisorHours),
    requiresTrip: row.requiresTrip === true,
    notes: typeof row.notes === "string" ? row.notes.trim() : "",
  };
}

function normalizeMaterial(value: unknown): ServiceAiMaterialProposal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!name) {
    return null;
  }

  return {
    name,
    estimatedNetPriceMin: asNumber(row.estimatedNetPriceMin),
    estimatedNetPriceMax: asNumber(row.estimatedNetPriceMax),
    confidence: clamp01(asNumber(row.confidence, 0.5)),
    verificationRequired: row.verificationRequired !== false,
    notes: typeof row.notes === "string" ? row.notes.trim() : "",
  };
}

function normalizeIntakeRecommendation(value: unknown): ServiceAiIntakeRecommendation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const recommendedAction = row.recommendedAction;
  if (
    typeof recommendedAction !== "string" ||
    !(AI_INTAKE_RECOMMENDED_ACTIONS as readonly string[]).includes(recommendedAction)
  ) {
    return null;
  }

  const note = typeof row.note === "string" ? row.note.trim() : "";
  if (!note) {
    return null;
  }

  return {
    recommendedAction: recommendedAction as ServiceAiIntakeRecommendation["recommendedAction"],
    note,
    remoteOnlyViable: row.remoteOnlyViable === true,
    onsiteVisitLikelyRequired: row.onsiteVisitLikelyRequired === true,
  };
}

function normalizeTravel(value: unknown): ServiceAiTravelProposal {
  const row =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    estimatedTrips: Math.max(0, Math.round(asNumber(row.estimatedTrips, 1))),
    oneWayDistanceKm: Math.max(0, asNumber(row.oneWayDistanceKm)),
    totalDistanceKm: Math.max(0, asNumber(row.totalDistanceKm)),
    estimatedDriveTimeHours: Math.max(0, asNumber(row.estimatedDriveTimeHours)),
    overnightRequired: row.overnightRequired === true,
    overnights: Math.max(0, Math.round(asNumber(row.overnights))),
  };
}

export function parseServiceAiEstimateProposal(raw: unknown): ServiceAiEstimateProposal {
  const row =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const recognizedTasks = Array.isArray(row.recognizedTasks)
    ? row.recognizedTasks
        .map(normalizeTask)
        .filter((task): task is ServiceAiRecognizedTask => task !== null)
    : [];

  const materials = Array.isArray(row.materials)
    ? row.materials
        .map(normalizeMaterial)
        .filter((item): item is ServiceAiMaterialProposal => item !== null)
    : [];

  return {
    confidence: clamp01(asNumber(row.confidence, 0.5)),
    summary:
      typeof row.summary === "string" && row.summary.trim()
        ? row.summary.trim()
        : "Orientacyjna wycena prac serwisowych.",
    recognizedTasks,
    travel: normalizeTravel(row.travel),
    materials,
    questions: Array.isArray(row.questions)
      ? row.questions
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim())
      : [],
    riskFlags: Array.isArray(row.riskFlags)
      ? row.riskFlags
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim())
      : [],
    intakeRecommendation: normalizeIntakeRecommendation(row.intakeRecommendation),
  };
}

export function extractJsonObject(content: string) {
  let text = content.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI nie zwróciło poprawnego JSON.");
  }
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}
