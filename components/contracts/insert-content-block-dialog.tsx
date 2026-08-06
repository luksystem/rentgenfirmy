"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ContractContentBlock } from "@/lib/contracts/types";

export function InsertContentBlockDialog({
  open,
  onOpenChange,
  blocks,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: ContractContentBlock[];
  onInsert: (block: ContractContentBlock) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = blocks.filter((block) =>
    `${block.title} ${block.category} ${block.content}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wstaw blok treści z biblioteki</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Szukaj po tytule lub treści…"
          />
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-center text-sm text-muted">
              Brak bloków treści. Dodaj je w Umowy → Biblioteka treści.
            </p>
          ) : (
            <div className="grid gap-2">
              {filtered.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => {
                    onInsert(block);
                    onOpenChange(false);
                  }}
                  className="rounded-xl border border-border/80 bg-surface-muted/20 p-3 text-left transition hover:border-accent/50 hover:bg-accent/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{block.title || "Bez tytułu"}</p>
                    {block.category ? (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted">
                        {block.category}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{block.content}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
