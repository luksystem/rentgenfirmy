import { normalizeFixedPriceRow } from "@/lib/service/fixed-price";
import type { ServiceFixedPriceRow } from "@/lib/service/types";
import {
  CONTRACT_HISTORY_TYPES,
  CONTRACT_STATUSES,
  CONTRACT_TABLE_GROUPS,
  type Contract,
  type ContractClientSignature,
  type ContractCompanySignature,
  type ContractHistoryEntry,
  type ContractHistoryType,
  type ContractPaymentPlan,
  type ContractSection,
  type ContractStatus,
  type ContractTableGroup,
} from "@/lib/contracts/types";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeTableGroup(value: unknown): ContractTableGroup {
  return (CONTRACT_TABLE_GROUPS as readonly string[]).includes(value as string)
    ? (value as ContractTableGroup)
    : "main";
}

export function normalizeContractSections(value: unknown): ContractSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry): ContractSection | null => {
      const data = asObject(entry);
      const id = asString(data.id) || crypto.randomUUID();

      if (data.type === "table") {
        const rows = Array.isArray(data.rows)
          ? data.rows
              .map(normalizeFixedPriceRow)
              .filter((row): row is ServiceFixedPriceRow => row !== null)
          : [];

        return {
          id,
          type: "table",
          title: asString(data.title),
          description: asString(data.description),
          showProductDescriptions: data.showProductDescriptions === true,
          group: normalizeTableGroup(data.group),
          selected: data.selected === true,
          rows,
        };
      }

      return {
        id,
        type: "text",
        title: asString(data.title),
        content: asString(data.content),
        struck: data.struck === true,
        blockId: typeof data.blockId === "string" ? data.blockId : null,
      };
    })
    .filter((section): section is ContractSection => section !== null);
}

export function normalizeContractPaymentPlans(value: unknown): ContractPaymentPlan[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    const data = asObject(entry);
    const installments = Array.isArray(data.installments)
      ? data.installments.map((rawItem) => {
          const item = asObject(rawItem);
          return {
            id: asString(item.id) || crypto.randomUUID(),
            label: asString(item.label),
            percent: Math.min(100, Math.max(0, asNumber(item.percent))),
            note: asString(item.note),
            splitOverMonths: Math.max(1, Math.round(asNumber(item.splitOverMonths, 1))),
          };
        })
      : [];

    return {
      id: asString(data.id) || crypto.randomUUID(),
      label: asString(data.label),
      discountPercent: Math.min(100, Math.max(0, asNumber(data.discountPercent))),
      installments,
    };
  });
}

export function normalizeContractHistory(value: unknown): ContractHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const data = asObject(entry);
      const type = (CONTRACT_HISTORY_TYPES as readonly string[]).includes(data.type as string)
        ? (data.type as ContractHistoryType)
        : null;
      if (!type) {
        return null;
      }
      return {
        id: asString(data.id) || crypto.randomUUID(),
        at: asString(data.at) || new Date().toISOString(),
        type,
        message: asString(data.message),
      } satisfies ContractHistoryEntry;
    })
    .filter((entry): entry is ContractHistoryEntry => entry !== null);
}

export function appendContractHistory(
  history: ContractHistoryEntry[],
  entry: { type: ContractHistoryType; message: string },
): ContractHistoryEntry[] {
  return [
    ...history,
    { id: crypto.randomUUID(), at: new Date().toISOString(), type: entry.type, message: entry.message },
  ];
}

export function normalizeContractStatus(value: unknown): ContractStatus {
  return (CONTRACT_STATUSES as readonly string[]).includes(value as string)
    ? (value as ContractStatus)
    : "draft";
}

export function normalizeContractClientSignature(value: unknown): ContractClientSignature | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = asObject(value);
  const signerName = asString(data.signerName);
  const signedAt = asString(data.signedAt);
  if (!signerName || !signedAt) {
    return null;
  }
  return { signerName, signedAt, ip: typeof data.ip === "string" ? data.ip : null };
}

export function normalizeContractCompanySignature(value: unknown): ContractCompanySignature | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = asObject(value);
  const signerName = asString(data.signerName);
  const signedAt = asString(data.signedAt);
  if (!signerName || !signedAt) {
    return null;
  }
  return { signerName, signedAt, userId: typeof data.userId === "string" ? data.userId : null };
}

export function isContractExpired(contract: Pick<Contract, "tokenExpiresAt" | "status">) {
  if (contract.status === "signed_both" || contract.status === "rejected") {
    return false;
  }
  if (!contract.tokenExpiresAt) {
    return false;
  }
  return new Date(contract.tokenExpiresAt).getTime() < Date.now();
}
