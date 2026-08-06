import { normalizeFixedPriceRow } from "@/lib/service/fixed-price";
import type { ServiceFixedPriceRow } from "@/lib/service/types";
import { DEFAULT_CONTRACT_MODULE_SETTINGS } from "@/lib/contracts/module-settings";
import {
  CONTRACT_BUILDING_TYPES,
  CONTRACT_HISTORY_TYPES,
  CONTRACT_OPTION_CATEGORIES,
  CONTRACT_PAYER_TYPES,
  CONTRACT_STATUSES,
  CONTRACT_TABLE_GROUPS,
  type Contract,
  type ContractBuildingType,
  type ContractClientSignature,
  type ContractCompanySignature,
  type ContractHistoryEntry,
  type ContractHistoryType,
  type ContractOptionCategory,
  type ContractPayerType,
  type ContractPaymentPlan,
  type ContractSection,
  type ContractStatus,
  type ContractTableGroup,
  type ContractVatDeclaration,
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

function normalizeOptionCategory(value: unknown): ContractOptionCategory | null {
  return (CONTRACT_OPTION_CATEGORIES as readonly string[]).includes(value as string)
    ? (value as ContractOptionCategory)
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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
          category: normalizeOptionCategory(data.category),
          categoryDiscountPercent: Math.min(100, Math.max(0, asNumber(data.categoryDiscountPercent))),
          selected: data.selected === true,
          selectedRowIds: asStringArray(data.selectedRowIds),
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

function normalizePayerType(value: unknown): ContractPayerType {
  return (CONTRACT_PAYER_TYPES as readonly string[]).includes(value as string)
    ? (value as ContractPayerType)
    : "osoba_prywatna";
}

function normalizeBuildingType(value: unknown): ContractBuildingType | null {
  return (CONTRACT_BUILDING_TYPES as readonly string[]).includes(value as string)
    ? (value as ContractBuildingType)
    : null;
}

export function normalizeContractVatDeclaration(value: unknown): ContractVatDeclaration {
  const data = asObject(value);
  const areaM2 = asNumber(data.areaM2, NaN);
  return {
    payerType: normalizePayerType(data.payerType),
    buildingType: normalizeBuildingType(data.buildingType),
    areaM2: Number.isFinite(areaM2) && areaM2 > 0 ? areaM2 : null,
    innePercent: Math.min(100, Math.max(0, asNumber(data.innePercent))),
  };
}

/** Brak wartości w bazie (stare umowy sprzed tego pola) -> domyślna z ustawień modułu. */
export function normalizeInneDiscountPercent(value: unknown): number {
  if (value === null || value === undefined) {
    return DEFAULT_CONTRACT_MODULE_SETTINGS.inneDiscountPercent;
  }
  return Math.min(100, Math.max(0, asNumber(value, DEFAULT_CONTRACT_MODULE_SETTINGS.inneDiscountPercent)));
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
