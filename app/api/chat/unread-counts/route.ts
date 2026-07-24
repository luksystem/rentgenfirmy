import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();

    const { data: memberRows, error: memberError } = await admin
      .from("chat_room_members")
      .select("room_id, last_read_at")
      .eq("profile_id", userId);
    if (memberError) throw new Error(memberError.message);

    const rooms = await Promise.all(
      (memberRows ?? []).map(async (member) => {
        let query = admin
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", member.room_id)
          .eq("is_deleted", false)
          .neq("author_id", userId);
        if (member.last_read_at) {
          query = query.gt("created_at", member.last_read_at);
        }
        const { count, error } = await query;
        if (error) throw new Error(error.message);
        return { roomId: member.room_id as string, unreadCount: count ?? 0 };
      }),
    );

    const total = rooms.reduce((sum, room) => sum + room.unreadCount, 0);
    return NextResponse.json({ rooms, total });
  } catch (error) {
    return jsonError(error);
  }
}
