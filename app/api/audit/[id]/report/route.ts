import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import {
  getAnswerDetails,
  listEvidence,
  createEvidenceSignedUrl,
} from "@/lib/supabase/audit-repository";
import { buildReportViewModel } from "@/lib/sri/report-view";
import type { ReportEvidence } from "@/lib/audit/types";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { session } = await requireOwnedSession(id);

    if (session.status !== "completed") {
      throw new HttpError(409, "Raport dostępny dopiero po uruchomieniu obliczeń.");
    }

    const answerDetails = await getAnswerDetails(id);
    const evidenceRows = await listEvidence(id);
    const evidence: ReportEvidence[] = await Promise.all(
      evidenceRows.map(async (e) => ({
        id: e.id,
        questionCode: e.questionCode,
        caption: e.caption,
        url: await createEvidenceSignedUrl(e.storagePath),
        createdAt: e.createdAt,
      })),
    );

    const report = buildReportViewModel(session, answerDetails, evidence);
    return NextResponse.json(report);
  } catch (error) {
    return jsonError(error);
  }
}
