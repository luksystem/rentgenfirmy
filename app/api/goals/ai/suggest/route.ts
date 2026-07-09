import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { generateGoalAiAdvice } from "@/lib/ai/goal-ai-advisor";
import {
  fetchActiveGoalMethodologiesAdmin,
  fetchGoalReviewContextAdmin,
  insertGoalAiSuggestionAdmin,
} from "@/lib/supabase/goal-ai-server";
import { GOAL_LEVELS, type GoalAiAdviceResponse, type GoalLevel } from "@/lib/goals/types";

const BOARD_KIND_LABELS: Record<string, string> = {
  sales: "Sprzedaż",
  project: "Projekty",
  service: "Serwis",
  quality: "Jakość",
  development: "Rozwój",
  financial: "Finanse",
  executive: "Zarząd",
  marketing: "Marketing",
  training: "Szkolenia",
};

export async function POST(request: Request) {
  let session: Awaited<ReturnType<typeof requireAuthenticatedProfile>>;
  try {
    session = await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania." }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const boardKind = typeof data.boardKind === "string" ? data.boardKind : undefined;
  const goalId = typeof data.goalId === "string" ? data.goalId : undefined;
  const trigger = data.trigger === "review" ? "review" : "create";
  const levelRaw = typeof data.level === "string" ? data.level : undefined;
  const level = levelRaw && (GOAL_LEVELS as readonly string[]).includes(levelRaw)
    ? (levelRaw as GoalLevel)
    : undefined;

  if (!description) {
    return NextResponse.json({ error: "Podaj opis celu do analizy przez AI." }, { status: 400 });
  }
  if (trigger === "review" && !goalId) {
    return NextResponse.json(
      { error: "Brak identyfikatora celu (goalId) dla sugestii w trakcie trwania celu." },
      { status: 400 },
    );
  }

  try {
    const methodologies = await fetchActiveGoalMethodologiesAdmin();
    const reviewContext =
      trigger === "review" && goalId ? await fetchGoalReviewContextAdmin(goalId) : null;

    const advice = await generateGoalAiAdvice({
      description,
      level,
      boardKindLabel: boardKind ? BOARD_KIND_LABELS[boardKind] ?? boardKind : undefined,
      methodologies,
      trigger,
      reviewContext: reviewContext?.reviewContext,
    });

    const suggestionId = await insertGoalAiSuggestionAdmin({
      goalId: trigger === "review" ? goalId : null,
      trigger,
      inputDescription: description,
      suggestedMethodologyCode: advice.recommendedMethodologyCode,
      justification: advice.justification || null,
      alternatives: advice.alternatives,
      structure: advice.structure,
      ongoingAdjustment: advice.ongoingAdjustment,
      vagueWarning: advice.vagueWarningReason,
      createdBy: session.userId,
    });

    const recommendedMethodology = advice.recommendedMethodologyCode
      ? methodologies.find((entry) => entry.code === advice.recommendedMethodologyCode) ?? null
      : null;

    const response: GoalAiAdviceResponse = {
      suggestionId,
      recommendedMethodologyCode: advice.recommendedMethodologyCode,
      recommendedMethodologyName: recommendedMethodology?.name ?? null,
      justification: advice.justification,
      alternatives: advice.alternatives,
      isTooVague: advice.isTooVague,
      vagueWarningReason: advice.vagueWarningReason,
      structure: advice.structure,
      ongoingAdjustment: advice.ongoingAdjustment,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nie udało się wygenerować sugestii AI.",
      },
      { status: 500 },
    );
  }
}
