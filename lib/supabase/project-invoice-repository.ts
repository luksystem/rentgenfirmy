import {
  PROJECT_INVOICES_BUCKET,
  PROJECT_INVOICES_SIGNED_URL_TTL_SEC,
  validateProjectInvoiceFile,
} from "@/lib/invoices/attachments";
import {
  normalizeProjectInvoiceInput,
  type ProjectInvoice,
  type ProjectInvoiceInput,
  type ProjectInvoiceKind,
} from "@/lib/invoices/types";
import { getSupabase } from "@/lib/supabase/client";

type InvoiceRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  kind: string;
  title: string;
  vendor_name: string;
  invoice_number: string;
  amount_net: number | null;
  amount_gross: number | null;
  vat_rate: number | null;
  currency: string;
  issue_date: string | null;
  notes: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

function isKind(value: string): value is ProjectInvoiceKind {
  return value === "invoice" || value === "cost";
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return "heic";
  }
  return "bin";
}

export function rowToProjectInvoice(row: InvoiceRow): ProjectInvoice {
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    kind: isKind(row.kind) ? row.kind : "cost",
    title: row.title,
    vendorName: row.vendor_name,
    invoiceNumber: row.invoice_number,
    amountNet: row.amount_net,
    amountGross: row.amount_gross,
    vatRate: row.vat_rate,
    currency: row.currency,
    issueDate: row.issue_date,
    notes: row.notes,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fileUrl: null,
  };
}

export async function attachSignedUrlsToProjectInvoices(
  invoices: ProjectInvoice[],
): Promise<ProjectInvoice[]> {
  if (!invoices.length) {
    return invoices;
  }

  const supabase = getSupabase();
  return Promise.all(
    invoices.map(async (invoice) => {
      if (!invoice.storagePath) {
        return invoice;
      }

      const { data, error } = await supabase.storage
        .from(PROJECT_INVOICES_BUCKET)
        .createSignedUrl(invoice.storagePath, PROJECT_INVOICES_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return invoice;
      }

      return { ...invoice, fileUrl: data.signedUrl };
    }),
  );
}

export async function fetchProjectInvoices(options?: {
  projectId?: string;
  clientId?: string;
  kind?: ProjectInvoiceKind;
}) {
  const supabase = getSupabase();
  let query = supabase
    .from("project_invoices")
    .select("*")
    .order("issue_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }
  if (options?.clientId) {
    query = query.eq("client_id", options.clientId);
  }
  if (options?.kind) {
    query = query.eq("kind", options.kind);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  const invoices = (data ?? []).map((row) => rowToProjectInvoice(row as InvoiceRow));
  return attachSignedUrlsToProjectInvoices(invoices);
}

export async function createProjectInvoice(
  input: ProjectInvoiceInput,
  createdByName: string,
  file?: File | null,
) {
  const normalized = normalizeProjectInvoiceInput(input);
  if (!normalized.title) {
    throw new Error("Podaj tytuł faktury lub kosztu.");
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const invoiceId = crypto.randomUUID();

  const { data, error } = await supabase
    .from("project_invoices")
    .insert({
      id: invoiceId,
      project_id: normalized.projectId,
      client_id: normalized.clientId,
      kind: normalized.kind,
      title: normalized.title,
      vendor_name: normalized.vendorName ?? "",
      invoice_number: normalized.invoiceNumber ?? "",
      amount_net: normalized.amountNet ?? null,
      amount_gross: normalized.amountGross ?? null,
      vat_rate: normalized.vatRate ?? null,
      currency: normalized.currency ?? "PLN",
      issue_date: normalized.issueDate,
      notes: normalized.notes ?? "",
      created_by_name: createdByName.trim() || "Zespół",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  let invoice = rowToProjectInvoice(data as InvoiceRow);

  if (file) {
    invoice = await uploadProjectInvoiceFile(invoice.id, file);
  }

  return invoice;
}

export async function uploadProjectInvoiceFile(invoiceId: string, file: File) {
  validateProjectInvoiceFile(file);

  const supabase = getSupabase();
  const extension = extensionForMimeType(file.type);
  const storagePath = `${invoiceId}/${crypto.randomUUID()}.${extension}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PROJECT_INVOICES_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_invoices")
    .update({
      storage_path: storagePath,
      file_name: file.name.trim() || `faktura.${extension}`,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      updated_at: now,
    })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(PROJECT_INVOICES_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  const [withUrl] = await attachSignedUrlsToProjectInvoices([
    rowToProjectInvoice(data as InvoiceRow),
  ]);
  return withUrl;
}

export async function deleteProjectInvoice(invoiceId: string) {
  const supabase = getSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("project_invoices")
    .select("storage_path")
    .eq("id", invoiceId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const { error } = await supabase.from("project_invoices").delete().eq("id", invoiceId);

  if (error) {
    throw new Error(error.message);
  }

  const storagePath = (existing as { storage_path?: string | null } | null)?.storage_path;
  if (storagePath) {
    await supabase.storage.from(PROJECT_INVOICES_BUCKET).remove([storagePath]);
  }
}
