// Budowa publicznego (przefiltrowanego) modelu raportu. Tylko serwer/service-role.
import {
  getSession,
  getAnswerDetails,
  listEvidence,
  createEvidenceSignedUrl,
} from "@/lib/supabase/audit-repository";
import { buildReportViewModel } from "@/lib/sri/report-view";
import { toPublicReport, type PublicReportViewModel } from "@/lib/audit/report-visibility";
import type { ReportEvidence, SectionVisibility } from "@/lib/audit/types";

export const SHARE_MAX_FAILED_ATTEMPTS = 5;
export const SHARE_LOCK_MINUTES = 15;

export function shareLockUntilIso(): string {
  return new Date(Date.now() + SHARE_LOCK_MINUTES * 60 * 1000).toISOString();
}

export function isShareExpired(expiresAt: string | null): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

export function isShareLocked(lockedUntil: string | null): boolean {
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

export async function buildPublicReport(
  sessionId: string,
  visibility: SectionVisibility,
): Promise<PublicReportViewModel | null> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "completed") return null;

  const answerDetails = await getAnswerDetails(sessionId);

  let evidence: ReportEvidence[] = [];
  if (visibility.photos) {
    const rows = await listEvidence(sessionId);
    evidence = await Promise.all(
      rows.map(async (e) => ({
        id: e.id,
        questionCode: e.questionCode,
        caption: e.caption,
        url: await createEvidenceSignedUrl(e.storagePath),
        createdAt: e.createdAt,
      })),
    );
  }

  const full = buildReportViewModel(session, answerDetails, evidence);
  return toPublicReport(full, visibility);
}
