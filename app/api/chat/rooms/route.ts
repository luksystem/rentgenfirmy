import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertCanManageChatProject } from "@/lib/chat/room-access";
import { slugifyRoomName } from "@/lib/chat/types";

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const body = (await request.json()) as { projectId?: string; name?: string };
    const projectId = body.projectId?.trim();
    const name = body.name?.trim();

    if (!projectId || !name) {
      return NextResponse.json({ error: "Podaj projekt i nazwę pokoju." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    await assertCanManageChatProject(admin, userId, projectId);

    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id, client_id")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) throw new Error(projectError.message);
    if (!project) {
      return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
    }

    const baseSlug = slugifyRoomName(name);
    let slug = baseSlug;
    let attempt = 1;
    while (true) {
      const { data: existing, error: existingError } = await admin
        .from("chat_rooms")
        .select("id")
        .eq("project_id", projectId)
        .eq("slug", slug)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (!existing) break;
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const { data: room, error: insertError } = await admin
      .from("chat_rooms")
      .insert({
        project_id: projectId,
        client_id: project.client_id,
        kind: "custom",
        name,
        slug,
        created_by: userId,
      })
      .select("*")
      .single();
    if (insertError) throw new Error(insertError.message);

    await admin.from("chat_room_members").insert({
      room_id: room.id,
      profile_id: userId,
      role_in_room: "owner",
      added_by: userId,
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
