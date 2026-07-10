// Filtr widoczności sekcji raportu publicznego (server-side). Usuwa sekcje wyłączone
// oraz pola zawsze ukryte (notatki, identyfikatory, statusy weryfikacji, storage_path).
import type { ReportViewModel, SectionVisibility } from "@/lib/audit/types";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/audit/types";

export type PublicReportViewModel = Partial<ReportViewModel> & {
  meta: ReportViewModel["meta"];
  score?: ReportViewModel["score"];
};

export function normalizeVisibility(input: unknown): SectionVisibility {
  const v = (input ?? {}) as Partial<SectionVisibility>;
  return {
    overall_score: v.overall_score ?? DEFAULT_SECTION_VISIBILITY.overall_score,
    domains: v.domains ?? DEFAULT_SECTION_VISIBILITY.domains,
    criteria: v.criteria ?? DEFAULT_SECTION_VISIBILITY.criteria,
    recommendations: v.recommendations ?? DEFAULT_SECTION_VISIBILITY.recommendations,
    roadmap: v.roadmap ?? DEFAULT_SECTION_VISIBILITY.roadmap,
    photos: v.photos ?? DEFAULT_SECTION_VISIBILITY.photos,
    technical: v.technical ?? DEFAULT_SECTION_VISIBILITY.technical,
    client_data: v.client_data ?? DEFAULT_SECTION_VISIBILITY.client_data,
  };
}

export function toPublicReport(
  model: ReportViewModel,
  visibility: SectionVisibility,
): PublicReportViewModel {
  // meta: usuń dane klienta jeśli wyłączone; nigdy nie ujawniaj identyfikatorów technicznych
  const meta = { ...model.meta };
  if (!visibility.client_data) {
    meta.buildingName = "Budynek (dane ukryte)";
    meta.address = null;
    meta.auditor = null;
  }

  const out: PublicReportViewModel = { meta };

  if (visibility.overall_score) out.score = model.score;
  if (visibility.domains) out.domains = model.domains;
  if (visibility.criteria) out.criteria = model.criteria;
  if (visibility.recommendations) {
    // usuń wewnętrzne pola (rank/priorityScore/capabilities) z publicznego widoku
    const strip = (r: ReportViewModel["recommendations"][number]) => ({
      code: r.code,
      namePl: r.namePl,
      nameEn: r.nameEn,
      domain: r.domain,
      domainPl: r.domainPl,
      currentLevel: r.currentLevel,
      targetLevel: r.targetLevel,
      priority: r.priority,
      priorityScore: 0,
      rank: 0,
      expectedGainPercent: r.expectedGainPercent,
      gapDescription: r.gapDescription,
      capabilities: [],
      difficulty: r.difficulty,
    });
    out.recommendations = model.recommendations.map(strip);
    out.topRecommendations = model.topRecommendations.map(strip);
  }
  if (visibility.roadmap) out.roadmap = model.roadmap;
  if (visibility.overall_score || visibility.domains) {
    out.strengths = model.strengths;
    out.gaps = model.gaps;
  }
  if (visibility.technical) {
    // usuń statusy weryfikacji (metadana wewnętrzna)
    out.technical = {
      services: model.technical.services.map((s) => ({ ...s, verificationStatus: null })),
    };
  }
  if (visibility.photos) {
    out.attachments = {
      evidence: model.attachments.evidence.map((e) => ({
        id: "",
        questionCode: e.questionCode,
        caption: e.caption,
        url: e.url,
        createdAt: e.createdAt,
      })),
    };
  }

  return out;
}
