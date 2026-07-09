"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useLeaveStore } from "@/store/leave-store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CreateLeaveRequestDialog() {
  const profile = useAuthStore((state) => state.profile);
  const leaveTypes = useDictionaryStore((state) => state.byKey("leave_type"));
  const createRequest = useLeaveStore((state) => state.createRequest);

  const [open, setOpen] = useState(false);
  const [leaveTypeItemId, setLeaveTypeItemId] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingSupervisor = !profile?.supervisorId && profile?.role !== "administrator";

  function resetForm() {
    setLeaveTypeItemId("");
    setStartDate(todayIso());
    setEndDate(todayIso());
    setNote("");
    setError(null);
  }

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
      await createRequest({ leaveTypeItemId, startDate, endDate, note: note.trim() });
      setOpen(false);
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się złożyć wniosku.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="mr-2 h-4 w-4" />
          Nowy wniosek
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nowy wniosek o dostępność</DialogTitle>
        </DialogHeader>

        {missingSupervisor ? (
          <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Nie masz przypisanego przełożonego — poproś administratora o uzupełnienie tego pola w
            Twoim profilu. Wniosek trafi wtedy tylko do administratorów.
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

          <Field label="Wiadomość do osoby akceptującej (opcjonalnie)">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Np. proszę o akceptację, wyjazd rodzinny."
            />
          </Field>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Wysyłanie..." : "Wyślij wniosek"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
