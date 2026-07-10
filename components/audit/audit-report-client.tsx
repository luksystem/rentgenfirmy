"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/components/audit/report/report-view";
import type { ReportViewModel } from "@/lib/audit/types";

function Skeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6 px-4 py-8">
      <div className="h-32 rounded-2xl bg-surface-muted" />
      <div className="h-24 rounded-2xl bg-surface-muted" />
      <div className="h-80 rounded-2xl bg-surface-muted" />
      <div className="h-96 rounded-2xl bg-surface-muted" />
    </div>
  );
}

export function AuditReportClient({ sessionId }: { sessionId: string }) {
  const [model, setModel] = useState<ReportViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/audit/${sessionId}/report`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Nie udało się pobrać raportu.");
        if (active) setModel(data as ReportViewModel);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Błąd.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (loading) return <Skeleton />;

  if (error || !model) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-muted">{error ?? "Brak raportu."}</p>
        <Link href={`/audyt/${sessionId}`} className="mt-4 inline-block text-accent underline">
          ← Wróć do audytu
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-6 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/audyt/${sessionId}`}>
            <ArrowLeft className="h-4 w-4" /> Audyt
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/audyt/${sessionId}/udostepnianie`}>
            <Share2 className="h-4 w-4" /> Udostępnij
          </Link>
        </Button>
      </div>
      <ReportView model={model} />
    </div>
  );
}
