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
      meta?: Record<string, { verificationStatus?: string | null; note?: string | null }>;
    };
    const incoming = body.answers ?? {};
    const meta = body.meta ?? {};
    const VALID_STATUS = ["confirmed", "uncertain", "to_verify", "no_data"];

    // walidacja wg katalogu metodologii
    const questions = buildQuestions(session.methodologyVersionId ?? DEFAULT_METHODOLOGY_ID);
    const flMaxByCode = new Map(questions.map((q) => [q.code, q.flMax]));
    const entries = [];
    for (const [code, level] of Object.entries(incoming)) {
      if (!flMaxByCode.has(code)) throw new HttpError(400, `Nieznany kod usługi: ${code}`);
      if (!Number.isInteger(level) || level < 0 || level > flMaxByCode.get(code)!) {
        throw new HttpError(400, `${code}: poziom poza zakresem 0..${flMaxByCode.get(code)}`);
      }
      const vs = meta[code]?.verificationStatus ?? null;
      if (vs !== null && !VALID_STATUS.includes(vs)) {
        throw new HttpError(400, `${code}: nieprawidłowy status weryfikacji`);
      }
      entries.push({
        questionCode: code,
        valueInt: level,
        verificationStatus: vs,
        note: meta[code]?.note ?? null,
      });
    }

    await upsertAnswers(id, entries);
    if (session.status === "methodology_selected" || session.status === "completed") {
      await setStatus(id, "in_progress");
    }
    const answers = await getAnswers(id);
    return NextResponse.json({ answers, status: "in_progress" });
  } catch (error) {
    return jsonError(error);
  }
}
