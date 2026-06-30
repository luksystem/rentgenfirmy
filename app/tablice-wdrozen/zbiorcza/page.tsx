"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AggregatedKanbanBoard } from "@/components/process/aggregated-kanban-board";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export default function AggregatedKanbanHubPage() {
  const displayName = useAuthStore((state) => state.displayName);

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden md:min-h-[calc(100vh-8rem)]">
      <PageHeader
        eyebrow="Tablice wdrożeń"
        title="Tablica wdrożeń"
        description="Wszystkie zgłoszenia Kanban z projektów na jednej tablicy. Kolumny są łączone po nazwie — na każdej karcie widać projekt."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/tablice-wdrozen">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Widok per klient
            </Link>
          </Button>
        }
      />

      <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 md:min-h-0 md:flex-1 md:overflow-hidden">
        <AggregatedKanbanBoard authorSide="team" authorName={displayName || "Zespół"} />
      </div>
    </div>
  );
}
