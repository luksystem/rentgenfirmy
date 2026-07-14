import {
  isServiceIntakeActive,
  isServiceIntakeOverdue,
  resolveServiceIntakeDueAt,
} from "@/lib/service-intake/sla";
import type { ServiceIntakePriority, ServiceIntakeStatus } from "@/lib/service-intake/types";

const HOUR_MS = 60 * 60 * 1000;

export const VIZ_SLA_STATUSES = ["ok", "approaching", "overdue", "no_deadline"] as const;
export type VizSlaStatus = (typeof VIZ_SLA_STATUSES)[number];

export const VIZ_SLA_STATUS_LABELS: Record<VizSlaStatus, string> = {
  ok: "W terminie",
  approaching: "Zbliża się termin",
  overdue: "Po terminie",
  no_deadline: "Bez terminu",
};

export type VizServiceSlaInput = {
  id: string;
  referenceNumber: string;
  status: ServiceIntakeStatus;
  priority: ServiceIntakePriority | null;
  projectId: string | null;
  description: string;
  createdAt: string;
  dueAt: string | null;
  closedAt?: string | null;
};

export type VizContractSlaContext = {
  contractSlaHours: number | null;
  contractName: string | null;
};

export type VizServiceSlaItem = VizServiceSlaInput & {
  projectLabel: string | null;
  effectiveDueAt: string | null;
  contractSlaDueAt: string | null;
  contractSlaHours: number | null;
  contractName: string | null;
  slaStatus: VizSlaStatus;
  hoursOpen: number;
  hoursUntilDue: number | null;
  isOverdue: boolean;
};

export function contractSlaDueAt(createdAt: string, slaHours: number | null): string | null {
  if (slaHours == null || slaHours <= 0) {
    return null;
  }
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return null;
  }
  return new Date(created.getTime() + slaHours * HOUR_MS).toISOString();
}

export function resolveEffectiveSlaDueAt(input: {
  createdAt: string;
  dueAt: string | null;
  priority: ServiceIntakePriority | null;
  contractSlaHours: number | null;
}): string | null {
  const intakeDue = resolveServiceIntakeDueAt({
    createdAt: input.createdAt,
    dueAt: input.dueAt,
    priority: input.priority,
  });
  const contractDue = contractSlaDueAt(input.createdAt, input.contractSlaHours);

  if (intakeDue && contractDue) {
    return intakeDue < contractDue ? intakeDue : contractDue;
  }
  return intakeDue ?? contractDue;
}

export function resolveVizSlaStatus(input: {
  createdAt: string;
  dueAt: string | null;
  priority: ServiceIntakePriority | null;
  status: ServiceIntakeStatus;
  closedAt?: string | null;
  contractSlaHours: number | null;
  now?: number;
}): VizSlaStatus {
  if (!isServiceIntakeActive(input.status)) {
    return "ok";
  }

  const effectiveDue = resolveEffectiveSlaDueAt({
    createdAt: input.createdAt,
    dueAt: input.dueAt,
    priority: input.priority,
    contractSlaHours: input.contractSlaHours,
  });

  if (!effectiveDue) {
    return "no_deadline";
  }

  const now = input.now ?? Date.now();
  const dueMs = new Date(effectiveDue).getTime();
  if (Number.isNaN(dueMs)) {
    return "no_deadline";
  }

  if (now > dueMs) {
    return "overdue";
  }

  const createdMs = new Date(input.createdAt).getTime();
  const totalWindow = dueMs - (Number.isNaN(createdMs) ? now : createdMs);
  const remaining = dueMs - now;

  if (totalWindow > 0 && remaining / totalWindow <= 0.25) {
    return "approaching";
  }

  if (remaining <= 4 * HOUR_MS) {
    return "approaching";
  }

  return "ok";
}

export function buildVizServiceSlaItem(
  intake: VizServiceSlaInput,
  context: {
    projectLabel: string | null;
    contract: VizContractSlaContext;
    now?: number;
  },
): VizServiceSlaItem {
  const now = context.now ?? Date.now();
  const createdMs = new Date(intake.createdAt).getTime();
  const hoursOpen = Number.isNaN(createdMs) ? 0 : (now - createdMs) / HOUR_MS;

  const contractSlaDueAtValue = contractSlaDueAt(
    intake.createdAt,
    context.contract.contractSlaHours,
  );
  const effectiveDueAt = resolveEffectiveSlaDueAt({
    createdAt: intake.createdAt,
    dueAt: intake.dueAt,
    priority: intake.priority,
    contractSlaHours: context.contract.contractSlaHours,
  });

  const dueMs = effectiveDueAt ? new Date(effectiveDueAt).getTime() : null;
  const hoursUntilDue =
    dueMs != null && !Number.isNaN(dueMs) ? (dueMs - now) / HOUR_MS : null;

  const slaStatus = resolveVizSlaStatus({
    createdAt: intake.createdAt,
    dueAt: intake.dueAt,
    priority: intake.priority,
    status: intake.status,
    closedAt: intake.closedAt,
    contractSlaHours: context.contract.contractSlaHours,
    now,
  });

  return {
    ...intake,
    projectLabel: context.projectLabel,
    effectiveDueAt,
    contractSlaDueAt: contractSlaDueAtValue,
    contractSlaHours: context.contract.contractSlaHours,
    contractName: context.contract.contractName,
    slaStatus,
    hoursOpen,
    hoursUntilDue,
    isOverdue:
      isServiceIntakeActive(intake.status) &&
      isServiceIntakeOverdue({
        dueAt: effectiveDueAt,
        createdAt: intake.createdAt,
        priority: intake.priority,
        status: intake.status,
        closedAt: intake.closedAt,
      }),
  };
}

export function resolveContractSlaForProject(
  projectId: string,
  contracts: Array<{
    name: string;
    slaResponseHours: number | null;
    isActive: boolean;
    projectTerms: Array<{ projectId: string }>;
  }>,
): VizContractSlaContext {
  const active = contracts.filter((contract) => contract.isActive);
  for (const contract of active) {
    const appliesToAll = contract.projectTerms.length === 0;
    const appliesToProject = contract.projectTerms.some((term) => term.projectId === projectId);
    if ((appliesToAll || appliesToProject) && contract.slaResponseHours != null) {
      return {
        contractSlaHours: contract.slaResponseHours,
        contractName: contract.name,
      };
    }
  }
  return { contractSlaHours: null, contractName: null };
}

export function sortVizServiceSlaItems(items: VizServiceSlaItem[]): VizServiceSlaItem[] {
  const rank: Record<VizSlaStatus, number> = {
    overdue: 0,
    approaching: 1,
    ok: 2,
    no_deadline: 3,
  };

  return [...items].sort((a, b) => {
    const statusDiff = rank[a.slaStatus] - rank[b.slaStatus];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    if (a.hoursUntilDue != null && b.hoursUntilDue != null) {
      return a.hoursUntilDue - b.hoursUntilDue;
    }
    return b.hoursOpen - a.hoursOpen;
  });
}
