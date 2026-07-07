"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { KnowledgeBaseSettings } from "@/lib/knowledge/settings";
import { useKnowledgeStore } from "@/store/knowledge-store";

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  badge?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3 ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span>
        <span className="flex items-center gap-2 font-medium text-foreground">
          {title}
          {badge ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
    </label>
  );
}

export function KnowledgeSettingsPanel() {
  const settings = useKnowledgeStore((s) => s.settings);
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const isSaving = useKnowledgeStore((s) => s.isSaving);
  const updateSettings = useKnowledgeStore((s) => s.updateSettings);
  const ensure = useKnowledgeStore((s) => s.ensure);
  const [draft, setDraft] = useState<KnowledgeBaseSettings>(settings);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  async function handleToggle(patch: Partial<KnowledgeBaseSettings>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    try {
      await updateSettings(next);
    } catch {
      setDraft(settings);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Ustawienia bazy wiedzy</h2>
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Zapisywanie…
            </span>
          ) : null}
        </div>

        <ToggleRow
          title="Sugestie AI w formularzu zgłoszenia serwisowego"
          description="Zanim klient wyśle zgłoszenie serwisowe, AI zaproponuje sprawdzenie bazy wiedzy firmy i podsunie możliwe rozwiązanie problemu do samodzielnego wypróbowania."
          checked={hydrated ? draft.enableIntakeSuggestions : true}
          onChange={(checked) => void handleToggle({ enableIntakeSuggestions: checked })}
        />

        <ToggleRow
          title="Wiedza z wiarygodnych źródeł internetowych"
          description="Pozwoli AI wspierać się dodatkowo internetem, jeśli baza firmy nie zawiera odpowiedzi. Funkcja w przygotowaniu — na razie sugestie korzystają wyłącznie z bazy wiedzy firmy i historii zgłoszeń."
          checked={false}
          disabled
          badge="Wkrótce"
        />

        <p className="flex items-start gap-2 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Wyszukiwanie działa w oparciu o dopasowanie słów kluczowych z opisu zgłoszenia do treści
          dodanych źródeł oraz historii zgłoszeń serwisowych — bez wysyłania danych poza bazę
          firmy (poza samym zapytaniem do modelu AI).
        </p>
      </CardContent>
    </Card>
  );
}
