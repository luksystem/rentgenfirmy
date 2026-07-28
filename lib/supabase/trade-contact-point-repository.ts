import type {
  TradeContactPoint,
  TradeContactPointInput,
} from "@/lib/dashboard/trade-contact-point-types";
import { normalizeTradeContactPointInput } from "@/lib/dashboard/trade-contact-point-types";
import type { ProjectAgreementCategory } from "@/lib/dashboard/agreement-types";
import {
  AGREEMENT_IMAGE_MAX_BYTES,
  AGREEMENT_IMAGE_MIME_TYPES,
  extensionForAgreementMimeType,
} from "@/lib/dashboard/agreement-attachments";
import { getSupabase } from "@/lib/supabase/client";

export const CONTACT_POINT_PHOTOS_BUCKET = "contact-point-photos";
const CONTACT_POINT_PHOTO_SIGNED_URL_TTL_SEC = 60 * 60;

type ContactPointRow = {
  id: string;
  project_type: string;
  trade_names: string[] | null;
  title: string;
  description: string;
  category: string;
  blocking_stage_id: string | null;
  blocks_next_stage: boolean;
  photo_storage_path: string | null;
  photo_file_name: string | null;
  photo_mime_type: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

const CATEGORIES: ProjectAgreementCategory[] = [
  "integration",
  "specification",
  "change",
  "handover",
  "warranty",
  "other",
];

function isCategory(value: string): value is ProjectAgreementCategory {
  return (CATEGORIES as string[]).includes(value);
}

function rowToContactPoint(row: ContactPointRow): TradeContactPoint {
  return {
    id: row.id,
    projectType: row.project_type,
    tradeNames: Array.isArray(row.trade_names) ? row.trade_names.filter(Boolean) : [],
    title: row.title,
    description: row.description,
    category: isCategory(row.category) ? row.category : "integration",
    blockingStageId: row.blocking_stage_id,
    blocksNextStage: Boolean(row.blocks_next_stage),
    photoStoragePath: row.photo_storage_path,
    photoFileName: row.photo_file_name,
    photoMimeType: row.photo_mime_type,
    isActive: row.is_active,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchTradeContactPoints(): Promise<TradeContactPoint[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("trade_contact_points")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToContactPoint(row as ContactPointRow));
}

export async function createTradeContactPoint(
  input: TradeContactPointInput,
): Promise<TradeContactPoint> {
  const normalized = normalizeTradeContactPointInput(input);
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: lastRow } = await supabase
    .from("trade_contact_points")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((lastRow as { position?: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("trade_contact_points")
    .insert({
      id: crypto.randomUUID(),
      project_type: normalized.projectType,
      trade_names: normalized.tradeNames,
      title: normalized.title,
      description: normalized.description,
      category: normalized.category,
      blocking_stage_id: normalized.blockingStageId,
      blocks_next_stage: normalized.blocksNextStage,
      is_active: normalized.isActive ?? true,
      position,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContactPoint(data as ContactPointRow);
}

export async function updateTradeContactPoint(
  id: string,
  input: TradeContactPointInput,
): Promise<TradeContactPoint> {
  const normalized = normalizeTradeContactPointInput(input);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("trade_contact_points")
    .update({
      project_type: normalized.projectType,
      trade_names: normalized.tradeNames,
      title: normalized.title,
      description: normalized.description,
      category: normalized.category,
      blocking_stage_id: normalized.blockingStageId,
      blocks_next_stage: normalized.blocksNextStage,
      is_active: normalized.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContactPoint(data as ContactPointRow);
}

export async function deleteTradeContactPoint(id: string): Promise<void> {
  const supabase = getSupabase();
  const { data: row } = await supabase
    .from("trade_contact_points")
    .select("photo_storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("trade_contact_points").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  if (row?.photo_storage_path) {
    await supabase.storage.from(CONTACT_POINT_PHOTOS_BUCKET).remove([row.photo_storage_path]);
  }
}

export async function uploadTradeContactPointPhoto(
  id: string,
  file: File,
): Promise<TradeContactPoint> {
  if (!AGREEMENT_IMAGE_MIME_TYPES.includes(file.type as (typeof AGREEMENT_IMAGE_MIME_TYPES)[number])) {
    throw new Error("Dozwolone są tylko zdjęcia (JPG, PNG, WebP, GIF).");
  }
  if (file.size > AGREEMENT_IMAGE_MAX_BYTES) {
    throw new Error("Zdjęcie może mieć maksymalnie 10 MB.");
  }

  const supabase = getSupabase();
  const { data: existingRow } = await supabase
    .from("trade_contact_points")
    .select("photo_storage_path")
    .eq("id", id)
    .maybeSingle();

  const extension = extensionForAgreementMimeType(file.type);
  const storagePath = `${id}/${crypto.randomUUID()}.${extension}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(CONTACT_POINT_PHOTOS_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await supabase
    .from("trade_contact_points")
    .update({
      photo_storage_path: storagePath,
      photo_file_name: file.name.trim() || `zdjecie.${extension}`,
      photo_mime_type: file.type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(CONTACT_POINT_PHOTOS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  const previousPath = (existingRow as { photo_storage_path?: string | null } | null)
    ?.photo_storage_path;
  if (previousPath && previousPath !== storagePath) {
    await supabase.storage.from(CONTACT_POINT_PHOTOS_BUCKET).remove([previousPath]);
  }

  return rowToContactPoint(data as ContactPointRow);
}

export async function removeTradeContactPointPhoto(id: string): Promise<TradeContactPoint> {
  const supabase = getSupabase();
  const { data: existingRow } = await supabase
    .from("trade_contact_points")
    .select("photo_storage_path")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("trade_contact_points")
    .update({
      photo_storage_path: null,
      photo_file_name: null,
      photo_mime_type: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const previousPath = (existingRow as { photo_storage_path?: string | null } | null)
    ?.photo_storage_path;
  if (previousPath) {
    await supabase.storage.from(CONTACT_POINT_PHOTOS_BUCKET).remove([previousPath]);
  }

  return rowToContactPoint(data as ContactPointRow);
}

export async function getTradeContactPointPhotoUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(CONTACT_POINT_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, CONTACT_POINT_PHOTO_SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

export async function downloadTradeContactPointPhoto(storagePath: string): Promise<Blob> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(CONTACT_POINT_PHOTOS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? "Nie udało się pobrać zdjęcia punktu styku.");
  }
  return data;
}
