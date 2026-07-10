import Link from "next/link";
import type { Metadata } from "next";
import { buildReferenceAssessment } from "@/lib/sri/reference";
import { buildReportViewModel, type AnswerDetail } from "@/lib/sri/report-view";
import { ReportView } from "@/components/audit/report/report-view";
import type { AuditSession } from "@/lib/audit/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Przykładowy raport SRI | Luksystem",
  description:
    "Zobacz, jak wygląda gotowy raport oceny gotowości inteligentnej budynku (SRI): wynik, domeny, kryteria wpływu, rekomendacje i roadmapa modernizacji.",
};

export default function PublicExampleReportPage() {
  const input = buildReferenceAssessment();

  const session: AuditSession = {
    id: "reference",
    ownerId: "",
    name: "Budynek biurowy „Przykładowy”",
    status: "completed",
    methodologyVersionId: input.methodology_version_id,
    buildingType: input.building_type as AuditSession["buildingType"],
    climateZone: input.climate_zone as AuditSession["climateZone"],
    buildingAddress: "ul. Przykładowa 1, 00-001 Warszawa",
    auditorName: "Zespół Luksystem",
    auditedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const answerDetails: AnswerDetail[] = Object.entries(input.services).map(([code, level]) => ({
    questionCode: code,
    valueInt: level,
    note: null,
    verificationStatus: null,
  }));

  const model = buildReportViewModel(session, answerDetails, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/sri" className="text-sm font-semibold text-blue-700">
            ← Luksystem SRI
          </Link>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Raport demonstracyjny
          </span>
        </div>
      </div>
      <ReportView model={model} />
    </div>
  );
}
