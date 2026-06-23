"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AggregatedAgreementsBoard } from "@/components/agreements/aggregated-agreements-board";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export default function AggregatedAgreementsPage() {
  const displayName = useAuthStore((state) => state.displayName);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <PageHeader
        eyebrow="Tablice wdrożeń"
        title="Tablica ustaleń"
        description="Wszystkie ustalenia u klientów na jednej tablicy Kanban — podział na szkice, oczekujące, zaakceptowane i odrzucone."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/tablice-wdrozen">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Widok per klient
            </Link>
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <AggregatedAgreementsBoard authorName={displayName || "Zespół"} />
      </div>
    </div>
  );
}
