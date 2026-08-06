import { ClientContractPage } from "@/components/contracts/client-contract-page";

// Link publiczny ma zawsze pokazywać aktualny stan umowy aż do podpisania —
// strona nie może być statycznie cache'owana.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientContractPage token={token} />;
}
