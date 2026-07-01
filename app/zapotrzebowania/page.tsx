import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function ZapotrzebowaniaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operacje"
        title="Zapotrzebowania"
        description="Moduł w przygotowaniu — zgłoszenia na ubrania, narzędzia i sprzęt z workflow akceptacji."
      />
      <Card>
        <CardContent className="py-6 text-sm text-muted">
          Wkrótce: formularz zapotrzebowania, status akceptacji i powiązanie z kosztami / fakturami.
        </CardContent>
      </Card>
    </>
  );
}
