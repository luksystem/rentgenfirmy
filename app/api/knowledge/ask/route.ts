import { NextResponse } from "next/server";
import { generateKnowledgeSuggestion } from "@/lib/ai/knowledge-suggestion-generator";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { TEAM_KNOWLEDGE_ASK_INSTRUCTIONS } from "@/lib/knowledge/settings";
import {
  searchKnowledgeChunks,
  searchServiceIntakeHistory,
} from "@/lib/supabase/knowledge-search-server";

export const runtime = "nodejs";

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
    return NextResponse.json({ error: "Nieprawidłowe dane żądania." }, { status: 400 });
  }

  const description =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).description === "string"
      ? ((body as Record<string, unknown>).description as string).trim()
      : "";

  if (description.length < 10) {
    return NextResponse.json({ error: "Opisz sytuację (minimum 10 znaków)." }, { status: 400 });
  }

  try {
    const [excerpts, historyExcerpts] = await Promise.all([
      searchKnowledgeChunks(description, 6),
      searchServiceIntakeHistory(description, 4),
    ]);

    const suggestion = await generateKnowledgeSuggestion({
      description,
      excerpts,
      historyExcerpts,
      instructions: TEAM_KNOWLEDGE_ASK_INSTRUCTIONS,
    });

    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wygenerować odpowiedzi." },
      { status: 500 },
    );
  }
}
