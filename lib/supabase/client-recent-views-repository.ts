import { getSupabase } from "@/lib/supabase/client";
import type { ClientRecentViewRow } from "@/lib/supabase/database.types";

export type ClientRecentView = {
  clientId: string;
  viewCount: number;
  lastViewedAt: string | null;
  pinnedAt: string | null;
};

function rowToClientRecentView(row: ClientRecentViewRow): ClientRecentView {
  return {
    clientId: row.client_id,
    viewCount: row.view_count,
    lastViewedAt: row.last_viewed_at,
    pinnedAt: row.pinned_at,
  };
}

export async function fetchClientRecentViews(userId: string): Promise<ClientRecentView[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("client_recent_views")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToClientRecentView);
}

export async function recordClientView(clientId: string): Promise<ClientRecentView> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("record_client_view", { p_client_id: clientId });

  if (error) {
    throw new Error(error.message);
  }

  return rowToClientRecentView(data);
}

export async function setClientPin(
  userId: string,
  clientId: string,
  pinned: boolean,
): Promise<ClientRecentView> {
  const supabase = getSupabase();

  if (pinned) {
    const { data, error } = await supabase
      .from("client_recent_views")
      .upsert(
        { user_id: userId, client_id: clientId, pinned_at: new Date().toISOString() },
        { onConflict: "user_id,client_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return rowToClientRecentView(data);
  }

  const { data, error } = await supabase
    .from("client_recent_views")
    .update({ pinned_at: null })
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data
    ? rowToClientRecentView(data)
    : { clientId, viewCount: 0, lastViewedAt: null, pinnedAt: null };
}
