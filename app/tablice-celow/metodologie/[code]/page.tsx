"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useGoalStore } from "@/store/goal-store";

function Section({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="whitespace-pre-line text-sm leading-6 text-foreground/90">{content}</p>
    </div>
  );
}

export default function GoalMethodologyDetailPage() {
  const params = useParams();
  const code = String(params.code);
  const methodology = useGoalStore((state) => state.methodologies.find((entry) => entry.code === code));

  if (!methodology) {
    return <p className="text-sm text-muted">Metodologia nie została znaleziona.</p>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Biblioteka metodologii"
        title={methodology.name}
        description={methodology.shortDescription}
        action={
          <Link
            href="/tablice-celow/metodologie"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do biblioteki
          </Link>
        }
      />
      <Card>
        <CardContent className="grid gap-5">
          <Section title="Przeznaczenie" content={methodology.purpose} />
          <Section title="Kiedy stosować" content={methodology.whenToUse} />
          <Section title="Kiedy nie stosować" content={methodology.whenNotToUse} />
          <Section title="Struktura" content={methodology.structureMd} />
          <Section title="Przykład" content={methodology.exampleMd} />
          <Section title="Dobre praktyki" content={methodology.bestPracticesMd} />
          <Section title="Najczęstsze błędy" content={methodology.commonMistakesMd} />
        </CardContent>
      </Card>
    </>
  );
}
