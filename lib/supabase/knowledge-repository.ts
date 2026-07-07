import type { KnowledgeChunkRow, KnowledgeSourceRow } from "@/lib/supabase/database.types";
import {
  DEFAULT_KNOWLEDGE_BASE_SETTINGS,
  normalizeKnowledgeBaseSettings,
  type KnowledgeBaseSettings,
} from "@/lib/knowledge/settings";
import type { KnowledgeChunk, KnowledgeSource, KnowledgeSourceType } from "@/lib/knowledge/types";
import { KNOWLEDGE_SOURCE_TYPES } from "@/lib/knowledge/types";
import { getSupabase } from "@/lib/supabase/client";

export const KNOWLEDGE_BASE_BUCKET = "knowledge-base";
export const KNOWLEDGE_BASE_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const KNOWLEDGE_BASE_SETTINGS_ID = "knowledge_base_settings";

function isKnowledgeSourceType(value: string): value is KnowledgeSourceType {
  return (KNOWLEDGE_SOURCE_TYPES as readonly string[]).includes(value);
}

function rowToKnowledgeSource(row: KnowledgeSourceRow): KnowledgeSource {
  return {
    id: row.id,
    type: isKnowledgeSourceType(row.type) ? row.type : "text",
    title: row.title,
    description: row.description,
    url: row.url,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    status:
      row.status === "processing" || row.status === "ready" || row.status === "error"
        ? row.status
        : "pending",
    errorMessage: row.error_message,
    charCount: row.char_count,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToKnowledgeChunk(row: KnowledgeChunkRow): KnowledgeChunk {
  return {
    id: row.id,
    sourceId: row.source_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function fetchKnowledgeSources(): Promise<KnowledgeSource[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("knowledge_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToKnowledgeSource(row as KnowledgeSourceRow));
}

export async function fetchKnowledgeChunksForSource(sourceId: string): Promise<KnowledgeChunk[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("knowledge_chunks")
    .select("*")
    .eq("source_id", sourceId)
    .order("chunk_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToKnowledgeChunk(row as KnowledgeChunkRow));
}

function extensionForFile(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) {
    return fromName;
  }
  return file.type === "application/pdf" ? "pdf" : "txt";
}

/** Tworzy wpis źródła z przesłanym plikiem (PDF / TXT / eksport WhatsApp). */
export async function createKnowledgeSourceFromFile(input: {
  type: "pdf" | "text" | "whatsapp";
  title: string;
  description?: string;
  file: File;
  createdByName: string;
}): Promise<KnowledgeSource> {
  if (input.file.size > KNOWLEDGE_BASE_MAX_FILE_SIZE_BYTES) {
    throw new Error("Plik jest zbyt duży (limit 25 MB).");
  }

  const supabase = getSupabase();
  const sourceId = crypto.randomUUID();
  const extension = extensionForFile(input.file);
  const storagePath = `${sourceId}/${crypto.randomUUID()}.${extension}`;
  const buffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(KNOWLEDGE_BASE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("knowledge_sources")
    .insert({
      id: sourceId,
      type: input.type,
      title: input.title.trim() || input.file.name,
      description: input.description?.trim() ?? "",
      storage_path: storagePath,
      file_name: input.file.name,
      mime_type: input.file.type || "application/octet-stream",
      size_bytes: input.file.size,
      status: "pending",
      created_by_name: input.createdByName.trim() || "Zespół",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(KNOWLEDGE_BASE_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return rowToKnowledgeSource(data as KnowledgeSourceRow);
}

/** Tworzy wpis źródła typu link / YouTube (bez uploadu pliku). */
export async function createKnowledgeSourceFromUrl(input: {
  type: "link" | "youtube";
  title: string;
  description?: string;
  url: string;
  createdByName: string;
}): Promise<KnowledgeSource> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("knowledge_sources")
    .insert({
      type: input.type,
      title: input.title.trim() || input.url,
      description: input.description?.trim() ?? "",
      url: input.url.trim(),
      status: "pending",
      created_by_name: input.createdByName.trim() || "Zespół",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToKnowledgeSource(data as KnowledgeSourceRow);
}

export async function markKnowledgeSourcePending(sourceId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("knowledge_sources")
    .update({ status: "pending", error_message: null, updated_at: new Date().toISOString() })
    .eq("id", sourceId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteKnowledgeSource(sourceId: string) {
  const supabase = getSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("knowledge_sources")
    .select("storage_path")
    .eq("id", sourceId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const { error } = await supabase.from("knowledge_sources").delete().eq("id", sourceId);
  if (error) {
    throw new Error(error.message);
  }

  const storagePath = (existing as { storage_path?: string | null } | null)?.storage_path;
  if (storagePath) {
    await supabase.storage.from(KNOWLEDGE_BASE_BUCKET).remove([storagePath]);
  }
}

export async function fetchKnowledgeBaseSettings(): Promise<KnowledgeBaseSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", KNOWLEDGE_BASE_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return DEFAULT_KNOWLEDGE_BASE_SETTINGS;
  }

  return normalizeKnowledgeBaseSettings(data.data as Partial<KnowledgeBaseSettings>);
}

export async function saveKnowledgeBaseSettings(
  settings: KnowledgeBaseSettings,
): Promise<KnowledgeBaseSettings> {
  const supabase = getSupabase();
  const normalized = normalizeKnowledgeBaseSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: KNOWLEDGE_BASE_SETTINGS_ID,
        data: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeKnowledgeBaseSettings(data.data as Partial<KnowledgeBaseSettings>);
}
