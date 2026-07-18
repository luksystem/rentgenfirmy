import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth/types";
import { hasFullAppAccess } from "@/lib/auth/types";

type AdminClient = SupabaseClient;

export type WorkMission = {
  id: string;
  userId: string;
  title: string;
  description: string;
  projectId: string | null;
  clientId: string | null;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "cancelled";
};

function mapMissionRow(row: {
  id: string;
  user_id: string;
  title: string;
  description: string;
  project_id: string | null;
  client_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
}): WorkMission {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    projectId: row.project_id,
    clientId: row.client_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as WorkMission["status"],
  };
}

export async function fetchWorkMissionsForUserServer(
  admin: AdminClient,
  actor: UserProfile,
  date?: string,
  targetUserId?: string,
): Promise<WorkMission[]> {
  const userId = targetUserId ?? actor.id;
  if (userId !== actor.id && !hasFullAppAccess(actor.role)) {
    throw new Error("Brak uprawnień do podglądu misji innego użytkownika.");
  }

  let query = admin
    .from("work_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (date) {
    query = query.lte("start_date", date).gte("end_date", date);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapMissionRow);
}
