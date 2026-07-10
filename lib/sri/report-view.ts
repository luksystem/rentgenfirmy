// Budowa modelu raportu (server-side). Frontend konsumuje gotowy model — bez logiki SRI.
// "potential" i "predictedScore" liczone są silnikiem SRI na hipotetycznych wejściach
// (usługi na poziomie docelowym) — bez zmiany metodologii/punktacji.
import { compute } from "@/lib/sri/engine";
import { buildRecommendations } from "@/lib/sri/recommendation";
import { buildRoadmap } from "@/lib/sri/optimization";
import { getServices, getDomainsPl } from "@/lib/sri/artifacts";
import { CRITERION_PL, BUILDING_TYPE_PL, CLIMATE_ZONE_PL } from "@/lib/sri/labels";
import type {
  AuditSession,
  AssessmentInput,
  ReportViewModel,
  ReportDomain,
  ReportEvidence,
} from "@/lib/audit/types";

export type AnswerDetail = {
  questionCode: string;
  valueInt: number | null;
  note: string | null;
  verificationStatus: string | null;
};

function domainPercent(perDomain: Record<string, Record<string, { achieved: number; maxposs: number }>>, domain: string) {
  const byIc = perDomain[domain];
  if (!byIc) return 0;
  const achieved = Object.values(byIc).reduce((a, v) => a + v.achieved, 0);
  const max = Object.values(byIc).reduce((a, v) => a + v.maxposs, 0);
  return max > 0 ? (achieved / max) * 100 : 0;
}

export function buildReportViewModel(
  session: AuditSession,
  answerDetails: AnswerDetail[],
  evidence: ReportEvidence[],
): ReportViewModel {
  const versionId = session.methodologyVersionId ?? "eu-sri-v4.5";
  const services = getServices(versionId);
  const flMaxByCode = new Map(services.map((s) => [s.official_code, s.fl_max]));
  const namePlByCode = new Map(services.map((s) => [s.official_code, s.official_name_pl]));
  const domainByCode = new Map(services.map((s) => [s.official_code, s.domain_code]));
  const domainsPl = getDomainsPl(versionId);

  const answers: Record<string, number> = {};
  for (const a of answerDetails) if (a.valueInt !== null) answers[a.questionCode] = a.valueInt;

  const input: AssessmentInput = {
    methodology_version_id: versionId,
    building_type: session.buildingType ?? "non_residential",
    climate_zone: session.climateZone ?? "north_europe",
    services: answers,
  };

  const calc = compute(input);
  const recommendations = buildRecommendations(input);
  const roadmap = buildRoadmap(recommendations, versionId);

  // Potencjał = wszystkie ocenione usługi na FLmax.
  const potentialServices: Record<string, number> = {};
  for (const code of Object.keys(answers)) potentialServices[code] = flMaxByCode.get(code) ?? answers[code];
  const potentialCalc = compute({ ...input, services: potentialServices });

  // Domeny: obecny % vs potencjał %.
  const domains: ReportDomain[] = Object.keys(calc.per_domain)
    .sort()
    .map((code) => ({
      code,
      namePl: domainsPl[code] ?? code,
      current: Math.round(domainPercent(calc.per_domain, code) * 10) / 10,
      potential: Math.round(domainPercent(potentialCalc.per_domain, code) * 10) / 10,
    }));

  // Kryteria.
  const criteria = Object.keys(calc.per_criterion).map((ic) => ({
    code: ic,
    namePl: CRITERION_PL[ic] ?? ic,
    current: Math.round((calc.per_criterion[ic] ?? 0) * 1000) / 10,
    potential: Math.round((potentialCalc.per_criterion[ic] ?? 0) * 1000) / 10,
  }));

  const sortedByCurrent = [...domains].sort((a, b) => b.current - a.current);
  const strengths = sortedByCurrent.slice(0, 3).map((d) => `${d.namePl} (${d.current.toFixed(0)}%)`);
  const gaps = [...sortedByCurrent]
    .reverse()
    .slice(0, 3)
    .map((d) => `${d.namePl} (${d.current.toFixed(0)}%)`);

  // Roadmap z przewidywanym wynikiem kumulatywnym.
  const targetByCode = new Map(recommendations.map((r) => [r.code, r.targetLevel]));
  const working: Record<string, number> = { ...answers };
  const roadmapEnriched = [...roadmap]
    .sort((a, b) => a.stageId - b.stageId)
    .map((stage) => {
      for (const action of stage.actions) {
        const t = targetByCode.get(action.code);
        if (typeof t === "number") working[action.code] = t;
      }
      const predicted = compute({ ...input, services: { ...working } }).total_score_percent;
      const dependencies = Array.from(new Set(stage.actions.map((a) => a.domainPl)));
      const blockers = stage.stageId > 1 ? [`Wymaga wcześniejszych etapów (1–${stage.stageId - 1})`] : [];
      return {
        ...stage,
        predictedScore: Math.round(predicted * 10) / 10,
        blockers,
        dependencies,
      };
    });

  // Szczegóły techniczne.
  const verificationByCode = new Map(answerDetails.map((a) => [a.questionCode, a.verificationStatus]));
  const technicalServices = Object.keys(answers)
    .sort()
    .map((code) => ({
      code,
      namePl: namePlByCode.get(code) ?? code,
      domainPl: domainsPl[domainByCode.get(code) ?? ""] ?? "",
      fl: answers[code],
      flMax: flMaxByCode.get(code) ?? 0,
      verificationStatus: verificationByCode.get(code) ?? null,
    }));

  return {
    meta: {
      buildingName: session.name,
      address: session.buildingAddress ?? null,
      auditedAt: session.auditedAt ?? session.createdAt,
      auditor: session.auditorName ?? null,
      methodologyVersionId: versionId,
      buildingType: input.building_type,
      buildingTypePl: BUILDING_TYPE_PL[input.building_type] ?? input.building_type,
      climateZone: input.climate_zone,
      climateZonePl: CLIMATE_ZONE_PL[input.climate_zone] ?? input.climate_zone,
    },
    score: {
      current: calc.total_score_percent,
      potential: potentialCalc.total_score_percent,
      classLabel: calc.class.label,
      classNumber: calc.class.number,
      potentialClassLabel: potentialCalc.class.label,
      potentialClassNumber: potentialCalc.class.number,
    },
    domains,
    criteria,
    strengths,
    gaps,
    topRecommendations: recommendations.slice(0, 3),
    recommendations,
    roadmap: roadmapEnriched,
    technical: { services: technicalServices },
    attachments: { evidence },
  };
}
