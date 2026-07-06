"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PROTOCOL_FIELD_TYPE_LABELS } from "@/lib/process/protocol-types";
import { useProcessStore } from "@/store/process-store";

export default function ProtocolTemplatesPage() {
  const templates = useProcessStore((state) => state.protocolTemplates);
  const hydrated = useProcessStore((state) => state.protocolTemplatesHydrated);
  const ensureProtocolTemplates = useProcessStore((state) => state.ensureProtocolTemplates);

  useEffect(() => {
    void ensureProtocolTemplates();
  }, [ensureProtocolTemplates]);

  return (
    <>
      <PageHeader
        eyebrow="Moduł operacyjny"
        title="Wzory protokołów"
        description="Formularze protokołów (własne pola lub referencyjny PDF) do wypełnienia i podpisania elektronicznie w elemencie procesu „protokół”."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/procesy">Procesy</Link>
            </Button>
            <Button asChild>
              <Link href="/procesy/protokoly/nowy">Nowy wzór</Link>
            </Button>
          </div>
        }
      />

      {!hydrated ? (
        <p className="text-sm text-muted">Ładowanie wzorów protokołów…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="grid gap-3 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                    {template.source === "pdf" ? "Z pliku PDF" : "Własny formularz"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">{template.name}</h2>
                  {template.description ? (
                    <p className="mt-2 text-sm text-muted">{template.description}</p>
                  ) : null}
                </div>
                {template.source === "custom" ? (
                  <p className="text-sm text-muted">
                    {template.fields.length}{" "}
                    {template.fields.length === 1 ? "pole" : "pól"} ·{" "}
                    {Array.from(new Set(template.fields.map((field) => field.type)))
                      .map((type) => PROTOCOL_FIELD_TYPE_LABELS[type])
                      .join(", ")}
                  </p>
                ) : (
                  <p className="text-sm text-muted">
                    {template.referencePdfName ?? "Brak wgranego pliku PDF"}
                  </p>
                )}
                <Button asChild size="sm">
                  <Link href={`/procesy/protokoly/${template.id}`}>Edytuj</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {!templates.length ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="grid gap-3 py-8 text-center">
                <p className="text-sm text-muted">
                  Brak wzorów protokołów — utwórz pierwszy, aby móc go wybrać w elemencie procesu
                  typu „protokół”.
                </p>
                <Button asChild className="mx-auto w-fit">
                  <Link href="/procesy/protokoly/nowy">Utwórz wzór protokołu</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
