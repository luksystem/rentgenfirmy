"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { ContractContentBlock } from "@/lib/contracts/types";
import { useContractStore } from "@/store/contract-store";

function BlockEditor({
  block,
  onSave,
  onCancel,
}: {
  block: ContractContentBlock;
  onSave: (block: ContractContentBlock) => Promise<void>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(block);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!draft.title.trim()) {
      window.alert("Podaj tytuł bloku treści.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      onCancel?.();
    } catch {
      window.alert("Nie udało się zapisać bloku treści.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tytuł">
          <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </Field>
        <Field label="Kategoria (opcjonalnie)">
          <Input
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            placeholder="Np. Postanowienia ogólne"
          />
        </Field>
      </div>
      <Field label="Treść">
        <Textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} rows={5} />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
            Anuluj
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Zapisywanie…" : "Zapisz"}
        </Button>
      </div>
    </div>
  );
}

export function ContractContentBlockList() {
  const contentBlocks = useContractStore((state) => state.contentBlocks);
  const saveContentBlock = useContractStore((state) => state.saveContentBlock);
  const removeContentBlock = useContractStore((state) => state.removeContentBlock);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      {contentBlocks.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          Brak bloków treści. Dodaj pierwszy powyżej.
        </Card>
      ) : (
        contentBlocks.map((block) => (
          <Card key={block.id} className="p-4">
            {editingId === block.id ? (
              <BlockEditor
                block={block}
                onSave={async (next) => {
                  await saveContentBlock(next);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="grid gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{block.title}</p>
                    {block.category ? <p className="text-xs text-muted">{block.category}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(block.id)}>
                      Edytuj
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm("Usunąć ten blok treści?")) {
                          return;
                        }
                        try {
                          await removeContentBlock(block.id);
                        } catch {
                          window.alert("Nie udało się usunąć bloku treści.");
                        }
                      }}
                    >
                      Usuń
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm text-muted">{block.content}</p>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

export function NewContentBlockCard({ onCreated }: { onCreated?: () => void }) {
  const saveContentBlock = useContractStore((state) => state.saveContentBlock);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Dodaj blok treści
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <BlockEditor
        block={{ id: crypto.randomUUID(), title: "", category: "", content: "", createdAt: "", updatedAt: "" }}
        onSave={async (block) => {
          await saveContentBlock(block);
          onCreated?.();
        }}
        onCancel={() => setOpen(false)}
      />
    </Card>
  );
}
