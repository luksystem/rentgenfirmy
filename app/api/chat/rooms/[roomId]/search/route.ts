import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertChatRoomMember } from "@/lib/chat/room-access";

export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const { userId } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    await assertChatRoomMember(admin, userId, roomId);

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ messages: [] });
    }

    const { data, error } = await admin
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .ilike("body", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    return NextResponse.json({ messages: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}
