"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DomainTile } from "@/components/raport-firmy/domain-tile";
import { HomeQuickStatus } from "@/components/home/home-quick-status";
import { useRaportFirmyData } from "@/hooks/use-raport-firmy-data";

export function AdminHomeView() {
  const router = useRouter();
  const { data, isLoading, error } = useRaportFirmyData();

  return (
    <>
      <PageHeader
        eyebrow="Centrum operacyjne"
        title="Dashboard budżetu i firmy"
        description="Przychód, płynność i sprzedaż na dziś. Pełny stan projektów i przerwań znajdziesz w raporcie."
      />

      <HomeQuickStatus />

      <section className="mt-4 grid gap-4 sm:mt-6 md:grid-cols-2">
        {isLoading ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-muted">
              Wczytywanie raportu firmowego…
            </CardContent>
          </Card>
        ) : error || !data ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-rose-400">
              {error ?? "Nie udało się wczytać raportu firmowego."}
            </CardContent>
          </Card>
        ) : (
          <>
            {data.budget ? (
              <DomainTile
                report={data.budget}
                subtitle="Przychód, prognoza płynności, faktury"
                onOpen={() => router.push("/raport")}
              />
            ) : null}
            <DomainTile
              report={data.sales}
              subtitle="Oferty, rozliczenia, zapotrzebowania"
              onOpen={() => router.push("/raport")}
            />
          </>
        )}
      </section>

      <section className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium text-foreground">Pełny raport firmowy</p>
              <p className="text-sm text-muted">Zespół, sprzedaż, serwis, cele, budżet i projekty.</p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/raport">Otwórz</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium text-foreground">Prognoza finansowa</p>
              <p className="text-sm text-muted">Cashflow, koszty i scenariusze na kolejne miesiące.</p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/prognoza-finansowa">Otwórz</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
