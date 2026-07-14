import { PROJECT_DOCUMENTS_BUCKET, PROJECT_DOCUMENTS_SIGNED_URL_TTL_SEC, validateProjectDocumentFile } from "@/lib/documents/attachments";
import { analyzeEnergyInvoice } from "@/lib/ai/viz-energy-invoice-analyzer";
import { extractTextFromPdfBuffer } from "@/lib/knowledge/text-extraction";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { VizEnergyInvoiceRow } from "@/lib/supabase/database.types";
import { buildEnergyComparisons, buildEnergyTrend } from "@/lib/viz/energy-comparison";
import {
  excerptPdfText,
  mergeEnergyFields,
  parseEnergyFieldsFromPdfText,
} from "@/lib/viz/energy-invoice-extract";
import type {
  VizEnergyInvoice,
  VizEnergyInvoiceAnalysis,
  VizEnergyInvoiceInput,
  VizEnergySummary,
} from "@/lib/viz/energy-types";

function asAnalysis(value: unknown): VizEnergyInvoiceAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.summary !== "string") {
    return null;
  }
  return value as VizEnergyInvoiceAnalysis;
}

async function signedUrlForPath(storagePath: string | null) {
  if (!storagePath) {
    return null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, PROJECT_DOCUMENTS_SIGNED_URL_TTL_SEC);

  if (error) {
    return null;
  }
  return data.signedUrl;
}

