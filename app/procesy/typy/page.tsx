"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, LayoutGrid, Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { DEFAULT_PROCESS_ELEMENT_KIND_META } from "@/lib/process/kind-meta";
import { getSupabase } from "@/lib/supabase/client";
import {
  fetchProcessElementKindMeta,
  saveProcessElementKindMetaDescription,
} from "@/lib/supabase/process-kind-meta-repository";
import type { ProcessElementKindMeta } from "@/lib/process/kind-meta";
import type { ProcessItemKind } from "@/lib/process/types";

const kindIcons: Record<ProcessItemKind, React.ComponentType<{ className?: string }>> = {
  checklist: CheckCircle2,
  protocol: FileCheck2,
  settlement: Receipt,
  kanban: LayoutGrid,
};

export default function ProcessKindTypesPage() {
  const [meta, setMeta] = useState<ProcessElementKindMeta[]>(DEFAULT_PROCESS_ELEMENT_KIND_META);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKind, setSavingKind] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchProcessElementKindMeta(getSupabase()).then((loaded) => {
      setMeta(loaded);
      setDrafts(Object.fromEntries(loaded.map((entry) => [entry.kind, entry.description])));
    });
  }, []);

  async function handleSave(kind: ProcessItemKind) {
    setSavingKind(kind);
    setMessage(null);
    try {
      await saveProcessElementKindMetaDescription(getSupabase(), kind, drafts[kind] ?? "");
      setMeta((current) =>
        current.map((entry) =>
          entry.kind === kind ? { ...entry, description: drafts[kind] ?? "" } : entry,
        ),
      );
      setMessage(`Zapisano opis typu „${kind}”.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Błąd zapisu.");
    } finally {
      setSavingKind(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Moduł operacyjny"
        title="Typy elementów procesu"
        description="Katalog typów używanych w szablonach procesów — checklisty, protokoły, tablice Kanban i rozliczenia."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/procesy">Szablony procesów</Link>
            </Button>
            <Button asChild>
              <Link href="/procesy/elementy">Elementy procesu</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {meta.map((entry) => {
          const Icon = kindIcons[entry.kind];
          return (
            <Card key={entry.kind}>
              <CardContent className="grid gap-4 py-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-accent/30 bg-accent/10 p-2">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                      {entry.kind}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{entry.label}</h2>
                  </div>
                </div>

                <ul className="grid gap-1 text-xs text-muted">
                  <li>Link publiczny: {entry.supportsPublicLink ? "tak" : "nie"}</li>
                  <li>Odbiór wewnętrzny: {entry.supportsInternalAcceptance ? "tak (checklista)" : "nie"}</li>
                </ul>

                <Field label="Opis typu">
                  <Textarea
                    value={drafts[entry.kind] ?? entry.description}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [entry.kind]: event.target.value }))
                    }
                  />
                </Field>

                <Button
                  type="button"
                  size="sm"
                  disabled={savingKind === entry.kind}
                  onClick={() => void handleSave(entry.kind)}
                >
                  {savingKind === entry.kind ? "Zapisywanie…" : "Zapisz opis"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {message ? <p className="mt-4 text-sm text-emerald-400">{message}</p> : null}
    </>
  );
}
