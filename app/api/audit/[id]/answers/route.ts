import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import { getAnswers, upsertAnswers, setStatus } from "@/lib/supabase/audit-repository";
import { buildQuestions } from "@/lib/sri/questions";
import { DEFAULT_METHODOLOGY_ID } from "@/lib/audit/types";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { session } = await requireOwnedSession(id);

    if (!session.methodologyVersionId) {
      throw new HttpError(409, "Najpierw wybierz metodologię.");
    }

    const body = (await request.json().catch(() => ({}))) as {
      answers?: Record<string, number>;
    };
    const incoming = body.answers ?? {};

    // walidacja wg katalogu metodologii
    const questions = buildQuestions(session.methodologyVersionId ?? DEFAULT_METHODOLOGY_ID);
    const flMaxByCode = new Map(questions.map((q) => [q.code, q.flMax]));
    const clean: Record<string, number> = {};
    for (const [code, level] of Object.entries(incoming)) {
      if (!flMaxByCode.has(code)) throw new HttpError(400, `Nieznany kod usługi: ${code}`);
      if (!Number.isInteger(level) || level < 0 || level > flMaxByCode.get(code)!) {
        throw new HttpError(400, `${code}: poziom poza zakresem 0..${flMaxByCode.get(code)}`);
      }
      clean[code] = level;
    }

    await upsertAnswers(id, clean);
    if (session.status === "methodology_selected" || session.status === "completed") {
      await setStatus(id, "in_progress");
    }
    const answers = await getAnswers(id);
    return NextResponse.json({ answers, status: "in_progress" });
  } catch (error) {
    return jsonError(error);
  }
}
