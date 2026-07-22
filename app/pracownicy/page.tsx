"use client";

import Link from "next/link";
import { PalmtreeIcon, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasFullAppAccess } from "@/lib/auth/types";
import { useAuthStore } from "@/store/auth-store";

export default function EmployeesHubPage() {
  const profile = useAuthStore((state) => state.profile);
  const canRateEmployees = Boolean(profile) && hasFullAppAccess(profile!.role);

  return (
    <>
      <PageHeader
        eyebrow="Przestrzenie"
        title="Pracownicy"
        description="Widoki zespołowe dotyczące pracowników — urlopy, a w przyszłości czas pracy i zadania."
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/pracownicy/urlopy">
          <Card className="h-full transition hover:border-accent/40 hover:bg-surface-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start justify-between gap-3 text-base">
                <span>Urlopy</span>
                <PalmtreeIcon className="h-4 w-4 shrink-0 text-accent" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">
              Wszystkie wnioski urlopowe pracowników — akceptacje, odrzucenia i karty urlopowe.
            </CardContent>
          </Card>
        </Link>

        {canRateEmployees ? (
          <Link href="/pracownicy/oceny-miesieczne">
            <Card className="h-full transition hover:border-accent/40 hover:bg-surface-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between gap-3 text-base">
                  <span>Oceny miesięczne</span>
                  <Star className="h-4 w-4 shrink-0 text-accent" />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                Oceń pracowników za bieżący miesiąc — niezależnie od ich samooceny.
              </CardContent>
            </Card>
          </Link>
        ) : null}
      </section>
    </>
  );
}
