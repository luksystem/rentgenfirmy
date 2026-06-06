import { ClientOfferPage } from "@/components/service/client-offer-page";

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientOfferPage token={token} />;
}
