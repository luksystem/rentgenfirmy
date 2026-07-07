"use client";

import { useEffect, useState } from "react";
import { Info, Loader2, Lock, RotateCcw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import {
  DEFAULT_KNOWLEDGE_SUGGESTION_INSTRUCTIONS,
  type KnowledgeBaseSettings,
} from "@/lib/knowledge/settings";
import { useAuthStore } from "@/store/auth-store";
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
  const isAdministrator = useAuthStore((s) => s.isAdministrator);
  const [draft, setDraft] = useState<KnowledgeBaseSettings>(settings);
  const [promptDraft, setPromptDraft] = useState(settings.suggestionPromptInstructions);
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  useEffect(() => {
    setDraft(settings);
    setPromptDraft(settings.suggestionPromptInstructions);
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

  async function handleSavePrompt() {
    setPromptError(null);
    setPromptSaving(true);
    setPromptSaved(false);
    try {
      await updateSettings({ ...draft, suggestionPromptInstructions: promptDraft });
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2500);
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : "Nie udało się zapisać promptu.");
    } finally {
      setPromptSaving(false);
    }
  }

  const promptChanged = promptDraft !== settings.suggestionPromptInstructions;

  return (
    <div className="grid gap-6">
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

      {isAdministrator ? (
        <Card>
          <CardContent className="grid gap-4 py-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                Prompt AI do sugestii i wyszukiwania
              </h2>
              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted">
                Tylko administrator
              </span>
            </div>

            <p className="text-sm text-muted">
              Ta treść trafia do modelu AI jako instrukcja przed opisem problemu klienta,
              fragmentami bazy wiedzy i historią zgłoszeń (te elementy dokładane są automatycznie —
              nie trzeba ani nie można ich tu wpisywać). Zmieniaj z ostrożnością — błędny prompt
              może wpłynąć na jakość sugestii dla klientów.
            </p>

            <Field label="Instrukcje promptu">
              <Textarea
                rows={14}
                value={promptDraft}
                onChange={(event) => {
                  setPromptDraft(event.target.value);
                  setPromptSaved(false);
                }}
                className="font-mono text-xs leading-relaxed"
              />
            </Field>

            {promptError ? <p className="text-sm text-rose-400">{promptError}</p> : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!promptChanged || promptSaving}
                onClick={() => void handleSavePrompt()}
              >
                {promptSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Zapisz prompt
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={promptSaving || promptDraft === DEFAULT_KNOWLEDGE_SUGGESTION_INSTRUCTIONS}
                onClick={() => {
                  setPromptDraft(DEFAULT_KNOWLEDGE_SUGGESTION_INSTRUCTIONS);
                  setPromptSaved(false);
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Przywróć domyślny
              </Button>
              {promptSaved ? (
                <span className="text-xs text-emerald-400">Zapisano.</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-2 py-4 text-xs text-muted">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Prompt AI do sugestii może edytować tylko administrator.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
