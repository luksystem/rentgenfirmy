import Link from "next/link";
import { buildReferenceAssessment } from "@/lib/sri/reference";
import { buildReportViewModel, type AnswerDetail } from "@/lib/sri/report-view";
import { ReportView } from "@/components/audit/report/report-view";
import type { AuditSession } from "@/lib/audit/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ReferenceAuditPage() {
  const input = buildReferenceAssessment();

  const session: AuditSession = {
    id: "reference",
    ownerId: "",
    name: "Budynek referencyjny (przykład)",
    status: "completed",
    methodologyVersionId: input.methodology_version_id,
    buildingType: input.building_type as AuditSession["buildingType"],
    climateZone: input.climate_zone as AuditSession["climateZone"],
    buildingAddress: "ul. Przykładowa 1, 00-001 Miasto",
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
    <div>
      <div className="mx-auto max-w-5xl px-4 pt-6 print:hidden">
        <Link href="/audyt" className="text-sm text-accent underline">
          ← Lista audytów
        </Link>
      </div>
      <ReportView model={model} />
    </div>
  );
}
