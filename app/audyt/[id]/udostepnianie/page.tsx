import { ShareManager } from "@/components/audit/share-manager";

export default async function AuditSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShareManager sessionId={id} />;
}
