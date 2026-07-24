import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { removeClientChatMemberServer } from "@/lib/supabase/chat-client-members-server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clientId: string; profileId: string }> },
) {
  try {
    await requireAdministratorProfile();
    const { clientId, profileId } = await params;
    const admin = getSupabaseAdmin();
    await removeClientChatMemberServer(admin, clientId, profileId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
