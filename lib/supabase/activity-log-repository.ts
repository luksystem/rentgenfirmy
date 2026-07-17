import { activityLogInsertPayload } from "@/lib/activity-log/payload";
import type { ActivityLogInput } from "@/lib/activity-log/types";
import { getSupabase } from "@/lib/supabase/client";

/** Zapis z klienta (sesja użytkownika). Nie rzuca — mutacje biznesowe nie zależą od logu. */
export async function logActivity(input: ActivityLogInput): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("activity_log").insert(activityLogInsertPayload(input));
    if (error) {
      console.error("[activity_log]", error.message);
    }
  } catch (error) {
    console.error("[activity_log]", error);
  }
}
