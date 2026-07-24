"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StandardsAiSettingsDialog } from "@/components/standards/standards-ai-settings-dialog";
import { isAdministratorRole } from "@/lib/auth/types";
import { fetchStandards } from "@/lib/supabase/standards-repository";
import type { CompanyStandard } from "@/lib/standards/types";
import { useAuthStore } from "@/store/auth-store";

export default function StandardsListPage() {
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = Boolean(profile && isAdministratorRole(profile.role));
  const [standards, setStandards] = useState<CompanyStandard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStandards()
      .then(setStandards)
      .catch((err) => setError(err instanceof Error ? err.message : "Nie udało się wczytać standardów."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Wiedza wewnętrzna"
        title="Standardy i procedury"
        description="Ustrukturyzowane standardy pracy — powstają samodzielnie albo z domkniętych usprawnień PDCA."
        action={
          <div className="flex gap-2">
            {isAdmin ? <StandardsAiSettingsDialog /> : null}
            <Link href="/standardy/nowy">
              <Button type="button">
                <Plus className="h-4 w-4" />
                Nowy standard
              </Button>
            </Link>
          </div>
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-rose-400">{error}</p>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">Wczytywanie...</CardContent>
        </Card>
      ) : standards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            Brak standardów — utwórz pierwszy.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {standards.map((standard) => (
            <Link key={standard.id} href={`/standardy/${standard.slug}`}>
              <Card className="h-full transition hover:border-accent/40 hover:shadow-md">
                <CardContent className="grid gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{standard.title}</p>
                    <Badge tone={standard.status === "published" ? "active" : "neutral"}>
                      {standard.status === "published" ? "Opublikowany" : "Szkic"}
                    </Badge>
                  </div>
                  {standard.summary ? (
                    <p className="line-clamp-2 text-sm text-muted">{standard.summary}</p>
                  ) : null}
                  <p className="text-xs text-muted">{standard.steps.length} krok(ów)</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
