import { DEFAULT_AGREEMENT_VAT_RATE, normalizeAgreementVatRate } from "@/lib/dashboard/agreement-cost";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";
import { getServiceCombinedBilling } from "@/lib/service/report-document";
import type { ServiceRecord } from "@/lib/service/types";
import {
  buildMoneyPayload,
  emptyBillingSettings,
  isSettlementKind,
  isSettlementSource,
  normalizeSettlementEntryInput,
  type ProjectBillingSettings,
  type ProjectSettlementEntry,
  type ProjectSettlementEntryInput,
  type ProjectSettlementsBundle,
} from "@/lib/settlements/types";
import { countBillableWorkMinutes } from "@/lib/time-tracking/project-hour-budget";
import {
  fetchProjectBillingSettings,
  fetchProjectContractQuotas,
} from "@/lib/supabase/project-billing-repository";
import { fetchProjectAgreements } from "@/lib/supabase/project-agreement-repository";
import { fetchProjectChangeRequests } from "@/lib/supabase/project-change-request-repository";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { rowToService } from "@/lib/supabase/service-mappers";

type EntryRow = Database["public"]["Tables"]["project_settlement_entries"]["Row"];

function num(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function rowToSettlementEntry(row: EntryRow): ProjectSettlementEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: isSettlementKind(row.kind) ? row.kind : "charge",
    source: isSettlementSource(row.source) ? row.source : "manual",
    sourceId: row.source_id,
    processStageId: row.process_stage_id ?? null,
    title: row.title,
    amountNet: num(row.amount_net),
    vatRate: num(row.vat_rate),
    amountGross: num(row.amount_gross),
    currency: row.currency || "PLN",
    entryDate: row.entry_date,
    dueDate: row.due_date,
    invoiceNumber: row.invoice_number ?? "",
    externalRef: row.external_ref ?? "",
    notes: row.notes ?? "",
    isAuto: Boolean(row.is_auto),
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjectSettlementEntries(
  projectId: string,
): Promise<ProjectSettlementEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_settlement_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("entry_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToSettlementEntry(row as EntryRow));
}

async function fetchServicesForProject(projectId: string): Promise<ServiceRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    // Tabela services może nie istnieć w niektórych środowiskach
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToService);
}

type AutoChargeSeed = {
  source: "contract" | "offer" | "change_request" | "hourly" | "agreement";
  sourceId: string | null;
  title: string;
  amountNet: number;
  vatRate: number;
  amountGross: number;
  entryDate: string | null;
  notes?: string;
};

function agreementChargeSeed(agreement: ProjectClientAgreement): AutoChargeSeed | null {
  if (agreement.status !== "accepted") {
    return null;
  }
  const net = agreement.proposedCostNet;
  const gross = agreement.proposedCostGross;
  if ((net == null || net <= 0) && (gross == null || gross <= 0)) {
    return null;
  }
  const vatRate = normalizeAgreementVatRate(agreement.proposedCostVatRate);
  const amountNet = net ?? Math.round(((gross ?? 0) / (1 + vatRate / 100)) * 100) / 100;
  const amountGross = gross ?? Math.round(amountNet * (1 + vatRate / 100) * 100) / 100;
  if (amountNet <= 0) {
    return null;
  }
  return {
    source: "agreement",
    sourceId: agreement.id,
    title: `Ustalenie: ${agreement.title}`,
    amountNet,
    vatRate,
    amountGross,
    entryDate: agreement.clientRespondedAt?.slice(0, 10) ?? agreement.updatedAt.slice(0, 10),
    notes: agreement.costNote ?? undefined,
  };
}

async function fetchProjectBillableMinutes(projectId: string): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("time_entries")
    .select("duration_minutes, status")
    .eq("project_id", projectId);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return 0;
    }
    throw new Error(error.message);
  }

  return countBillableWorkMinutes(
    (data ?? []).map((row) => ({
      durationMinutes: Number((row as { duration_minutes?: number }).duration_minutes) || 0,
      status: String((row as { status?: string }).status ?? ""),
    })),
  );
}

function hourlyUsageChargeSeed(
  settings: ProjectBillingSettings,
  usedMinutes: number,
): AutoChargeSeed | null {
  if (!settings.hourlyEnabled || settings.hourlyRateNet == null || settings.hourlyRateNet <= 0) {
    return null;
  }
  if (usedMinutes <= 0) {
    return null;
  }
  const hours = Math.round((usedMinutes / 60) * 100) / 100;
  const money = buildMoneyPayload(
    Math.round(hours * settings.hourlyRateNet * 100) / 100,
    settings.contractVatRate ?? DEFAULT_AGREEMENT_VAT_RATE,
  );
  if (!money) {
    return null;
  }
  return {
    source: "hourly",
    sourceId: null,
    title: `Zużycie godzin (${hours} h × ${settings.hourlyRateNet} PLN)`,
    amountNet: money.amountNet,
    vatRate: money.vatRate,
    amountGross: money.amountGross,
    entryDate: new Date().toISOString().slice(0, 10),
  };
}

