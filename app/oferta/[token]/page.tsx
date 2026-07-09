import { ClientOfferPage } from "@/components/service/client-offer-page";

// Link publiczny ma zawsze pokazywać aktualny stan oferty aż do akceptacji
// klienta — strona nie może być statycznie cache'owana.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientOfferPage token={token} />;
}
