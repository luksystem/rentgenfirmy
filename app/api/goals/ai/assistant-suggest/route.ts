import { NextResponse } from "next/server";
import { suggestGoalsForProject } from "@/lib/ai/goal-project-assistant";
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
  const projectName = typeof data.projectName === "string" ? data.projectName : "";
  const clientName = typeof data.clientName === "string" ? data.clientName : null;
  const projectType = typeof data.projectType === "string" ? data.projectType : "";
  const stageTitle = typeof data.stageTitle === "string" ? data.stageTitle : null;
  const stageDescription = typeof data.stageDescription === "string" ? data.stageDescription : null;
  const existingGoalTitles = Array.isArray(data.existingGoalTitles)
    ? data.existingGoalTitles.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (!projectName.trim()) {
    return NextResponse.json({ error: "Brak nazwy projektu." }, { status: 400 });
  }

  try {
    const methodologies = await fetchActiveGoalMethodologiesAdmin();
    const goals = await suggestGoalsForProject({
      projectName,
      clientName,
      projectType,
      stageTitle,
      stageDescription,
      existingGoalTitles,
      methodologies: methodologies.map((entry) => ({
        code: entry.code,
        name: entry.name,
        shortDescription: entry.shortDescription,
        whenToUse: entry.whenToUse,
      })),
    });
    return NextResponse.json({ goals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wygenerować propozycji celów." },
      { status: 500 },
    );
  }
}
