"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { LeaveRequest } from "@/lib/leave/types";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useLeaveStore } from "@/store/leave-store";

type EditLeaveRequestDialogProps = {
  item: LeaveRequest;
  employeeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditLeaveRequestDialog({
  item,
  employeeName,
  open,
  onOpenChange,
}: EditLeaveRequestDialogProps) {
  const leaveTypes = useDictionaryStore((state) => state.byKey("leave_type"));
  const updateRequest = useLeaveStore((state) => state.updateRequest);

  const [leaveTypeItemId, setLeaveTypeItemId] = useState(item.leaveTypeItemId ?? "");
  const [startDate, setStartDate] = useState(item.startDate);
  const [endDate, setEndDate] = useState(item.endDate);
  const [note, setNote] = useState(item.note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLeaveTypeItemId(item.leaveTypeItemId ?? "");
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setNote(item.note);
    setError(null);
  }, [open, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!leaveTypeItemId) {
      setError("Wybierz typ dostępności.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("Data „do” nie może być wcześniejsza niż data „od”.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateRequest(item.id, {
        leaveTypeItemId,
        startDate,
        endDate,
        note: note.trim(),
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać zmian.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edycja wniosku — {employeeName}</DialogTitle>
        </DialogHeader>

        {item.status === "approved" ? (
          <p className="mb-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Wniosek jest zaakceptowany — zapis zaktualizuje daty, kartę PDF, kalendarz i wpisy czasu pracy.
          </p>
        ) : null}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Typ dostępności">
            <Select value={leaveTypeItemId} onChange={(event) => setLeaveTypeItemId(event.target.value)}>
              <option value="">— wybierz —</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data od">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label="Data do">
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </Field>
          </div>

          <Field label="Notatka">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
          </Field>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
