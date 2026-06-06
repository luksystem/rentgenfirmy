import type { WorkOrderRow, WorkOrderInsert } from "@/lib/supabase/database.types";
import type { ServiceType } from "@/lib/service/types";
import { normalizeClientOfferAcceptedDocument } from "@/lib/service/client-offer-snapshot";
import type { WorkOrderRecord, WorkOrderSource, WorkOrderStatus } from "@/lib/work-order/types";
import { WORK_ORDER_SOURCES, WORK_ORDER_STATUSES } from "@/lib/work-order/types";

function normalizeSource(value: unknown): WorkOrderSource {
  return typeof value === "string" &&
    WORK_ORDER_SOURCES.includes(value as WorkOrderSource)
    ? (value as WorkOrderSource)
    : "manual";
}

function normalizeStatus(value: unknown): WorkOrderStatus {
  return typeof value === "string" &&
    WORK_ORDER_STATUSES.includes(value as WorkOrderStatus)
    ? (value as WorkOrderStatus)
    : "Nowe";
}

function normalizeServiceType(value: unknown): ServiceType {
  const types: ServiceType[] = ["Gwarancyjny", "Pogwarancyjny", "Prace dodatkowe", "Inne"];
  return typeof value === "string" && types.includes(value as ServiceType)
    ? (value as ServiceType)
    : "Pogwarancyjny";
}

export function rowToWorkOrder(row: WorkOrderRow): WorkOrderRecord {
  return {
    id: row.id,
    source: normalizeSource(row.source),
    serviceId: row.service_id,
    projectId: row.project_id,
    clientId: row.client_id,
    status: normalizeStatus(row.status),
    title: row.title,
    serviceType: normalizeServiceType(row.service_type),
    client: {
      fullName: row.client_full_name,
      location: row.client_location,
      email: row.client_email,
      phone: row.client_phone,
    },
    notes: row.notes ?? "",
    acceptedAt: row.accepted_at,
    offerGrossTotal:
      row.offer_gross_total === null || row.offer_gross_total === undefined
        ? null
        : Number(row.offer_gross_total),
    acceptedOfferDocument: normalizeClientOfferAcceptedDocument(
      row.accepted_offer_document,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workOrderToInsert(order: WorkOrderRecord): WorkOrderInsert {
  return {
    id: order.id,
    source: order.source,
    service_id: order.serviceId,
    project_id: order.projectId,
    client_id: order.clientId,
    status: order.status,
    title: order.title.trim(),
    service_type: order.serviceType,
    client_full_name: order.client.fullName.trim(),
    client_location: order.client.location.trim(),
    client_email: order.client.email.trim(),
    client_phone: order.client.phone.trim(),
    notes: order.notes.trim() || null,
    accepted_at: order.acceptedAt,
    offer_gross_total: order.offerGrossTotal,
    accepted_offer_document: order.acceptedOfferDocument,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}
