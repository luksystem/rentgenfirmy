import { NextResponse } from "next/server";
import {
  completeFunctionalitySurvey,
  fetchFunctionalitySurveyBundleByToken,
  upsertFunctionalityResponse,
  updateFunctionalitySurveyStatus,
} from "@/lib/supabase/project-functionality-survey-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const bundle = await fetchFunctionalitySurveyBundleByToken(token);
    if (!bundle) {
      return NextResponse.json({ error: "Nie znaleziono ankiety." }, { status: 404 });
    }
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
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const bundle = await fetchFunctionalitySurveyBundleByToken(token);
    if (!bundle?.survey) {
      return NextResponse.json({ error: "Nie znaleziono ankiety." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: string;
      input?: Record<string, unknown>;
    };

    switch (body.action) {
      case "start": {
        const clientName = typeof body.input?.clientName === "string" ? body.input.clientName : "";
        const survey = await updateFunctionalitySurveyStatus(
          bundle.survey.id,
          "in_progress",
          { clientName: clientName || bundle.survey.clientName },
        );
        return NextResponse.json({ survey });
      }
      case "response": {
        const questionId = String(body.input?.questionId ?? "");
        const selectedOptionIds = Array.isArray(body.input?.selectedOptionIds)
          ? (body.input.selectedOptionIds as string[])
          : [];
        const catalogItemId =
          typeof body.input?.catalogItemId === "string" ? body.input.catalogItemId : null;
        const customNote = typeof body.input?.customNote === "string" ? body.input.customNote : "";

        if (!questionId) {
          return NextResponse.json({ error: "Brak identyfikatora pytania." }, { status: 400 });
        }

        const response = await upsertFunctionalityResponse(bundle.survey.id, {
          questionId,
          catalogItemId,
          selectedOptionIds,
          customNote,
        });

        if (bundle.survey.status === "sent" || bundle.survey.status === "draft") {
          await updateFunctionalitySurveyStatus(bundle.survey.id, "in_progress");
        }

        return NextResponse.json({ response });
      }
      case "complete": {
        const clientName = typeof body.input?.clientName === "string" ? body.input.clientName : "";
        const tasks = await completeFunctionalitySurvey(
          bundle.survey.id,
          bundle.survey.projectId,
          clientName || bundle.survey.clientName,
        );
        const nextBundle = await fetchFunctionalitySurveyBundleByToken(token);
        return NextResponse.json({ tasks, bundle: nextBundle });
      }
      default:
        return NextResponse.json({ error: "Nieobsługiwana operacja." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu ankiety." },
      { status: 500 },
    );
  }
}
