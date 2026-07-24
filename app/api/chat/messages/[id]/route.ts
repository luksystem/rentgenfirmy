import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function loadMessage(admin: ReturnType<typeof getSupabaseAdmin>, id: string) {
  const { data, error } = await admin
    .from("chat_messages")
    .select("id, room_id, author_id, body, is_deleted")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function assertCanEdit(actorId: string, isAdministrator: boolean, message: { author_id: string | null }) {
  if (isAdministrator || message.author_id === actorId) {
    return;
  }
  throw new HttpError(403, "Możesz edytować tylko własne wiadomości.");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requireAuthenticatedProfile();
    const body = (await request.json()) as { body?: string };
    const nextBody = body.body?.trim();
    if (!nextBody) {
      return NextResponse.json({ error: "Treść wiadomości nie może być pusta." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const message = await loadMessage(admin, id);
    if (!message) {
      return NextResponse.json({ error: "Nie znaleziono wiadomości." }, { status: 404 });
    }
    if (message.is_deleted) {
      throw new HttpError(400, "Nie można edytować usuniętej wiadomości.");
    }
    assertCanEdit(actor.userId, actor.profile.role === "administrator", message);

    await admin.from("chat_message_edits").insert({
      message_id: id,
      previous_body: message.body,
      edited_by: actor.userId,
    });

    const { data: updated, error: updateError } = await admin
      .from("chat_messages")
      .update({ body: nextBody, is_edited: true, edited_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ message: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const message = await loadMessage(admin, id);
    if (!message) {
      return NextResponse.json({ error: "Nie znaleziono wiadomości." }, { status: 404 });
    }
    assertCanEdit(actor.userId, actor.profile.role === "administrator", message);

    const { error: updateError } = await admin
      .from("chat_messages")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
