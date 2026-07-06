import type {
  ProjectProcessProtocol,
  ProtocolAnnotation,
  ProtocolField,
  ProtocolFieldValue,
  ProtocolSignature,
  ProtocolTemplate,
  ProtocolTemplateSource,
} from "@/lib/process/protocol-types";
import { getSupabase } from "@/lib/supabase/client";
import type {
  ProcessProtocolTemplateRow,
  ProjectProcessProtocolRow,
} from "@/lib/supabase/database.types";

export const PROCESS_PROTOCOLS_BUCKET = "process-protocols";

function isMissingTableError(message: string) {
  return message.toLowerCase().includes("does not exist");
}

function rowToProtocolTemplate(row: ProcessProtocolTemplateRow): ProtocolTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    source: (row.source as ProtocolTemplateSource) ?? "custom",
    fields: Array.isArray(row.fields) ? (row.fields as ProtocolField[]) : [],
    referencePdfPath: row.reference_pdf_path,
    referencePdfName: row.reference_pdf_name,
    projectType: row.project_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProjectProcessProtocol(row: ProjectProcessProtocolRow): ProjectProcessProtocol {
  return {
    id: row.id,
    projectProcessItemId: row.project_process_item_id,
    protocolTemplateId: row.protocol_template_id,
    fieldValues: (row.field_values as Record<string, ProtocolFieldValue>) ?? {},
    notes: row.notes ?? "",
    companySignature: (row.company_signature as ProtocolSignature | null) ?? null,
    clientSignature: (row.client_signature as ProtocolSignature | null) ?? null,
    annotations: Array.isArray(row.annotations) ? (row.annotations as ProtocolAnnotation[]) : [],
    generatedPdfPath: row.generated_pdf_path ?? null,
    acceptedAt: row.accepted_at ?? null,
    acceptedBy: row.accepted_by ?? null,
    linkedDocumentId: row.linked_document_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProtocolTemplates(): Promise<ProtocolTemplate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_protocol_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToProtocolTemplate(row as ProcessProtocolTemplateRow));
}

