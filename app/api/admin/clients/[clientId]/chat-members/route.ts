import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import {
  addClientChatMemberServer,
  fetchClientChatMembersServer,
} from "@/lib/supabase/chat-client-members-server";

export async function GET(_request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    await requireAdministratorProfile();
    const { clientId } = await params;
    const admin = getSupabaseAdmin();
    const members = await fetchClientChatMembersServer(admin, clientId);

    const profileIds = members.map((m) => m.profileId);
    const { data: profiles, error } = profileIds.length
      ? await admin.from("profiles").select("*").in("id", profileIds)
      : { data: [], error: null };
    if (error) throw new Error(error.message);

    return NextResponse.json({
      members: members.map((member) => ({
        ...member,
        profile: (profiles ?? []).map(mapProfileRow).find((p) => p.id === member.profileId) ?? null,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    await requireAdministratorProfile();
    const { clientId } = await params;
    const body = (await request.json()) as { profileId?: string; isPrimary?: boolean };
    if (!body.profileId) {
      return NextResponse.json({ error: "Podaj profil kontaktu klienta." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const member = await addClientChatMemberServer(admin, clientId, body.profileId, body.isPrimary ?? false);
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
