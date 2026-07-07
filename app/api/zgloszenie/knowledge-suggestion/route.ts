import { NextResponse } from "next/server";
import { generateKnowledgeSuggestion } from "@/lib/ai/knowledge-suggestion-generator";
import { normalizeKnowledgeBaseSettings } from "@/lib/knowledge/settings";
import { readIntakeAuthToken } from "@/lib/service-intake/tokens";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  searchKnowledgeChunks,
  searchServiceIntakeHistory,
} from "@/lib/supabase/knowledge-search-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      verificationToken?: string;
      description?: string;
    };

    const auth = readIntakeAuthToken(body.verificationToken?.trim() ?? "");
    if (!auth) {
      return NextResponse.json(
        { error: "Sesja wygasła. Odśwież stronę i zacznij od początku." },
        { status: 401 },
      );
    }

    const description = body.description?.trim() ?? "";
    if (description.length < 10) {
      return NextResponse.json({ error: "Opisz problem (minimum 10 znaków)." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("data")
      .eq("id", "knowledge_base_settings")
      .maybeSingle();
    const settings = normalizeKnowledgeBaseSettings(
      settingsRow?.data as Record<string, unknown> | undefined,
    );

    if (!settings.enableIntakeSuggestions) {
      return NextResponse.json(
        { error: "Sugestie AI są obecnie wyłączone. Kontynuuj zgłoszenie serwisowe." },
        { status: 400 },
      );
    }

    const [excerpts, historyExcerpts] = await Promise.all([
      searchKnowledgeChunks(description, 6),
      searchServiceIntakeHistory(description, 4),
    ]);

    const suggestion = await generateKnowledgeSuggestion({
      description,
      excerpts,
      historyExcerpts,
    });

    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nie udało się wygenerować sugestii.",
      },
      { status: 500 },
    );
  }
}
