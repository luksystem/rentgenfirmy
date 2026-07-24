"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS } from "@/lib/smart-home-kb/ai-settings";
import {
  fetchSmartHomeKbAiSettings,
  saveSmartHomeKbAiSettings,
} from "@/lib/supabase/smart-home-kb-ai-client";

export function KbAiSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [instructions, setInstructions] = useState(DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setSaved(false);
    setLoading(true);
    fetchSmartHomeKbAiSettings()
      .then((settings) => setInstructions(settings.restructurePromptInstructions))
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać ustawień."))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveSmartHomeKbAiSettings({ restructurePromptInstructions: instructions });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać ustawień.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[min(640px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Ustawienia AI — porządkowanie artykułów</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <p className="text-sm text-muted">
            Ta treść trafia do modelu AI jako instrukcja, gdy klikniesz „Uporządkuj z AI” w formularzu
            artykułu. Sam tekst do uporządkowania jest dołączany automatycznie.
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : (
            <Field label="Instrukcje promptu">
              <Textarea
                rows={12}
                value={instructions}
                onChange={(event) => {
                  setInstructions(event.target.value);
                  setSaved(false);
                }}
                className="font-mono text-xs leading-relaxed"
              />
            </Field>
          )}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving || instructions === DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS}
              onClick={() => {
                setInstructions(DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS);
                setSaved(false);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Przywróć domyślny
            </Button>
            <Button type="button" disabled={saving || loading} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Zapisz
            </Button>
            {saved ? <span className="text-xs text-emerald-400">Zapisano.</span> : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
