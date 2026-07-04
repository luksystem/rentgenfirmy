import type { Project } from "@/lib/types";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { formatDate } from "@/lib/utils";

export type WarrantyStatus = "none" | "active" | "expiring_soon" | "expired" | "pending_extension";

export type WarrantyStatusInfo = {
  status: WarrantyStatus;
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

export type ProjectWarrantyFields = Pick<
  Project,
  "warrantyEndsAt" | "systemHandoverAt" | "warrantyDurationMonths"
>;

const WARRANTY_EXPIRY_NOTICE_DAYS = 30;

function startOfDay(value: Date) {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addMonthsToDate(isoDate: string, months: number) {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + months);
    return fallback.toISOString().slice(0, 10);
  }
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function computeWarrantyEndsAt(
  systemHandoverAt: string | null | undefined,
  warrantyDurationMonths: number | null | undefined,
) {
  const handover = systemHandoverAt?.trim();
  const months = warrantyDurationMonths ?? 0;
  if (!handover || !Number.isFinite(months) || months <= 0) {
    return null;
  }
  return addMonthsToDate(handover, months);
}

export function resolveProjectWarrantyEndsAt(project: ProjectWarrantyFields) {
  if (project.warrantyEndsAt) {
    return project.warrantyEndsAt.slice(0, 10);
  }
  return computeWarrantyEndsAt(project.systemHandoverAt, project.warrantyDurationMonths);
}

export function getWarrantyDaysRemaining(
  project: ProjectWarrantyFields,
  referenceDate = new Date(),
): number | null {
  const endsAtValue = resolveProjectWarrantyEndsAt(project);
  if (!endsAtValue) {
    return null;
  }

  const endsAt = startOfDay(new Date(`${endsAtValue}T12:00:00`));
  const today = startOfDay(referenceDate);
  const diffMs = endsAt.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isWarrantyExpiringSoon(project: ProjectWarrantyFields, withinDays = WARRANTY_EXPIRY_NOTICE_DAYS) {
  const daysRemaining = getWarrantyDaysRemaining(project);
  return daysRemaining !== null && daysRemaining > 0 && daysRemaining <= withinDays;
}

export function getProjectDurationDays(project: Pick<Project, "createdAt">, referenceDate = new Date()) {
  const createdIso = project.createdAt?.trim();
  if (!createdIso) {
    return 0;
  }

  const created = startOfDay(new Date(`${createdIso.slice(0, 10)}T12:00:00`));
  if (Number.isNaN(created.getTime())) {
    return 0;
  }

  const today = startOfDay(referenceDate);
  const diffMs = today.getTime() - created.getTime();
  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function formatProjectDuration(project: Pick<Project, "createdAt">) {
  if (!project.createdAt?.trim()) {
    return "—";
  }

  const days = getProjectDurationDays(project);
  if (days === 0) {
    return "0 dni";
  }
  if (days === 1) {
    return "1 dzień";
  }
  return `${days} dni`;
}

export function formatWarrantyDurationMonths(months: number | null | undefined) {
  if (!months || months <= 0) {
    return "—";
  }
  if (months === 1) {
    return "1 miesiąc";
  }
  if (months >= 2 && months <= 4) {
    return `${months} miesiące`;
  }
  return `${months} miesięcy`;
}

export function formatSystemHandoverDate(project: Pick<Project, "systemHandoverAt">) {
  if (!project.systemHandoverAt) {
    return "—";
  }
  return formatDate(project.systemHandoverAt);
}

export function getWarrantyStatus(
  project: ProjectWarrantyFields,
  options?: { hasPendingExtension?: boolean },
): WarrantyStatusInfo {
  if (options?.hasPendingExtension) {
    return { status: "pending_extension", label: "Oczekuje przedłużenia", tone: "warning" };
  }

  const endsAtValue = resolveProjectWarrantyEndsAt(project);
  if (!endsAtValue) {
    return { status: "none", label: "Brak gwarancji", tone: "neutral" };
  }

  const daysRemaining = getWarrantyDaysRemaining(project);
  if (daysRemaining === null) {
    return { status: "none", label: "Brak gwarancji", tone: "neutral" };
  }

  if (daysRemaining < 0) {
    return { status: "expired", label: "Wygasła", tone: "danger" };
  }

  if (daysRemaining <= WARRANTY_EXPIRY_NOTICE_DAYS) {
    return {
      status: "expiring_soon",
      label: daysRemaining === 0 ? "Kończy się dziś" : `Kończy się za ${daysRemaining} dni`,
      tone: "warning",
    };
  }

  return { status: "active", label: "Aktywna", tone: "success" };
}

export function formatWarrantyEndDate(project: ProjectWarrantyFields) {
  const endsAt = resolveProjectWarrantyEndsAt(project);
  if (!endsAt) {
    return "—";
  }
  return formatDate(endsAt);
}

export function hasPendingWarrantyExtension(agreements: ProjectClientAgreement[]) {
  return agreements.some(
    (entry) => entry.category === "warranty" && entry.status === "pending_client",
  );
}

export type ServiceAiWarrantyContext = {
  status: WarrantyStatus;
  label: string;
  endsAt: string | null;
  serviceType: import("@/lib/service/types").ServiceType;
};

export function buildServiceAiWarrantyContext(
  project: ProjectWarrantyFields,
  serviceType: import("@/lib/service/types").ServiceType,
  options?: { hasPendingExtension?: boolean },
): ServiceAiWarrantyContext {
  const info = getWarrantyStatus(project, options);
  return {
    status: info.status,
    label: info.label,
    endsAt: resolveProjectWarrantyEndsAt(project),
    serviceType,
  };
}

export async function resolveServiceAiWarrantyContext(input: {
  project: ProjectWarrantyFields;
  projectId?: string;
  serviceType: import("@/lib/service/types").ServiceType;
}): Promise<ServiceAiWarrantyContext> {
  let hasPendingExtension = false;

  if (input.projectId?.trim()) {
    const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("project_client_agreements")
      .select("id")
      .eq("project_id", input.projectId.trim())
      .eq("category", "warranty")
      .eq("status", "pending_client")
      .limit(1);

    hasPendingExtension = (data?.length ?? 0) > 0;
  }

  return buildServiceAiWarrantyContext(input.project, input.serviceType, {
    hasPendingExtension,
  });
}

export function formatServiceAiWarrantyContextForPrompt(
  context: ServiceAiWarrantyContext | null,
): string | null {
  if (!context) {
    return null;
  }

  const endDate = context.endsAt ? formatDate(context.endsAt) : "nieustalony";
  const lines = [
    `- Status gwarancji projektu: ${context.label} (${context.status})`,
    `- Koniec gwarancji: ${endDate}`,
    `- Typ rozliczenia serwisowego: ${context.serviceType}`,
  ];

  const isActiveLike =
    context.status === "active" ||
    context.status === "expiring_soon" ||
    context.status === "pending_extension";

  if (isActiveLike) {
    lines.push(
      "",
      "Zasady gwarancji (WAŻNE):",
      "- Gwarancja jest aktywna lub w trakcie przedłużenia — część prac może być wykonana w ramach gwarancji (bez kosztu robocizny dla klienta).",
      "- Dla każdego recognizedTasks ustaw warrantyStatus:",
      "  · warranty — naprawa usterki / praca objęta gwarancją,",
      "  · paid — rozbudowa, nowy element, praca wyraźnie poza gwarancją,",
      "  · mixed — część diagnostyki/remontu gwarancyjna, część płatna,",
      "  · unknown — gdy nie da się jednoznacznie rozstrzygnąć.",
      "- W polu summary napisz zachowawczo, które prace prawdopodobnie mieszczą się w gwarancji, a które mogą być płatne.",
      "- Dodaj do questions lub riskFlags informację, że ostateczny podział gwarancja/płatne wymaga weryfikacji (chyba że opis jednoznacznie wskazuje awarię gwarancyjną).",
      "- Godziny w JSON nadal podawaj łącznie — aplikacja rozlicza stawki; oznaczenie warrantyStatus służy do informacji i dalszego doprecyzowania.",
    );
  } else if (context.status === "expired") {
    lines.push(
      "",
      "Zasady gwarancji:",
      "- Gwarancja wygasła — domyślnie oznaczaj recognizedTasks jako paid, chyba że opis wskazuje inaczej.",
      "- W summary wspomnij, że prace są pogwarancyjne.",
    );
  } else {
    lines.push(
      "",
      "Zasady gwarancji:",
      "- Brak aktywnej gwarancji — domyślnie oznaczaj recognizedTasks jako paid lub unknown.",
    );
  }

  return lines.join("\n");
}

export function filterWarrantyAgreements(agreements: ProjectClientAgreement[]) {
  return agreements.filter((entry) => entry.category === "warranty");
}

export const WARRANTY_DURATION_PRESETS = [
  { label: "12 mies.", months: 12 },
  { label: "24 mies.", months: 24 },
  { label: "36 mies.", months: 36 },
] as const;

export const WARRANTY_EXPIRY_NOTICE_DAYS_EXPORT = WARRANTY_EXPIRY_NOTICE_DAYS;
