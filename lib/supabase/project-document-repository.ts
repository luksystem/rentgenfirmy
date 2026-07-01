import {
  PROJECT_DOCUMENTS_BUCKET,
  PROJECT_DOCUMENTS_SIGNED_URL_TTL_SEC,
  validateProjectDocumentFile,
} from "@/lib/documents/attachments";
import {
  normalizeProjectDocumentInput,
  type ProjectDocument,
  type ProjectDocumentCategory,
  type ProjectDocumentInput,
  type ProjectDocumentSource,
} from "@/lib/documents/types";
import { getSupabase } from "@/lib/supabase/client";

type DocumentRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  category: string;
  title: string;
  description: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  source: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

function isCategory(value: string): value is ProjectDocumentCategory {
  return (
    value === "photo" ||
    value === "scan" ||
    value === "pdf" ||
    value === "plan" ||
    value === "protocol" ||
    value === "other"
  );
}

function isSource(value: string): value is ProjectDocumentSource {
  return value === "manual" || value === "kanban";
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
  if (mimeType === "image/gif") {
    return "gif";
  }
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return "heic";
  }
  return "bin";
}

export function rowToProjectDocument(row: DocumentRow): ProjectDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    category: isCategory(row.category) ? row.category : "other",
    title: row.title,
    description: row.description,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    source: isSource(row.source) ? row.source : "manual",
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fileUrl: null,
  };
}

export async function attachSignedUrlsToProjectDocuments(
  documents: ProjectDocument[],
): Promise<ProjectDocument[]> {
  if (!documents.length) {
    return documents;
  }

  const supabase = getSupabase();
  return Promise.all(
    documents.map(async (document) => {
      if (!document.storagePath) {
        return document;
      }

      const { data, error } = await supabase.storage
        .from(PROJECT_DOCUMENTS_BUCKET)
        .createSignedUrl(document.storagePath, PROJECT_DOCUMENTS_SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        return document;
      }

      return { ...document, fileUrl: data.signedUrl };
    }),
  );
}

export async function fetchProjectDocuments(options?: {
  projectId?: string;
  clientId?: string;
  category?: ProjectDocumentCategory;
}) {
  const supabase = getSupabase();
  let query = supabase
    .from("project_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }
  if (options?.clientId) {
    query = query.eq("client_id", options.clientId);
  }
  if (options?.category) {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  const documents = (data ?? []).map((row) => rowToProjectDocument(row as DocumentRow));
  return attachSignedUrlsToProjectDocuments(documents);
}

export async function createProjectDocument(
  input: ProjectDocumentInput,
  createdByName: string,
  file: File,
) {
  validateProjectDocumentFile(file);

  const normalized = normalizeProjectDocumentInput(input);
  if (!normalized.title) {
    throw new Error("Podaj tytuł dokumentu.");
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const documentId = crypto.randomUUID();
  const extension = extensionForMimeType(file.type);
  const storagePath = `${documentId}/${crypto.randomUUID()}.${extension}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      id: documentId,
      project_id: normalized.projectId,
      client_id: normalized.clientId,
      category: normalized.category,
      title: normalized.title,
      description: normalized.description ?? "",
      storage_path: storagePath,
      file_name: file.name.trim() || `dokument.${extension}`,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      source: normalized.source ?? "manual",
      created_by_name: createdByName.trim() || "Zespół",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(PROJECT_DOCUMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  const [withUrl] = await attachSignedUrlsToProjectDocuments([
    rowToProjectDocument(data as DocumentRow),
  ]);
  return withUrl;
}

export async function deleteProjectDocument(documentId: string) {
  const supabase = getSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("project_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const { error } = await supabase.from("project_documents").delete().eq("id", documentId);

  if (error) {
    throw new Error(error.message);
  }

  const storagePath = (existing as { storage_path?: string | null } | null)?.storage_path;
  if (storagePath) {
    await supabase.storage.from(PROJECT_DOCUMENTS_BUCKET).remove([storagePath]);
  }
}
