import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function FakturyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sprzedaż"
        title="Faktury i koszty"
        description="Moduł w przygotowaniu — rejestr faktur, kosztów projektowych i dokumentów księgowych z podglądem PDF."
      />
      <Card>
        <CardContent className="py-6 text-sm text-muted">
          Wkrótce: dodawanie faktury/kosztu z załącznikiem, przypisanie do projektu i klienta oraz
          podsumowanie kosztów w dashboardzie.
        </CardContent>
      </Card>
    </>
  );
}