function rowToInvoice(
  row: VizEnergyInvoiceRow,
  document?: {
    title?: string | null;
    file_name?: string | null;
    storage_path?: string | null;
    description?: string | null;
  } | null,
  documentUrl?: string | null,
): VizEnergyInvoice {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    projectId: row.project_id,
    documentId: row.document_id,
    documentTitle: document?.title ?? null,
    documentFileName: document?.file_name ?? null,
    documentUrl: documentUrl ?? null,
    billingPeriodStart: row.billing_period_start,
    billingPeriodEnd: row.billing_period_end,
    totalKwh: row.total_kwh != null ? Number(row.total_kwh) : null,
    totalCostPln: row.total_cost_pln != null ? Number(row.total_cost_pln) : null,
    supplierName: row.supplier_name,
    analysisStatus: row.analysis_status as VizEnergyInvoice["analysisStatus"],
    analysis: asAnalysis(row.analysis_json),
    analyzedAt: row.analyzed_at,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listVizEnergyInvoices(input: {
  dashboardId: string;
  projectId?: string;
}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("viz_energy_invoices")
    .select("*")
    .eq("dashboard_id", input.dashboardId)
    .order("billing_period_end", { ascending: false, nullsFirst: false });

  if (input.projectId) {
    query = query.eq("project_id", input.projectId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as VizEnergyInvoiceRow[];
  if (!rows.length) {
    return [];
  }

  const documentIds = rows.map((row) => row.document_id);
  const { data: documents } = await supabase
    .from("project_documents")
    .select("id, title, file_name, storage_path, description")
    .in("id", documentIds);

  const documentById = new Map((documents ?? []).map((doc) => [doc.id, doc]));
  const urls = await Promise.all(
    rows.map(async (row) => {
      const doc = documentById.get(row.document_id);
      return signedUrlForPath(doc?.storage_path ?? null);
    }),
  );

  return rows.map((row, index) =>
    rowToInvoice(row, documentById.get(row.document_id), urls[index]),
  );
}

export async function getVizEnergySummary(input: {
  dashboardId: string;
  projectId?: string;
}): Promise<VizEnergySummary> {
  const invoices = await listVizEnergyInvoices(input);
  const trend = buildEnergyTrend(invoices);
  const comparisons = buildEnergyComparisons(invoices);
  return { trend, comparisons };
}

async function downloadPdfText(storagePath: string | null) {
  if (!storagePath) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const text = await extractTextFromPdfBuffer(buffer);
  return excerptPdfText(text);
}

export async function countVizEnergyInvoices(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("viz_energy_invoices")
    .select("id", { count: "exact", head: true })
    .eq("dashboard_id", dashboardId);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return 0;
    }
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function uploadVizEnergyInvoice(input: {
  dashboardId: string;
  projectId: string;
  clientId: string | null;
  file: File;
  meta: VizEnergyInvoiceInput;
  uploadedByUserId: string;
  uploadedByName: string;
}) {
  validateProjectDocumentFile(input.file);
  if (input.file.type !== "application/pdf") {
    throw new Error("Faktura energii musi być plikiem PDF.");
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const documentId = crypto.randomUUID();
  const invoiceId = crypto.randomUUID();
  const storagePath = `${documentId}/${crypto.randomUUID()}.pdf`;
  const fileBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const title =
    input.meta.notes?.trim() ||
    input.file.name.replace(/\.pdf$/i, "") ||
    "Faktura energii";

  const { error: documentError } = await supabase.from("project_documents").insert({
    id: documentId,
    project_id: input.projectId,
    client_id: input.clientId,
    category: "pdf",
    title,
    description: input.meta.notes?.trim() || "Faktura energii — moduł Wizualizacje",
    storage_path: storagePath,
    file_name: input.file.name.trim() || "faktura.pdf",
    mime_type: "application/pdf",
    size_bytes: input.file.size,
    source: "manual",
    created_by_name: input.uploadedByName,
    created_at: now,
    updated_at: now,
  });

  if (documentError) {
    await supabase.storage.from(PROJECT_DOCUMENTS_BUCKET).remove([storagePath]);
    throw new Error(documentError.message);
  }

  const { data, error } = await supabase
    .from("viz_energy_invoices")
    .insert({
      id: invoiceId,
      dashboard_id: input.dashboardId,
      project_id: input.projectId,
      document_id: documentId,
      billing_period_start: input.meta.billingPeriodStart || null,
      billing_period_end: input.meta.billingPeriodEnd || null,
      total_kwh: input.meta.totalKwh ?? null,
      total_cost_pln: input.meta.totalCostPln ?? null,
      supplier_name: input.meta.supplierName?.trim() || null,
      analysis_status: "none",
      analysis_json: {},
      uploaded_by_user_id: input.uploadedByUserId,
      uploaded_by_name: input.uploadedByName,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const documentUrl = await signedUrlForPath(storagePath);
  return rowToInvoice(
    data as VizEnergyInvoiceRow,
    {
      title,
      file_name: input.file.name,
      storage_path: storagePath,
      description: input.meta.notes ?? null,
    },
    documentUrl,
  );
}

export async function analyzeVizEnergyInvoice(invoiceId: string) {
  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("viz_energy_invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!row) {
    throw new Error("Faktura energii nie istnieje.");
  }

  const { data: document } = await supabase
    .from("project_documents")
    .select("title, file_name, storage_path, description")
    .eq("id", row.document_id)
    .maybeSingle();

  await supabase
    .from("viz_energy_invoices")
    .update({ analysis_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", invoiceId);

  try {
    const pdfExcerpt = await downloadPdfText(document?.storage_path ?? null);
    const manualFields = {
      totalKwh: row.total_kwh != null ? Number(row.total_kwh) : null,
      totalCostPln: row.total_cost_pln != null ? Number(row.total_cost_pln) : null,
      billingPeriodStart: row.billing_period_start,
      billingPeriodEnd: row.billing_period_end,
      supplierName: row.supplier_name,
    };
    const pdfFields = pdfExcerpt ? parseEnergyFieldsFromPdfText(pdfExcerpt) : {
      totalKwh: null,
      totalCostPln: null,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      supplierName: null,
    };
    const merged = mergeEnergyFields(manualFields, pdfFields);

    const analysis = await analyzeEnergyInvoice({
      title: document?.title ?? "Faktura energii",
      description: document?.description,
      billingPeriodStart: merged.billingPeriodStart,
      billingPeriodEnd: merged.billingPeriodEnd,
      totalKwh: merged.totalKwh,
      totalCostPln: merged.totalCostPln,
      supplierName: merged.supplierName,
      pdfExcerpt,
    });

    const { data: updated, error: updateError } = await supabase
      .from("viz_energy_invoices")
      .update({
        analysis_status: "completed",
        analysis_json: analysis,
        analyzed_at: new Date().toISOString(),
        total_kwh: analysis.extractedFields.totalKwh ?? row.total_kwh,
        total_cost_pln: analysis.extractedFields.totalCostPln ?? row.total_cost_pln,
        supplier_name: analysis.extractedFields.supplierName ?? row.supplier_name,
        billing_period_start: analysis.extractedFields.billingPeriodStart ?? row.billing_period_start,
        billing_period_end: analysis.extractedFields.billingPeriodEnd ?? row.billing_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const documentUrl = await signedUrlForPath(document?.storage_path ?? null);
    return rowToInvoice(updated as VizEnergyInvoiceRow, document, documentUrl);
  } catch (analysisError) {
    const message = analysisError instanceof Error ? analysisError.message : "Błąd analizy.";
    await supabase
      .from("viz_energy_invoices")
      .update({
        analysis_status: "failed",
        analysis_json: { summary: message, anomalies: [], recommendations: [], extractedFields: {}, confidence: "low", provider: "rules" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);
    throw analysisError;
  }
}
