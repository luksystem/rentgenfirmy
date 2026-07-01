import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function DokumentyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Dokumentacja"
        title="Dokumenty"
        description="Moduł w przygotowaniu — zdjęcia, skany i pliki PDF powiązane z klientem lub projektem."
      />
      <Card>
        <CardContent className="py-6 text-sm text-muted">
          Wkrótce: upload z telefonu, kategoryzacja i szybkie dodawanie z tablicy wdrożeń do
          dokumentacji projektu.
        </CardContent>
      </Card>
    </>
  );
}
