"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DictionarySection } from "@/components/settings/dictionary-settings-page";
import { LeaveCardTemplateEditor } from "@/components/settings/leave-card-template-editor";
import { useDictionaryStore } from "@/store/dictionary-store";

export default function LeaveSettingsPage() {
  const ensure = useDictionaryStore((state) => state.ensure);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Moja praca — Dostępność / Urlopy"
        description="Typy dostępności wybierane przy składaniu wniosku oraz wzór karty urlopowej generowanej po akceptacji. Checkbox wysyłki SMS o urlopach znajdziesz w ustawieniach SMS."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia">Wróć do ustawień</Link>
          </Button>
        }
      />

      <div className="grid gap-6">
        <DictionarySection dictionaryKey="leave_type" />
        <LeaveCardTemplateEditor />

        <div className="rounded-xl border border-border/80 bg-surface-muted/15 p-4 text-sm text-muted">
          Powiadomienia SMS o urlopach (prośba do przełożonego, decyzja do pracownika) włączasz w{" "}
          <Link href="/ustawienia/sms" className="text-accent hover:underline">
            ustawieniach SMS
          </Link>
          .
        </div>
      </div>
    </>
  );
}
