"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LeaveCardTemplateSettings } from "@/lib/leave/leave-settings";
import {
  getLeaveCardSignedUrl,
  removeLeaveCardFile,
  uploadLeaveCardTemplate,
} from "@/lib/supabase/leave-card-repository";

/** Wzór karty urlopowej PDF (jak wzór protokołu) — dołączany jednorazowo, do niego
 * dopisywane są dane pracownika, zakres dat i podpis po akceptacji wniosku. */
export function LeaveCardTemplateEditor() {
  const [settings, setSettings] = useState<LeaveCardTemplateSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/leave-card-template", { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać wzoru karty urlopowej.");
      }
      const next = payload.settings as LeaveCardTemplateSettings;
      setSettings(next);
      if (next.path) {
        setPreviewUrl(await getLeaveCardSignedUrl(next.path));
      } else {
        setPreviewUrl(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd wczytywania.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const previousPath = settings?.path ?? null;
      const uploaded = await uploadLeaveCardTemplate(file);
      const response = await fetch("/api/settings/leave-card-template", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: uploaded }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać wzoru.");
      }
      if (previousPath) {
        await removeLeaveCardFile(previousPath);
      }
      setSettings(payload.settings);
      setPreviewUrl(await getLeaveCardSignedUrl(uploaded.path));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Błąd wgrywania wzoru.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    if (!settings?.path) {
      return;
    }
    if (!window.confirm("Usunąć wzór karty urlopowej? Nowe akceptacje będą generować prosty raport bez wzoru.")) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/leave-card-template", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { path: null, name: null } }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się usunąć wzoru.");
      }
      await removeLeaveCardFile(settings.path);
      setSettings(payload.settings);
      setPreviewUrl(null);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Błąd usuwania wzoru.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Wzór karty urlopowej (PDF)</h2>
          <p className="mt-1 text-xs text-muted">
            Opcjonalny wzór PDF dołączony przez firmę — po akceptacji wniosku na jego ostatniej stronie
            dopisywane są dane pracownika, zakres dat urlopu i podpis elektroniczny. Bez wzoru generowany jest
            prosty raport z tymi samymi informacjami.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Wczytywanie…</p>
        ) : settings?.path ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface-muted/15 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{settings.name}</p>
              {previewUrl ? (
                <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                  Podgląd wzoru
                </a>
              ) : null}
            </div>
            <Button type="button" size="sm" variant="ghost" disabled={uploading} onClick={() => void handleRemove()}>
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            </Button>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted">
            Brak wgranego wzoru — karty urlopowe będą generowane jako prosty raport.
          </p>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? "Wgrywanie…" : settings?.path ? "Zamień wzór" : "Wgraj wzór PDF"}
          </Button>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
