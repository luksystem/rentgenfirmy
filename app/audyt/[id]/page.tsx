import { AuditSurvey } from "@/components/audit/audit-survey";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuditSurvey id={id} />;
}
