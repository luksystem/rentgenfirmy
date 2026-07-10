import { NextResponse } from "next/server";
import { generateGoalsFromNotes } from "@/lib/ai/goal-bulk-generator";
import { fetchActiveGoalMethodologiesAdmin } from "@/lib/supabase/goal-ai-server";
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
  const notesText = typeof data.notesText === "string" ? data.notesText : "";
  const boardKindLabel = typeof data.boardKindLabel === "string" ? data.boardKindLabel : "Cele";

  try {
    const methodologies = await fetchActiveGoalMethodologiesAdmin();
    const goals = await generateGoalsFromNotes(notesText, {
      methodologies: methodologies.map((entry) => ({
        code: entry.code,
        name: entry.name,
        shortDescription: entry.shortDescription,
        whenToUse: entry.whenToUse,
      })),
      boardKindLabel,
    });
    return NextResponse.json({ goals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wygenerować celów." },
      { status: 500 },
    );
  }
}
