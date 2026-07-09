// Generator pytań audytu z metodologii (deterministyczny, bez persystencji).
// Każda usługa SRI = jedno pytanie z wyborem poziomu funkcjonalności 0..FLmax.
import { getServices, getDomainsPl } from "@/lib/sri/artifacts";
import type { AuditQuestion } from "@/lib/audit/types";
import { DEFAULT_METHODOLOGY_ID } from "@/lib/audit/types";

export function buildQuestions(versionId = DEFAULT_METHODOLOGY_ID): AuditQuestion[] {
  const services = getServices(versionId);
  const domainsPl = getDomainsPl(versionId);

  return [...services]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      code: s.official_code,
      domain: s.domain_code,
      domainNamePl: domainsPl[s.domain_code] ?? s.domain_code,
      namePl: s.official_name_pl,
      nameEn: s.official_name_en,
      flMax: s.fl_max,
      levels: [...s.functionality_levels]
        .sort((a, b) => a.level - b.level)
        .map((l) => ({ level: l.level, descriptionEn: l.official_description_en })),
    }));
}
