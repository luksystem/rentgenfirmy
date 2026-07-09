"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useGoalStore } from "@/store/goal-store";

export default function GoalMethodologyLibraryPage() {
  const methodologies = useGoalStore((state) => state.methodologies);

  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Biblioteka metodologii"
        description="Karty metodologii wykorzystywane przy formułowaniu i monitorowaniu celów."
        action={
          <Link
            href="/tablice-celow"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {methodologies.map((methodology) => (
          <Link key={methodology.code} href={`/tablice-celow/metodologie/${methodology.code}`}>
            <Card className="h-full transition hover:border-accent/40">
              <CardHeader className="pb-2">
                <CardTitle>{methodology.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted">{methodology.shortDescription}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
