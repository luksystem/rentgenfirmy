import { AuditWizard } from "@/components/audit/audit-wizard";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuditWizard id={id} />;
}
