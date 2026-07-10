import { getSupabase } from "@/lib/supabase/client";

const TABLE = "user_nav_favorites";

export async function fetchNavFavoriteHrefs(userId: string): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("href")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.href);
}

export async function addNavFavorite(userId: string, href: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, href }, { onConflict: "user_id,href", ignoreDuplicates: true });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeNavFavorite(userId: string, href: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).delete().eq("user_id", userId).eq("href", href);

  if (error) {
    throw new Error(error.message);
  }
}
