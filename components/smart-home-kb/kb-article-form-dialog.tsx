"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { YoutubeEmbed } from "@/components/smart-home-kb/youtube-embed";
import { isValidYoutubeUrl } from "@/lib/smart-home-kb/youtube";
import type {
  SmartHomeKbArticle,
  SmartHomeKbCategory,
  SmartHomeKbStatus,
  SmartHomeKbTag,
} from "@/lib/smart-home-kb/types";
import { useSmartHomeKbStore } from "@/store/smart-home-kb-store";
import { useAuthStore } from "@/store/auth-store";

type FormState = {
  title: string;
  summary: string;
  bodyHtml: string;
  categoryId: string | null;
  youtubeUrl: string;
  status: SmartHomeKbStatus;
  tagIds: string[];
};

function emptyForm(): FormState {
  return { title: "", summary: "", bodyHtml: "", categoryId: null, youtubeUrl: "", status: "published", tagIds: [] };
}

export function KbArticleFormDialog({
  open,
  onOpenChange,
  article,
  categories,
  tags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: SmartHomeKbArticle | null;
  categories: SmartHomeKbCategory[];
  tags: SmartHomeKbTag[];
}) {
  const displayName = useAuthStore((state) => state.displayName);
  const createArticle = useSmartHomeKbStore((state) => state.createArticle);
  const updateArticle = useSmartHomeKbStore((state) => state.updateArticle);
  const uploadArticleCover = useSmartHomeKbStore((state) => state.uploadArticleCover);
  const addArticleMedia = useSmartHomeKbStore((state) => state.addArticleMedia);
  const removeArticleMedia = useSmartHomeKbStore((state) => state.removeArticleMedia);
  const ensureTag = useSmartHomeKbStore((state) => state.ensureTag);
  const articles = useSmartHomeKbStore((state) => state.articles);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [tagInput, setTagInput] = useState("");
  const [tagInputActive, setTagInputActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const liveArticle = useMemo(
    () => (article ? (articles.find((item) => item.id === article.id) ?? article) : null),
    [articles, article],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (article) {
      setForm({
        title: article.title,
        summary: article.summary,
        bodyHtml: article.bodyHtml,
        categoryId: article.categoryId,
        youtubeUrl: article.youtubeUrl ?? "",
        status: article.status,
        tagIds: article.tagIds,
      });
    } else {
      setForm(emptyForm());
    }
    setTagInput("");
    setError(null);
  }, [open, article]);

  const selectedTags = form.tagIds
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is SmartHomeKbTag => Boolean(tag));

  const trimmedTagInput = tagInput.trim().toLowerCase();
  const tagSuggestions = tags.filter(
    (tag) =>
      !form.tagIds.includes(tag.id) &&
      (trimmedTagInput.length === 0 || tag.name.toLowerCase().includes(trimmedTagInput)),
  );
  const showTagSuggestions = tagInputActive && tagSuggestions.length > 0;
  const exactTagMatch = tags.some((tag) => tag.name.toLowerCase() === trimmedTagInput);

  async function addTagByName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    try {
      const tag = await ensureTag(trimmed);
      setForm((prev) => (prev.tagIds.includes(tag.id) ? prev : { ...prev, tagIds: [...prev.tagIds, tag.id] }));
      setTagInput("");
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : "Nie udało się dodać tagu.");
    }
  }

  function removeTagId(id: string) {
    setForm((prev) => ({ ...prev, tagIds: prev.tagIds.filter((tagId) => tagId !== id) }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Podaj tytuł artykułu.");
      return;
    }
    if (form.youtubeUrl.trim() && !isValidYoutubeUrl(form.youtubeUrl)) {
      setError("Link do YouTube wygląda na niepoprawny.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = {
        title: form.title,
        summary: form.summary,
        bodyHtml: form.bodyHtml,
        categoryId: form.categoryId,
        youtubeUrl: form.youtubeUrl.trim() || null,
        status: form.status,
        tagIds: form.tagIds,
        createdByName: displayName || "Zespół",
      };

      if (article) {
        await updateArticle(article.id, input);
      } else {
        await createArticle(input);
      }
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać artykułu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !article) {
      return;
    }
    setUploadingCover(true);
    setError(null);
    try {
      await uploadArticleCover(article.id, file);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nie udało się przesłać zdjęcia.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleMediaChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !article) {
      return;
    }
    setUploadingMedia(true);
    setError(null);
    try {
      await addArticleMedia(article.id, file);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nie udało się przesłać zdjęcia.");
    } finally {
      setUploadingMedia(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[min(760px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{article ? "Edytuj artykuł" : "Dodaj artykuł"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Tytuł">
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="np. Jak zresetować sterownik oświetlenia"
            />
          </Field>

          <Field label="Krótki opis (widoczny na liście)">
            <Textarea
              value={form.summary}
              onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              rows={2}
              placeholder="Jedno-dwa zdania podsumowania"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategoria">
              <Select
                value={form.categoryId ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryId: event.target.value || null }))
                }
              >
                <option value="">Bez kategorii</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Status">
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as SmartHomeKbStatus }))
                }
              >
                <option value="published">Opublikowany</option>
                <option value="draft">Szkic (niewidoczny dla klientów)</option>
              </Select>
            </Field>
          </div>

          <Field label="Tagi">
            <div className="grid gap-2">
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="flex items-center gap-1 rounded-full border border-border bg-surface-muted/40 px-2 py-1 text-xs text-foreground"
                    >
                      #{tag.name}
                      <button type="button" onClick={() => removeTagId(tag.id)} aria-label="Usuń tag">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="relative">
                <Input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onFocus={() => setTagInputActive(true)}
                  onBlur={() => window.setTimeout(() => setTagInputActive(false), 150)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addTagByName(tagInput);
                    }
                  }}
                  placeholder="Szukaj istniejącego tagu lub wpisz nowy i naciśnij Enter"
                />
                {showTagSuggestions ? (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1 shadow-card">
                    {trimmedTagInput.length > 0 && !exactTagMatch ? (
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-accent hover:bg-surface-muted"
                        onClick={() => void addTagByName(tagInput)}
                      >
                        Utwórz nowy tag „{tagInput.trim()}”
                      </button>
                    ) : null}
                    {tagSuggestions.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-muted"
                        onClick={() => void addTagByName(tag.name)}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-muted">
                Wybieraj z istniejących tagów, żeby uniknąć duplikatów podobnych nazw. Usunięcie tagu tutaj
                tylko odłącza go od tego artykułu — żeby usunąć tag całkowicie, zrób to w „Kategorie i tagi”.
              </p>
            </div>
          </Field>

          <Field label="Link do filmu YouTube (opcjonalnie)">
            <Input
              value={form.youtubeUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, youtubeUrl: event.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {form.youtubeUrl.trim() && isValidYoutubeUrl(form.youtubeUrl) ? (
              <YoutubeEmbed url={form.youtubeUrl} className="mt-2" />
            ) : null}
          </Field>

          <Field label="Treść artykułu">
            <RichTextarea
              value={form.bodyHtml}
              onChange={(value) => setForm((prev) => ({ ...prev, bodyHtml: value }))}
              rows={8}
              placeholder="Opisz krok po kroku..."
            />
          </Field>

          {article ? (
            <Field label="Zdjęcia">
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  {liveArticle?.coverImageUrl ? (
                    <div className="relative h-20 w-28 overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={liveArticle.coverImageUrl}
                        alt="Zdjęcie główne"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 text-center text-[10px] text-white">
                        Główne
                      </span>
                    </div>
                  ) : null}
                  {liveArticle?.media.map((item) => (
                    <div key={item.id} className="relative h-20 w-28 overflow-hidden rounded-lg border border-border">
                      {item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt={item.fileName} className="h-full w-full object-cover" />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void removeArticleMedia(article.id, item.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                        aria-label="Usuń zdjęcie"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    Zdjęcie główne
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingMedia}
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    {uploadingMedia ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    Dodaj zdjęcie do galerii
                  </Button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                  <input
                    ref={mediaInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMediaChange}
                  />
                </div>
              </div>
            </Field>
          ) : (
            <p className="text-xs text-muted">
              Zdjęcia będzie można dodać po zapisaniu artykułu.
            </p>
          )}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Zapisz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