function offerChargeSeed(service: ServiceRecord): AutoChargeSeed | null {
  if (service.clientOffer.status !== "accepted" || !service.clientOfferAcceptedDocument) {
    return null;
  }

  const doc = service.clientOfferAcceptedDocument;
  let amountNet = typeof doc.netTotal === "number" ? doc.netTotal : null;
  let vatRate =
    typeof doc.vatRate === "number" ? normalizeAgreementVatRate(doc.vatRate) : DEFAULT_AGREEMENT_VAT_RATE;
  let amountGross = doc.grossTotal;

  if (amountNet == null) {
    try {
      const billing = getServiceCombinedBilling(service);
      amountNet = billing.netTotal;
      amountGross = billing.grossTotal;
      const discounts = service.pricingModel === "fixed_price"
        ? service.estimateDiscounts
        : service.status === "Rozliczony"
          ? service.actualDiscounts
          : service.estimateDiscounts;
      vatRate = normalizeAgreementVatRate(discounts.vatRate);
    } catch {
      amountNet = Math.round((amountGross / (1 + vatRate / 100)) * 100) / 100;
    }
  }

  return {
    source: "offer",
    sourceId: service.id,
    title: `Oferta: ${doc.title || service.title}`,
    amountNet,
    vatRate,
    amountGross,
    entryDate: doc.acceptedAt?.slice(0, 10) ?? null,
  };
}

function changeRequestChargeSeed(entry: ProjectChangeRequest): AutoChargeSeed | null {
  if (entry.status !== "accepted") {
    return null;
  }
  const net = entry.proposedCostNet;
  const gross = entry.proposedCostGross;
  if (net == null && gross == null) {
    return null;
  }
  const vatRate = normalizeAgreementVatRate(entry.proposedCostVatRate);
  const amountNet = net ?? Math.round(((gross ?? 0) / (1 + vatRate / 100)) * 100) / 100;
  const amountGross =
    gross ?? Math.round(amountNet * (1 + vatRate / 100) * 100) / 100;

  return {
    source: "change_request",
    sourceId: entry.id,
    title: `Zmiana: ${entry.title}`,
    amountNet,
    vatRate,
    amountGross,
    entryDate: entry.clientRespondedAt?.slice(0, 10) ?? entry.updatedAt.slice(0, 10),
    notes: entry.costNote ?? undefined,
  };
}

function contractChargeSeed(settings: ProjectBillingSettings): AutoChargeSeed | null {
  if (!settings.fixedPriceEnabled) {
    return null;
  }
  const money = buildMoneyPayload(settings.contractAmountNet, settings.contractVatRate);
  if (!money || money.amountNet <= 0) {
    return null;
  }
  return {
    source: "contract",
    sourceId: null,
    title: "Umowa główna",
    amountNet: money.amountNet,
    vatRate: money.vatRate,
    amountGross: settings.contractAmountGross ?? money.amountGross,
    entryDate: settings.updatedAt.slice(0, 10),
  };
}

