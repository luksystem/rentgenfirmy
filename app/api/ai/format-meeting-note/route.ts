import { NextResponse } from "next/server";
import { formatMeetingNoteWithAi } from "@/lib/ai/meeting-note-formatter";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawNotes = typeof data.rawNotes === "string" ? data.rawNotes : "";

  try {
    const formatted = await formatMeetingNoteWithAi(rawNotes);
    return NextResponse.json({ formatted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się sformatować notatek." },
      { status: 500 },
    );
  }
}
