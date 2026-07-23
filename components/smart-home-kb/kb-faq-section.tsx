"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { RichHtml } from "@/components/ui/rich-html";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SmartHomeKbCategory, SmartHomeKbFaqItem, SmartHomeKbStatus } from "@/lib/smart-home-kb/types";
import { useSmartHomeKbStore } from "@/store/smart-home-kb-store";

function FaqFormDialog({
  open,
  onOpenChange,
  faq,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq: SmartHomeKbFaqItem | null;
  categories: SmartHomeKbCategory[];
}) {
  const createFaqItem = useSmartHomeKbStore((state) => state.createFaqItem);
  const updateFaqItem = useSmartHomeKbStore((state) => state.updateFaqItem);

  const [question, setQuestion] = useState("");
  const [answerHtml, setAnswerHtml] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<SmartHomeKbStatus>("published");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuestion(faq?.question ?? "");
    setAnswerHtml(faq?.answerHtml ?? "");
    setCategoryId(faq?.categoryId ?? null);
    setStatus(faq?.status ?? "published");
    setError(null);
  }, [open, faq]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) {
      setError("Podaj treść pytania.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { question, answerHtml, categoryId, status };
      if (faq) {
        await updateFaqItem(faq.id, input);
      } else {
        await createFaqItem(input);
      }
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać pytania.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{faq ? "Edytuj pytanie FAQ" : "Dodaj pytanie FAQ"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Pytanie">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
              placeholder="np. Co zrobić, gdy aplikacja nie łączy się z systemem?"
            />
          </Field>

          <Field label="Odpowiedź">
            <RichTextarea value={answerHtml} onChange={setAnswerHtml} rows={5} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategoria">
              <Select
                value={categoryId ?? ""}
                onChange={(event) => setCategoryId(event.target.value || null)}
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
              <Select value={status} onChange={(event) => setStatus(event.target.value as SmartHomeKbStatus)}>
                <option value="published">Opublikowane</option>
                <option value="draft">Szkic (niewidoczny dla klientów)</option>
              </Select>
            </Field>
          </div>

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

export function KbFaqSection({
  faqItems,
  categories,
  canManage,
}: {
  faqItems: SmartHomeKbFaqItem[];
  categories: SmartHomeKbCategory[];
  canManage: boolean;
}) {
  const removeFaqItem = useSmartHomeKbStore((state) => state.removeFaqItem);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<SmartHomeKbFaqItem | null>(null);

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-3">
      {canManage ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingFaq(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Dodaj pytanie
          </Button>
        </div>
      ) : null}

      {faqItems.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-sm text-muted">Brak pytań w tej sekcji.</div>
        </Card>
      ) : (
        faqItems.map((faq) => {
          const isOpen = openIds.has(faq.id);
          const category = faq.categoryId ? categoryById.get(faq.categoryId) : null;
          return (
            <Card key={faq.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(faq.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium text-foreground">{faq.question}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {faq.status === "draft" ? <Badge tone="waiting">Szkic</Badge> : null}
                    {category ? <Badge tone="blue">{category.name}</Badge> : null}
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", isOpen && "rotate-180")} />
              </button>

              {isOpen ? (
                <div className="border-t border-border/60 p-4 pt-3">
                  <RichHtml html={faq.answerHtml} variant="document" />
                  {canManage ? (
                    <div className="mt-3 flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingFaq(faq);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edytuj
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void removeFaqItem(faq.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })
      )}

      <FaqFormDialog open={formOpen} onOpenChange={setFormOpen} faq={editingFaq} categories={categories} />
    </div>
  );
}
