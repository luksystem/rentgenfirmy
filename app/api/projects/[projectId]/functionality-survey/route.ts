import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { suggestFunctionalityWithAi } from "@/lib/client-functionality/ai-suggestions";
import {
  ensureFunctionalitySurvey,
  fetchFunctionalitySurveyBundle,
  markFunctionalitySurveyTeamReviewed,
  regenerateFunctionalityTasks,
  updateFunctionalitySurveyAiSuggestions,
  updateFunctionalitySurveyExtraQuestions,
  updateFunctionalitySurveyStatus,
  updateFunctionalityTaskStatus,
} from "@/lib/supabase/project-functionality-survey-server";
import { fetchProjectSpecificationItems } from "@/lib/supabase/project-specification-repository";
import { fetchSpecificationCatalog } from "@/lib/supabase/project-specification-repository";
import type { FunctionalityAiSuggestion, FunctionalityTaskStatus } from "@/lib/client-functionality/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  const { projectId } = await context.params;

  try {
    const bundle = await fetchFunctionalitySurveyBundle(projectId);
    return NextResponse.json({ bundle });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania ankiety." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  const { projectId } = await context.params;

  try {
    const body = (await request.json()) as {
      action?: string;
      input?: Record<string, unknown>;
    };

    switch (body.action) {
      case "ensure": {
        const survey = await ensureFunctionalitySurvey(projectId);
        const bundle = await fetchFunctionalitySurveyBundle(projectId);
        return NextResponse.json({ survey, bundle });
      }
      case "send": {
        const survey = await ensureFunctionalitySurvey(projectId);
        const updated = await updateFunctionalitySurveyStatus(survey.id, "sent");
        const bundle = await fetchFunctionalitySurveyBundle(projectId);
        return NextResponse.json({ survey: updated, bundle });
      }
      case "ai_suggest": {
        const [specItems, catalog, bundle] = await Promise.all([
          fetchProjectSpecificationItems(projectId),
          fetchSpecificationCatalog(true),
          fetchFunctionalitySurveyBundle(projectId),
        ]);
        const suggestions = await suggestFunctionalityWithAi({
          specItems,
          catalog,
          extraQuestions: bundle.survey?.extraQuestions,
          projectName: bundle.projectName,
        });
        const survey = bundle.survey ?? (await ensureFunctionalitySurvey(projectId));
        const updated = await updateFunctionalitySurveyAiSuggestions(survey.id, suggestions);
        const nextBundle = await fetchFunctionalitySurveyBundle(projectId);
        return NextResponse.json({ survey: updated, suggestions, bundle: nextBundle });
      }
      case "ai_review": {
        const suggestions = body.input?.suggestions as FunctionalityAiSuggestion[] | undefined;
        if (!Array.isArray(suggestions)) {
          return NextResponse.json({ error: "Brak propozycji AI." }, { status: 400 });
        }
        const bundle = await fetchFunctionalitySurveyBundle(projectId);
        if (!bundle.survey) {
          return NextResponse.json({ error: "Brak ankiety." }, { status: 404 });
        }
        const accepted = suggestions.filter((entry) => entry.status === "accepted");
        await updateFunctionalitySurveyAiSuggestions(bundle.survey.id, suggestions);
        await updateFunctionalitySurveyExtraQuestions(
          bundle.survey.id,
          accepted.map((entry, index) => ({
            id: entry.id,
            title: entry.title,
            description: entry.description,
            questionType: "boolean" as const,
            options: [
              {
                id: "yes",
                label: "Tak, chcę tę funkcję",
                generatesTask: true,
                taskTitle: entry.title,
                taskDescription: entry.description,
                taskPriority: entry.priority,
              },
              { id: "no", label: "Nie potrzebuję" },
            ],
            category: entry.category,
            position: index,
            priority: "nice_to_have" as const,
          })),
        );
        await regenerateFunctionalityTasks(projectId);
        const nextBundle = await fetchFunctionalitySurveyBundle(projectId);
        return NextResponse.json({ bundle: nextBundle });
      }
      case "regenerate_tasks": {
        const tasks = await regenerateFunctionalityTasks(projectId);
        const bundle = await fetchFunctionalitySurveyBundle(projectId);
        return NextResponse.json({ tasks, bundle });
      }
      case "task_status": {
        const taskId = String(body.input?.taskId ?? "");
        const status = String(body.input?.status ?? "") as FunctionalityTaskStatus;
        if (!taskId || !["todo", "in_progress", "done"].includes(status)) {
          return NextResponse.json({ error: "Nieprawidłowe dane zadania." }, { status: 400 });
        }
        const task = await updateFunctionalityTaskStatus(taskId, status);
        return NextResponse.json({ task });
      }
      case "mark_reviewed": {
        const bundle = await fetchFunctionalitySurveyBundle(projectId);
        if (!bundle.survey) {
          return NextResponse.json({ error: "Brak ankiety." }, { status: 404 });
        }
        await markFunctionalitySurveyTeamReviewed(bundle.survey.id);
        const nextBundle = await fetchFunctionalitySurveyBundle(projectId);
        return NextResponse.json({ bundle: nextBundle });
      }
      default:
        return NextResponse.json({ error: "Nieobsługiwana operacja." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd operacji ankiety." },
      { status: 500 },
    );
  }
}
