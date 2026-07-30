"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import type { ProjectProcessSnapshot } from "@/lib/process/types";
import { formatDateTime } from "@/lib/utils";

type ProcessSnapshotBoardProps = {
  projectId: string;
  projectProcessItemId: string;
  clientMessage: string;
  onToggleComplete?: (completed: boolean) => void;
};

export function ProcessSnapshotBoard({
  projectId,
  projectProcessItemId,
  clientMessage,
  onToggleComplete,
}: ProcessSnapshotBoardProps) {
  const [snapshot, setSnapshot] = useState<ProjectProcessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplaceForm, setShowReplaceForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const baseUrl = `/api/projects/${encodeURIComponent(projectId)}/process/items/${encodeURIComponent(projectProcessItemId)}/snapshot`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(baseUrl, { credentials: "include" })
      .then((response) => response.json())
      .then((body: { snapshot: ProjectProcessSnapshot | null }) => {
        if (!cancelled) {
          setSnapshot(body.snapshot ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  async function handleUpload() {
    if (!file) {
      setError("Wybierz zdjęcie do przesłania.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (note.trim()) {
        formData.append("employeeNote", note.trim());
      }
      const response = await fetch(baseUrl, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = (await response.json().catch(() => ({}))) as {
        snapshot?: ProjectProcessSnapshot;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Nie udało się wysłać zdjęcia.");
      }
      setSnapshot(body.snapshot ?? null);
      setFile(null);
      setNote("");
      setShowReplaceForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onToggleComplete?.(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nie udało się wysłać zdjęcia.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Wczytywanie…</p>;
  }

  const showForm = !snapshot || showReplaceForm;

  return (
    <div className="grid gap-4">
      {clientMessage.trim() ? (
        <div className="rounded-xl border border-border/70 bg-surface-muted/25 p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Wiadomość dla klienta
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{clientMessage}</p>
        </div>
      ) : null}

      {snapshot ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-200">
            <Camera className="h-4 w-4 shrink-0" />
            Wysłano do klienta
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={snapshot.url}
            alt={snapshot.fileName}
            className="mt-2 max-h-64 w-fit rounded-lg border border-border/60 object-contain"
          />
          {snapshot.employeeNote ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{snapshot.employeeNote}</p>
          ) : null}
          <p className="mt-1.5 text-[11px] text-muted">
            {snapshot.uploadedByName} · {formatDateTime(snapshot.createdAt)}
          </p>
          {!showReplaceForm ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowReplaceForm(true)}
            >
              Wyślij nowe zdjęcie
            </Button>
          ) : null}
        </div>
      ) : null}

      {showForm ? (
        <div className="rounded-xl border border-border/70 bg-surface-muted/25 p-3.5">
          <Field label="Zdjęcie">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
            />
          </Field>
          <Field label="Notatka (opcjonalnie)" className="mt-3">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="np. Gotowe, montaż zakończony…"
            />
          </Field>
          {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={!file || uploading} onClick={() => void handleUpload()}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {uploading ? "Wysyłanie…" : "Wyślij do klienta"}
            </Button>
            {snapshot && showReplaceForm ? (
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => {
                  setShowReplaceForm(false);
                  setFile(null);
                  setNote("");
                  setError(null);
                }}
              >
                Anuluj
              </Button>
            ) : null}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
            <Upload className="h-3 w-3 shrink-0" />
            Po wysłaniu klient dostanie SMS z linkiem i mail ze zdjęciem, a osoba odpowiedzialna za
            etap — powiadomienie push.
          </p>
        </div>
      ) : null}
    </div>
  );
}
