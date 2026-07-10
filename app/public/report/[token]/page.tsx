import type { Metadata } from "next";
import { PublicReportClient } from "@/components/audit/public-report-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicReportClient token={token} />;
}