export async function uploadProtocolReferencePdf(templateId: string, file: File) {
  const supabase = getSupabase();
  const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const storagePath = `${templateId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PROCESS_PROTOCOLS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return { path: storagePath, name: file.name };
}

export async function getProtocolReferencePdfUrl(path: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(PROCESS_PROTOCOLS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function createProtocolTemplate(input: {
  name: string;
  description?: string;
  source: ProtocolTemplateSource;
  fields: ProtocolField[];
  projectType?: string | null;
  referenceFile?: File | null;
}): Promise<ProtocolTemplate> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  let referencePdfPath: string | null = null;
  let referencePdfName: string | null = null;
  if (input.source === "pdf" && input.referenceFile) {
    const uploaded = await uploadProtocolReferencePdf(id, input.referenceFile);
    referencePdfPath = uploaded.path;
    referencePdfName = uploaded.name;
  }

  const { data, error } = await supabase
    .from("process_protocol_templates")
    .insert({
      id,
      name: input.name.trim() || "Nowy wzór protokołu",
      description: input.description?.trim() ?? "",
      source: input.source,
      fields: input.source === "custom" ? input.fields : [],
      reference_pdf_path: referencePdfPath,
      reference_pdf_name: referencePdfName,
      project_type: input.projectType ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if (referencePdfPath) {
      await supabase.storage.from(PROCESS_PROTOCOLS_BUCKET).remove([referencePdfPath]);
    }
    throw new Error(error.message);
  }

  return rowToProtocolTemplate(data as ProcessProtocolTemplateRow);
}

export async function saveProtocolTemplate(
  template: ProtocolTemplate,
  replaceReferenceFile?: File | null,
): Promise<ProtocolTemplate> {
  const supabase = getSupabase();

  let referencePdfPath = template.referencePdfPath;
  let referencePdfName = template.referencePdfName;

  if (template.source === "pdf" && replaceReferenceFile) {
    const uploaded = await uploadProtocolReferencePdf(template.id, replaceReferenceFile);
    if (referencePdfPath) {
      await supabase.storage.from(PROCESS_PROTOCOLS_BUCKET).remove([referencePdfPath]);
    }
    referencePdfPath = uploaded.path;
    referencePdfName = uploaded.name;
  }

  const { data, error } = await supabase
    .from("process_protocol_templates")
    .update({
      name: template.name.trim() || "Wzór protokołu",
      description: template.description,
      source: template.source,
      fields: template.source === "custom" ? template.fields : [],
      reference_pdf_path: template.source === "pdf" ? referencePdfPath : null,
      reference_pdf_name: template.source === "pdf" ? referencePdfName : null,
      project_type: template.projectType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", template.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProtocolTemplate(data as ProcessProtocolTemplateRow);
}

export async function deleteProtocolTemplate(id: string, referencePdfPath?: string | null): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("process_protocol_templates").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  if (referencePdfPath) {
    await supabase.storage.from(PROCESS_PROTOCOLS_BUCKET).remove([referencePdfPath]);
  }
}

/** Batch fetch — jedno zapytanie dla wszystkich elementów procesu projektu (bez N+1). */
export async function fetchProjectProcessProtocolsForItems(
  projectProcessItemIds: string[],
): Promise<ProjectProcessProtocol[]> {
  if (!projectProcessItemIds.length) {
    return [];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_protocols")
    .select("*")
    .in("project_process_item_id", projectProcessItemIds);

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToProjectProcessProtocol(row as ProjectProcessProtocolRow));
}

async function fetchProtocolRow(projectProcessItemId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_protocols")
    .select("*")
    .eq("project_process_item_id", projectProcessItemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProjectProcessProtocolRow | null;
}

async function ensureProtocolRow(projectProcessItemId: string): Promise<ProjectProcessProtocolRow> {
  const existing = await fetchProtocolRow(projectProcessItemId);
  if (existing) {
    return existing;
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  // `upsert` + `ignoreDuplicates`, nie `insert` — dwa równoległe wywołania (np. otwarcie tego samego
  // elementu procesu w dwóch kartach) mogą oba nie zobaczyć jeszcze istniejącego wiersza; bez tego
  // druga próba wstawienia tego samego project_process_item_id kończy się konfliktem 409.
  const { error: upsertError } = await supabase.from("project_process_protocols").upsert(
    {
      id: crypto.randomUUID(),
      project_process_item_id: projectProcessItemId,
      protocol_template_id: null,
      field_values: {},
      notes: "",
      created_at: now,
      updated_at: now,
    },
    { onConflict: "project_process_item_id", ignoreDuplicates: true },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const row = await fetchProtocolRow(projectProcessItemId);
  if (!row) {
    throw new Error("Nie udało się utworzyć wiersza protokołu.");
  }

  return row;
}

export async function fetchOrCreateProjectProcessProtocol(
  projectProcessItemId: string,
): Promise<ProjectProcessProtocol> {
  const row = await ensureProtocolRow(projectProcessItemId);
  return rowToProjectProcessProtocol(row);
}

export async function assignProtocolTemplateToItem(
  projectProcessItemId: string,
  protocolTemplateId: string | null,
): Promise<ProjectProcessProtocol> {
  await ensureProtocolRow(projectProcessItemId);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_protocols")
    .update({
      protocol_template_id: protocolTemplateId,
      field_values: {},
      company_signature: null,
      client_signature: null,
      updated_at: new Date().toISOString(),
    })
    .eq("project_process_item_id", projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessProtocol(data as ProjectProcessProtocolRow);
}

export async function saveProtocolFieldValues(
  projectProcessItemId: string,
  fieldValues: Record<string, ProtocolFieldValue>,
  notes?: string,
): Promise<ProjectProcessProtocol> {
  await ensureProtocolRow(projectProcessItemId);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("project_process_protocols")
    .update({
      field_values: fieldValues,
      ...(notes !== undefined ? { notes } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("project_process_item_id", projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessProtocol(data as ProjectProcessProtocolRow);
}

async function setProtocolSignature(
  projectProcessItemId: string,
  which: "company" | "client",
  signature: ProtocolSignature | null,
): Promise<ProjectProcessProtocol> {
  await ensureProtocolRow(projectProcessItemId);
  const supabase = getSupabase();
  const update =
    which === "company"
      ? { company_signature: signature, updated_at: new Date().toISOString() }
      : { client_signature: signature, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("project_process_protocols")
    .update(update)
    .eq("project_process_item_id", projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessProtocol(data as ProjectProcessProtocolRow);
}

export function signProtocolAsCompany(projectProcessItemId: string, signature: ProtocolSignature) {
  return setProtocolSignature(projectProcessItemId, "company", signature);
}

export function signProtocolAsClient(projectProcessItemId: string, signature: ProtocolSignature) {
  return setProtocolSignature(projectProcessItemId, "client", signature);
}

export function clearProtocolSignature(projectProcessItemId: string, which: "company" | "client") {
  return setProtocolSignature(projectProcessItemId, which, null);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+);base64/.exec(meta ?? "");
  const mimeType = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function annotationPath(projectProcessItemId: string, page: number) {
  return `${projectProcessItemId}/annotations/page-${page}.png`;
}

/** Zapisuje (lub usuwa, gdy `dataUrl` to `null`) odręczną adnotację jednej strony wzoru PDF. */
export async function saveProtocolAnnotation(
  projectProcessItemId: string,
  page: number,
  dataUrl: string | null,
): Promise<ProjectProcessProtocol> {
  const row = await ensureProtocolRow(projectProcessItemId);
  const supabase = getSupabase();
  const path = annotationPath(projectProcessItemId, page);
  const existingAnnotations = Array.isArray(row.annotations)
    ? (row.annotations as ProtocolAnnotation[])
    : [];

  let nextAnnotations: ProtocolAnnotation[];
  if (dataUrl) {
    const blob = dataUrlToBlob(dataUrl);
    const { error: uploadError } = await supabase.storage
      .from(PROCESS_PROTOCOLS_BUCKET)
      .upload(path, blob, { contentType: "image/png", upsert: true });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    nextAnnotations = [
      ...existingAnnotations.filter((entry) => entry.page !== page),
      { page, imagePath: path },
    ];
  } else {
    await supabase.storage.from(PROCESS_PROTOCOLS_BUCKET).remove([path]);
    nextAnnotations = existingAnnotations.filter((entry) => entry.page !== page);
  }

  const { data, error } = await supabase
    .from("project_process_protocols")
    .update({ annotations: nextAnnotations, updated_at: new Date().toISOString() })
    .eq("project_process_item_id", projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessProtocol(data as ProjectProcessProtocolRow);
}

export async function getProtocolAnnotationUrl(path: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(PROCESS_PROTOCOLS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}

async function downloadStorageFile(bucket: string, path: string): Promise<ArrayBuffer> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(error?.message ?? `Nie udało się pobrać pliku ${path}.`);
  }
  return data.arrayBuffer();
}

/**
 * Akceptuje protokół: generuje finalny PDF (wzór + odręczne adnotacje + podpisy, albo — dla
 * szablonów bez oryginału — czysty raport z wartości pól), zapisuje go w Storage, dopina jako
 * dokument projektu (zakładka „Dokumenty”) i blokuje protokół do edycji.
 */
export async function acceptProtocol(
  protocol: ProjectProcessProtocol,
  template: ProtocolTemplate | null,
  projectId: string,
  actorName: string,
): Promise<{ protocol: ProjectProcessProtocol; documentId: string }> {
  if (!protocol.companySignature || !protocol.clientSignature) {
    throw new Error("Do akceptacji protokołu wymagane są oba podpisy.");
  }

  const { generateAnnotatedProtocolPdf, generateFieldReportPdf } = await import(
    "@/lib/process/protocol-pdf"
  );
  const acceptedAt = new Date().toISOString();
  const acceptedBy = actorName.trim() || "Przedstawiciel firmy";

  let pdfBytes: Uint8Array;
  if (template?.source === "pdf" && template.referencePdfPath) {
    const originalPdfBytes = await downloadStorageFile(PROCESS_PROTOCOLS_BUCKET, template.referencePdfPath);
    const pageAnnotationBytes = new Map<number, Uint8Array>();
    for (const annotation of protocol.annotations) {
      const bytes = await downloadStorageFile(PROCESS_PROTOCOLS_BUCKET, annotation.imagePath);
      pageAnnotationBytes.set(annotation.page, new Uint8Array(bytes));
    }
    pdfBytes = await generateAnnotatedProtocolPdf({
      originalPdfBytes,
      pageAnnotationBytes,
      companySignature: protocol.companySignature,
      clientSignature: protocol.clientSignature,
      acceptedAt,
      acceptedBy,
    });
  } else {
    pdfBytes = await generateFieldReportPdf({
      templateName: template?.name ?? "Protokół",
      fields: template?.fields ?? [],
      fieldValues: protocol.fieldValues,
      notes: protocol.notes,
      companySignature: protocol.companySignature,
      clientSignature: protocol.clientSignature,
      acceptedAt,
      acceptedBy,
    });
  }

  const supabase = getSupabase();
  const generatedPath = `${protocol.projectProcessItemId}/generated/${Date.now()}.pdf`;
  const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const { error: uploadError } = await supabase.storage
    .from(PROCESS_PROTOCOLS_BUCKET)
    .upload(generatedPath, pdfBlob, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { createProjectDocument } = await import("@/lib/supabase/project-document-repository");
  const fileName = `Protokol-${(template?.name ?? "protokol").replace(/[^a-zA-Z0-9-_]+/g, "_")}.pdf`;
  const file = new File([pdfBlob], fileName, { type: "application/pdf" });
  const document = await createProjectDocument(
    {
      projectId,
      category: "protocol",
      title: `Protokół — ${template?.name ?? "wzór"} — ${acceptedAt.slice(0, 10)}`,
      source: "manual",
    },
    acceptedBy,
    file,
  );

  const { data, error } = await supabase
    .from("project_process_protocols")
    .update({
      generated_pdf_path: generatedPath,
      accepted_at: acceptedAt,
      accepted_by: acceptedBy,
      linked_document_id: document.id,
      updated_at: acceptedAt,
    })
    .eq("project_process_item_id", protocol.projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { protocol: rowToProjectProcessProtocol(data as ProjectProcessProtocolRow), documentId: document.id };
}

/** Odblokowuje protokół do dalszej edycji (administrator) — nie usuwa już wygenerowanego dokumentu. */
export async function unacceptProtocol(projectProcessItemId: string): Promise<ProjectProcessProtocol> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_protocols")
    .update({
      generated_pdf_path: null,
      accepted_at: null,
      accepted_by: null,
      linked_document_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("project_process_item_id", projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessProtocol(data as ProjectProcessProtocolRow);
}
