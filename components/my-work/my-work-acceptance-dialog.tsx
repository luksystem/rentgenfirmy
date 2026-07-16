"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import {
  WORK_ITEM_ACCEPTANCE_ACTION_LABELS,
  WORK_ITEM_ACCEPTANCE_ACTIONS,
  type WorkItemAcceptanceAction,
  type WorkItemView,
} from "@/lib/my-work/types";
import { useMentionOptionsFromProfiles } from "@/hooks/use-team-mention-options";
import { formatDate } from "@/lib/utils";
import { useMyWorkStore } from "@/store/my-work-store";

export function MyWorkAcceptanceDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
}: {
  item: WorkItemView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (action: WorkItemAcceptanceAction, comment: string, withoutReservations: boolean) => Promise<void>;
}) {
  const teamProfiles = useMyWorkStore((state) => state.teamProfiles);
  const { mentionOptions } = useMentionOptionsFromProfiles(teamProfiles);
  const [action, setAction] = useState<WorkItemAcceptanceAction>("accept");
  const [comment, setComment] = useState("");
  const [withoutReservations, setWithoutReservations] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!item) return;
    if (action !== "accept" && !comment.trim()) {
      window.alert("Podaj komentarz lub uzasadnienie.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(action, comment, withoutReservations);
      onOpenChange(false);
      setComment("");
      setAction("accept");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zapisać przyjęcia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Przyjęcie zadania</DialogTitle>
          <DialogDescription>
            Potwierdź, że zapoznałeś się z zadaniem, rozumiesz oczekiwany rezultat i znasz termin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm">
          <p className="font-medium text-foreground">{item.title}</p>
          {item.expectedResult ? (
            <p>
              <span className="text-muted">Oczekiwany rezultat: </span>
              {item.expectedResult}
            </p>
          ) : null}
          {item.dueDate ? (
            <p>
              <span className="text-muted">Termin: </span>
              {formatDate(item.dueDate)}
            </p>
          ) : null}
        </div>

        <Field label="Akcja">
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={action}
            onChange={(event) => setAction(event.target.value as WorkItemAcceptanceAction)}
          >
            {WORK_ITEM_ACCEPTANCE_ACTIONS.map((entry) => (
              <option key={entry} value={entry}>
                {WORK_ITEM_ACCEPTANCE_ACTION_LABELS[entry]}
              </option>
            ))}
          </select>
        </Field>

        {action === "accept" ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={withoutReservations}
              onChange={(event) => setWithoutReservations(event.target.checked)}
              className="mt-1"
            />
            <span>
              Potwierdzam zapoznanie się z zadaniem bez zastrzeżeń — rozumiem rezultat, termin i na ten
              moment nie widzę przeszkód.
            </span>
          </label>
        ) : (
          <Field label="Komentarz / uzasadnienie">
            <MentionTextarea
              value={comment}
              onChange={setComment}
              mentionOptions={mentionOptions}
              rows={3}
              placeholder="Uzasadnienie… użyj @ aby oznaczyć"
            />
          </Field>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Zapisywanie…" : "Zapisz przyjęcie"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
