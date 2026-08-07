"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";
import { useCalculatorStore } from "@/store/calculator-store";

export default function CalculatorOfferPage() {
  const params = useParams();
  const id = String(params.id);
  const getOfferById = useCalculatorStore((state) => state.getOfferById);
  const hydrated = useCalculatorStore((state) => state.hydrated);
  const isLoading = useCalculatorStore((state) => state.isLoading);
  const offer = getOfferById(id);

  if (!offer) {
    if (!hydrated || isLoading) {
      return <p className="text-sm text-muted">Wczytywanie kalkulacji…</p>;
    }

    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">Nie znaleziono kalkulacji.</p>
        <Button asChild>
          <Link href="/kalkulacje">Wróć do listy</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.salesCalculations.eyebrow}
        title={offer.title || "Kalkulacja"}
        description="Ankieta parametrów domu — cena przelicza się na żywo."
      />
      <CalculatorForm key={`${offer.id}:${offer.updatedAt}`} initialOffer={offer} />
    </>
  );
}
