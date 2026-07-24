import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { getUserDisplayName, USER_ROLES, type UserRole } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { assertCanManageChatRoom } from "@/lib/chat/room-access";
import { notifyChatRoomInvite } from "@/lib/notifications/chat-message";
import { getAppBaseUrl } from "@/lib/messages/app-url";

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const actor = await requireAuthenticatedProfile();
    const body = (await request.json()) as {
      profileId?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
    };

    const admin = getSupabaseAdmin();
    await assertCanManageChatRoom(admin, actor.userId, roomId);

    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .select("id, name, kind, project_id")
      .eq("id", roomId)
      .maybeSingle();
    if (roomError) throw new Error(roomError.message);
    if (!room) {
      return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
    }
    if (room.kind === "client") {
      throw new HttpError(
        400,
        "Uczestnikami pokoju Klient zarządza się przez ustawienia klienta (kontakty klienta).",
      );
    }

    let profileId = body.profileId?.trim();

    if (!profileId) {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "Podaj użytkownika lub e-mail zaproszenia." }, { status: 400 });
      }

      const { data: existingProfile, error: existingError } = await admin
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);

      if (existingProfile) {
        profileId = existingProfile.id;
      } else {
        const role: UserRole = body.role && USER_ROLES.includes(body.role) ? body.role : "gosc";
        const metadata = {
          first_name: body.firstName?.trim() ?? "",
          last_name: body.lastName?.trim() ?? "",
          phone: "",
          role,
        };

        const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
          data: metadata,
          redirectTo: `${getAppBaseUrl()}/auth/callback?next=/konto/haslo`,
        });
        if (inviteError || !invited.user) {
          throw new Error(inviteError?.message ?? "Nie udało się wysłać zaproszenia.");
        }
        profileId = invited.user.id;

        await admin
          .from("profiles")
          .upsert(
            {
              id: profileId,
              email,
              first_name: metadata.first_name,
              last_name: metadata.last_name,
              role,
              is_active: true,
            },
            { onConflict: "id" },
          );
      }
    }

    const { data: profileRow, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profileRow) {
      return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 });
    }

    const { data: member, error: memberError } = await admin
      .from("chat_room_members")
      .upsert(
        { room_id: roomId, profile_id: profileId, added_by: actor.userId },
        { onConflict: "room_id,profile_id" },
      )
      .select("*")
      .single();
    if (memberError) throw new Error(memberError.message);

    const linkUrl = `/czat/${roomId}`;
    await notifyChatRoomInvite({
      admin,
      profileId,
      roomName: room.name,
      invitedByName: getUserDisplayName(actor.profile),
      linkUrl,
    }).catch(() => undefined);

    return NextResponse.json({ member, profile: mapProfileRow(profileRow) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
