"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ChatNewRoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: (roomId: string) => void;
};

export function ChatNewRoomDialog({ open, onOpenChange, projectId, onCreated }: ChatNewRoomDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Podaj nazwę pokoju.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, name: name.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Nie udało się utworzyć pokoju.");
      }
      const data = await response.json();
      setName("");
      onCreated(data.room.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć pokoju.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowy pokój</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Nazwa pokoju</label>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="np. Elektryka"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
            />
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            Utwórz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