async function upsertAutoCharge(
  projectId: string,
  seed: AutoChargeSeed,
  existing: ProjectSettlementEntry[],
): Promise<void> {
  const match = existing.find(
    (entry) =>
      entry.kind === "charge" &&
      entry.source === seed.source &&
      (entry.sourceId ?? null) === (seed.sourceId ?? null),
  );

  // Ręcznie edytowana pozycja — nie nadpisuj kwot, ale źródło nadal „żyje”
  if (match && !match.isAuto) {
    return;
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload = {
    project_id: projectId,
    kind: "charge" as const,
    source: seed.source,
    source_id: seed.sourceId,
    title: seed.title,
    amount_net: seed.amountNet,
    vat_rate: seed.vatRate,
    amount_gross: seed.amountGross,
    currency: "PLN",
    entry_date: seed.entryDate,
    notes: seed.notes?.trim() ?? "",
    is_auto: true,
    created_by_name: "System",
    updated_at: now,
  };

  if (match) {
    const { error } = await supabase
      .from("project_settlement_entries")
      .update(payload)
      .eq("id", match.id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("project_settlement_entries").insert({
    id: crypto.randomUUID(),
    ...payload,
    created_at: now,
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function removeStaleLinkedCharges(
  existing: ProjectSettlementEntry[],
  keepKeys: Set<string>,
): Promise<void> {
  // Usuwamy powiązane należności gdy zniknie źródło (także po ręcznej edycji kwoty).
  const linkedSources = new Set(["contract", "offer", "change_request", "hourly", "agreement"]);
  const toRemove = existing.filter((entry) => {
    if (entry.kind !== "charge" || !linkedSources.has(entry.source)) {
      return false;
    }
    const key = `${entry.source}:${entry.sourceId ?? ""}`;
    return !keepKeys.has(key);
  });

  if (!toRemove.length) {
    return;
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("project_settlement_entries")
    .delete()
    .in(
      "id",
      toRemove.map((entry) => entry.id),
    );
  if (error) {
    throw new Error(error.message);
  }
}

export async function syncProjectSettlementCharges(projectId: string): Promise<void> {
  const [settings, changeRequests, services, agreements, usedMinutes, existing] =
    await Promise.all([
      fetchProjectBillingSettings(projectId),
      fetchProjectChangeRequests(projectId).catch(() => [] as ProjectChangeRequest[]),
      fetchServicesForProject(projectId).catch(() => [] as ServiceRecord[]),
      fetchProjectAgreements(projectId).catch(() => [] as ProjectClientAgreement[]),
      fetchProjectBillableMinutes(projectId).catch(() => 0),
      fetchProjectSettlementEntries(projectId),
    ]);

  const seeds: AutoChargeSeed[] = [];
  if (settings) {
    const contract = contractChargeSeed(settings);
    if (contract) {
      seeds.push(contract);
    }
    const hourly = hourlyUsageChargeSeed(settings, usedMinutes);
    if (hourly) {
      seeds.push(hourly);
    }
  }

  for (const service of services) {
    const seed = offerChargeSeed(service);
    if (seed) {
      seeds.push(seed);
    }
  }

  for (const cr of changeRequests) {
    const seed = changeRequestChargeSeed(cr);
    if (seed) {
      seeds.push(seed);
    }
  }

  for (const agreement of agreements) {
    const seed = agreementChargeSeed(agreement);
    if (seed) {
      seeds.push(seed);
    }
  }

  const keepKeys = new Set(seeds.map((seed) => `${seed.source}:${seed.sourceId ?? ""}`));

  for (const seed of seeds) {
    await upsertAutoCharge(projectId, seed, existing);
  }

  await removeStaleLinkedCharges(existing, keepKeys);
}

export async function fetchProjectSettlementsBundle(
  projectId: string,
  options?: { sync?: boolean },
): Promise<ProjectSettlementsBundle> {
  if (options?.sync !== false) {
    try {
      await syncProjectSettlementCharges(projectId);
    } catch {
      // Sync nie blokuje odczytu (np. brak tabeli w starym środowisku)
    }
  }

  const [settings, quotas, entries] = await Promise.all([
    fetchProjectBillingSettings(projectId),
    fetchProjectContractQuotas(projectId),
    fetchProjectSettlementEntries(projectId),
  ]);

  return {
    settings: settings ?? emptyBillingSettings(projectId),
    quotas,
    hourlyReports: [],
    entries,
    hourBudget: null,
  };
}

export async function createProjectSettlementEntry(
  projectId: string,
  input: ProjectSettlementEntryInput,
  createdByName: string,
): Promise<ProjectSettlementEntry> {
  const normalized = normalizeSettlementEntryInput(input);
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("project_settlement_entries")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      kind: normalized.kind,
      source: normalized.source ?? "manual",
      source_id: normalized.sourceId ?? null,
      process_stage_id: normalized.processStageId ?? null,
      title: normalized.title,
      amount_net: normalized.amountNet,
      vat_rate: normalized.vatRate,
      amount_gross: normalized.amountGross ?? normalized.amountNet,
      currency: normalized.currency ?? "PLN",
      entry_date: normalized.entryDate ?? null,
      due_date: normalized.dueDate ?? null,
      invoice_number: normalized.invoiceNumber ?? "",
      external_ref: normalized.externalRef ?? "",
      notes: normalized.notes ?? "",
      is_auto: normalized.isAuto ?? false,
      created_by_name: createdByName.trim() || "Zespół",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSettlementEntry(data as EntryRow);
}

export async function updateProjectSettlementEntry(
  entryId: string,
  input: ProjectSettlementEntryInput,
): Promise<ProjectSettlementEntry> {
  const normalized = normalizeSettlementEntryInput(input);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("project_settlement_entries")
    .update({
      kind: normalized.kind,
      source: normalized.source ?? "manual",
      source_id: normalized.sourceId ?? null,
      process_stage_id: normalized.processStageId ?? null,
      title: normalized.title,
      amount_net: normalized.amountNet,
      vat_rate: normalized.vatRate,
      amount_gross: normalized.amountGross ?? normalized.amountNet,
      currency: normalized.currency ?? "PLN",
      entry_date: normalized.entryDate ?? null,
      due_date: normalized.dueDate ?? null,
      invoice_number: normalized.invoiceNumber ?? "",
      external_ref: normalized.externalRef ?? "",
      notes: normalized.notes ?? "",
      // Edycja przez użytkownika — nie nadpisuj przy sync
      is_auto: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSettlementEntry(data as EntryRow);
}

export async function deleteProjectSettlementEntry(entryId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_settlement_entries").delete().eq("id", entryId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Usuwa auto-charge powiązany z raportem godzin (przy usuwaniu raportu). */
export async function deleteAutoChargeBySource(
  projectId: string,
  source: "hourly" | "contract" | "offer" | "change_request",
  sourceId: string | null,
): Promise<void> {
  const supabase = getSupabase();
  let query = supabase
    .from("project_settlement_entries")
    .delete()
    .eq("project_id", projectId)
    .eq("kind", "charge")
    .eq("source", source)
    .eq("is_auto", true);

  if (sourceId) {
    query = query.eq("source_id", sourceId);
  } else {
    query = query.is("source_id", null);
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }
}
