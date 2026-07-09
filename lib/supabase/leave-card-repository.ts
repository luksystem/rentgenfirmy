import { getSupabase } from "@/lib/supabase/client";

export const LEAVE_CARDS_BUCKET = "leave-cards";

export async function uploadLeaveCardTemplate(file: File): Promise<{ path: string; name: string }> {
  const supabase = getSupabase();
  const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const storagePath = `templates/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(LEAVE_CARDS_BUCKET)
    .upload(storagePath, file, { contentType: file.type || "application/pdf", upsert: false });

  if (error) {
    throw new Error(error.message);
  }

  return { path: storagePath, name: file.name };
}

export async function removeLeaveCardFile(path: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.storage.from(LEAVE_CARDS_BUCKET).remove([path]);
}

export async function getLeaveCardSignedUrl(path: string, expiresInSeconds = 60 * 60): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(LEAVE_CARDS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}
