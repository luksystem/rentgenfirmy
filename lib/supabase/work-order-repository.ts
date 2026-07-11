import {
  buildWorkOrderFromAcceptedService,
  buildWorkOrderFromSettledService,
  resolveAcceptedAt,
} from "@/lib/work-order/defaults";
import type { ServiceRecord } from "@/lib/service/types";
import type { WorkOrderInput, WorkOrderRecord } from "@/lib/work-order/types";
import { getSupabase } from "@/lib/supabase/client";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { rowToWorkOrder, workOrderToInsert } from "@/lib/supabase/work-order-mappers";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DbClient = SupabaseClient<Database>;

export function ensureWorkOrderUuid(id: string) {
  return UUID_RE.test(id) ? id : crypto.randomUUID();
}

export async function fetchWorkOrders(): Promise<WorkOrderRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToWorkOrder);
}

async function fetchWorkOrderByServiceIdFrom(
  supabase: DbClient,
  serviceId: string,
): Promise<WorkOrderRecord | null> {
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("service_id", serviceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToWorkOrder(data) : null;
}

export async function fetchWorkOrderByServiceId(
  serviceId: string,
): Promise<WorkOrderRecord | null> {
  return fetchWorkOrderByServiceIdFrom(getSupabase(), serviceId);
}

export async function fetchWorkOrderByServiceIdServer(
  serviceId: string,
): Promise<WorkOrderRecord | null> {
  return fetchWorkOrderByServiceIdFrom(getSupabaseServer(), serviceId);
}

export async function upsertWorkOrderRecord(order: WorkOrderRecord): Promise<WorkOrderRecord> {
  const supabase = getSupabase();
  const payload = workOrderToInsert({
    ...order,
    id: ensureWorkOrderUuid(order.id),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("work_orders")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToWorkOrder(data);
}

export async function deleteWorkOrderRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("work_orders").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

async function insertWorkOrderFromAcceptedService(
  supabase: DbClient,
  service: ServiceRecord,
  acceptedAt?: string,
): Promise<WorkOrderRecord> {
  const resolvedAcceptedAt = acceptedAt ?? resolveAcceptedAt(service);
  const existing = await fetchWorkOrderByServiceIdFrom(supabase, service.id);

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const input: WorkOrderInput = buildWorkOrderFromAcceptedService(service, resolvedAcceptedAt);
  const order: WorkOrderRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase
    .from("work_orders")
    .insert(workOrderToInsert(order))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToWorkOrder(data);
}

export async function createWorkOrderFromAcceptedService(
  service: ServiceRecord,
  acceptedAt?: string,
): Promise<WorkOrderRecord> {
  return insertWorkOrderFromAcceptedService(getSupabaseServer(), service, acceptedAt);
}

export async function createWorkOrderFromAcceptedServiceClient(
  service: ServiceRecord,
): Promise<WorkOrderRecord> {
  if (service.clientOffer.status !== "accepted") {
    throw new Error("Zlecenie można utworzyć tylko z zaakceptowanej oferty.");
  }

  return insertWorkOrderFromAcceptedService(getSupabase(), service);
}

export async function updateWorkOrderFromSettledService(
  service: ServiceRecord,
  acceptedAt?: string,
): Promise<WorkOrderRecord | null> {
  const supabase = getSupabaseServer();
  const existing = await fetchWorkOrderByServiceIdFrom(supabase, service.id);

  if (!existing) {
    return null;
  }

  const resolvedAcceptedAt = acceptedAt ?? new Date().toISOString();
  const input = buildWorkOrderFromSettledService(service, resolvedAcceptedAt);
  const order: WorkOrderRecord = {
    ...existing,
    ...input,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("work_orders")
    .update(workOrderToInsert(order))
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToWorkOrder(data);
}
