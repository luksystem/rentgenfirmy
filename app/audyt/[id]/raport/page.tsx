import { AuditReportClient } from "@/components/audit/audit-report-client";

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuditReportClient sessionId={id} />;
}
