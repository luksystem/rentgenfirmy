import { getSupabase } from "@/lib/supabase/client";

const MAX_RECENT_SEARCHES = 8;

export async function fetchRecentOfferSearches(): Promise<string[]> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("offer_list_recent_searches")
    .select("query")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_RECENT_SEARCHES);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => row.query);
}

export async function recordOfferSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  await supabase
    .from("offer_list_recent_searches")
    .delete()
    .eq("profile_id", user.id)
    .eq("query", trimmed);

  await supabase.from("offer_list_recent_searches").insert({
    profile_id: user.id,
    query: trimmed,
  });

  const { data: existing } = await supabase
    .from("offer_list_recent_searches")
    .select("id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const staleIds = (existing ?? []).slice(MAX_RECENT_SEARCHES).map((row) => row.id);
  if (staleIds.length > 0) {
    await supabase.from("offer_list_recent_searches").delete().in("id", staleIds);
  }
}
