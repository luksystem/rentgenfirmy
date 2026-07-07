"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  SquarePlay,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  KNOWLEDGE_SOURCE_STATUS_LABELS,
  KNOWLEDGE_SOURCE_TYPE_LABELS,
  type KnowledgeSourceType,
} from "@/lib/knowledge/types";
import { cn, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useKnowledgeStore } from "@/store/knowledge-store";

const TYPE_OPTIONS: Array<{ id: KnowledgeSourceType; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "pdf", icon: FileText },
  { id: "text", icon: FileText },
  { id: "whatsapp", icon: MessageSquareText },
  { id: "link", icon: Link2 },
  { id: "youtube", icon: SquarePlay },
];

const FILE_TYPES: KnowledgeSourceType[] = ["pdf", "text", "whatsapp"];

function StatusBadge({
  status,
  errorMessage,
}: {
  status: keyof typeof KNOWLEDGE_SOURCE_STATUS_LABELS;
  errorMessage: string | null;
}) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {KNOWLEDGE_SOURCE_STATUS_LABELS[status]}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-300"
        title={errorMessage ?? undefined}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {KNOWLEDGE_SOURCE_STATUS_LABELS[status]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
      <Loader2 className={cn("h-3.5 w-3.5", status === "processing" && "animate-spin")} />
      {KNOWLEDGE_SOURCE_STATUS_LABELS[status]}
    </span>
  );
}

export function KnowledgeSourceManager() {
  const sources = useKnowledgeStore((s) => s.sources);
  const isLoading = useKnowledgeStore((s) => s.isLoading);
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const error = useKnowledgeStore((s) => s.error);
  const ensure = useKnowledgeStore((s) => s.ensure);
  const addFileSource = useKnowledgeStore((s) => s.addFileSource);
  const addUrlSource = useKnowledgeStore((s) => s.addUrlSource);
  const removeSource = useKnowledgeStore((s) => s.removeSource);
  const retrySource = useKnowledgeStore((s) => s.retrySource);
  const displayName = useAuthStore((s) => s.displayName);

  const [type, setType] = useState<KnowledgeSourceType>("pdf");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setUrl("");
    setFile(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const createdByName = displayName || "Zespół";

    try {
      setSubmitting(true);
      if (FILE_TYPES.includes(type)) {
        if (!file) {
          setFormError("Wybierz plik do przesłania.");
          return;
        }
        await addFileSource({
          type: type as "pdf" | "text" | "whatsapp",
          title: title.trim() || file.name,
          description,
          file,
          createdByName,
        });
      } else {
        if (!url.trim()) {
          setFormError("Podaj adres URL.");
          return;
        }
        await addUrlSource({
          type: type as "link" | "youtube",
          title: title.trim() || url.trim(),
          description,
          url: url.trim(),
          createdByName,
        });
      }
      resetForm();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Nie udało się dodać źródła.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(sourceId: string) {
    if (!window.confirm("Usunąć to źródło z bazy wiedzy? Tej operacji nie można odwrócić.")) {
      return;
    }
    try {
      await removeSource(sourceId);
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć źródła.");
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 py-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Dodaj nowe źródło</h2>
            <p className="mt-1 text-sm text-muted">
              PDF, plik tekstowy, eksport czatu WhatsApp (.txt), link do dokumentacji albo film
              YouTube — treść zostanie automatycznie wydobyta i zaindeksowana do wyszukiwania przez
              AI.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setType(option.id);
                  setFormError(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                  type === option.id
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-surface-muted/20 text-muted hover:border-accent/40",
                )}
              >
                <option.icon className="h-4 w-4" />
                {KNOWLEDGE_SOURCE_TYPE_LABELS[option.id]}
              </button>
            ))}
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

            {FILE_TYPES.includes(type) ? (
              <Field label={type === "whatsapp" ? "Eksport czatu (.txt) *" : "Plik *"}>
                <Input
                  type="file"
                  accept={type === "pdf" ? "application/pdf" : "text/plain,.txt"}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </Field>
            ) : (
              <Field label={type === "youtube" ? "Link do filmu YouTube *" : "Adres URL *"}>
                <Input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={
                    type === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://…"
                  }
                />
              </Field>
            )}

            <Field label="Tytuł (opcjonalnie)">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Zostanie ustawiony automatycznie, jeśli puste"
              />
            </Field>

            <Field label="Opis / notatka (opcjonalnie)">
              <Textarea
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Krótki kontekst, np. dotyczy modelu X, czujników DALI…"
              />
            </Field>

            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Dodaj do bazy wiedzy
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Źródła w bazie wiedzy</h2>
            <span className="text-xs text-muted">{sources.length} pozycji</span>
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          {isLoading && !hydrated ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Wczytywanie…
            </p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted">
              Baza wiedzy jest jeszcze pusta — dodaj pierwszy dokument, link albo film powyżej.
            </p>
          ) : (
            <ul className="grid gap-2">
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/15 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-medium text-foreground">{source.title}</p>
                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted">
                        {KNOWLEDGE_SOURCE_TYPE_LABELS[source.type]}
                      </span>
                      <StatusBadge status={source.status} errorMessage={source.errorMessage} />
                    </div>
                    {source.description ? (
                      <p className="mt-1 text-xs text-muted">{source.description}</p>
                    ) : null}
                    {source.status === "error" && source.errorMessage ? (
                      <p className="mt-1 text-xs text-rose-400">{source.errorMessage}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">
                      Dodano {formatDateTime(source.createdAt)} — {source.createdByName}
                      {source.charCount > 0 ? ` · ${source.charCount.toLocaleString("pl-PL")} znaków` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {source.status === "error" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void retrySource(source.id)}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Spróbuj ponownie
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDelete(source.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
