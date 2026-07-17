import { NextResponse } from "next/server";
import { notifyTeamAboutChangeRequestDecision } from "@/lib/notifications/change-request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server-auth";

/** Powiadomienie zespołu po decyzji klienta (ścieżka zalogowana / store). */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("project_change_requests")
      .select("id, project_id, title, status, client_response_name")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Nie znaleziono zmiany." }, { status: 404 });
    }

    if (data.status !== "accepted" && data.status !== "rejected") {
      return NextResponse.json({ error: "Zmiana nie ma jeszcze decyzji." }, { status: 400 });
    }

    await notifyTeamAboutChangeRequestDecision({
      changeRequestId: data.id as string,
      projectId: data.project_id as string,
      title: data.title as string,
      accepted: data.status === "accepted",
      clientResponseName: (data.client_response_name as string | null) || "Klient",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd powiadomienia." },
      { status: 500 },
    );
  }
}
