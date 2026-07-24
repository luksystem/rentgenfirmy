"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { reportProblem } from "@/lib/supabase/goal-problem-repository";
import { useAuthStore } from "@/store/auth-store";

export function ReportProblemDialog({ onReported }: { onReported?: () => void }) {
  const profile = useAuthStore((state) => state.profile);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) {
      return;
    }
    if (!title.trim()) {
      setError("Opisz krótko, na czym polega problem.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await reportProblem({ title, description }, profile.id);
      setOpen(false);
      setTitle("");
      setDescription("");
      onReported?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zgłosić problemu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Zgłoś problem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zgłoś problem do rozwiązania</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Na czym polega problem?">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="np. Nie mamy własnej drabiny, wypożyczamy raz w tygodniu"
              autoFocus
            />
          </Field>
          <Field label="Szczegóły (opcjonalnie)">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ile to kosztuje czasu/pieniędzy, jak często się powtarza..."
              rows={4}
            />
          </Field>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Zgłaszanie..." : "Zgłoś problem"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
