"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SignaturePad } from "@/components/process/signature-pad";
import { formatDate } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/auth/types";
import type { LeaveRequest } from "@/lib/leave/types";
import { useAuthStore } from "@/store/auth-store";
import { useLeaveStore } from "@/store/leave-store";

type Mode = "approve" | "reject";

/** Okienko decyzji przełożonego/administratora — akceptacja wymaga podpisu (imię, nazwisko,
 * rysunek), odrzucenie pozwala dopisać krótki powód. Wynik trafia do pracownika jako powiadomienie. */
export function LeaveDecisionDialog({
  item,
  leaveTypeName,
  employeeName,
  mode,
  open,
  onOpenChange,
}: {
  item: LeaveRequest;
  leaveTypeName: string;
  employeeName: string;
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const decideRequest = useLeaveStore((state) => state.decideRequest);

  const [signerName, setSignerName] = useState(profile ? getUserDisplayName(profile) : "");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);

    if (mode === "approve") {
      if (!signerName.trim() || !signatureDataUrl) {
        setError("Wpisz imię i nazwisko oraz złóż podpis, aby zaakceptować urlop.");
        return;
      }
      setSaving(true);
      try {
        await decideRequest(item.id, {
          decision: "approve",
          signature: { imageDataUrl: signatureDataUrl, signerName: signerName.trim() },
        });
        onOpenChange(false);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Nie udało się zaakceptować urlopu.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      await decideRequest(item.id, { decision: "reject", decisionNote: decisionNote.trim() });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się odrzucić urlopu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "approve" ? "Akceptacja urlopu" : "Odrzucenie wniosku"}</DialogTitle>
        </DialogHeader>

        <div className="mb-4 rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm">
          <p className="font-medium text-foreground">{employeeName}</p>
          <p className="text-muted">
            {leaveTypeName}: {formatDate(item.startDate)} — {formatDate(item.endDate)}
          </p>
          {item.note ? <p className="mt-1 text-xs text-muted">„{item.note}”</p> : null}
        </div>

        {mode === "approve" ? (
          <div className="grid gap-4">
            <Field label="Imię i nazwisko podpisującego">
              <Input value={signerName} onChange={(event) => setSignerName(event.target.value)} />
            </Field>
            <Field label="Podpis">
              <SignaturePad onChange={setSignatureDataUrl} />
            </Field>
          </div>
        ) : (
          <Field label="Powód odrzucenia (opcjonalnie)">
            <Textarea
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              rows={3}
            />
          </Field>
        )}

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            type="button"
            variant={mode === "approve" ? "default" : "destructive"}
            disabled={saving}
            onClick={() => void handleConfirm()}
          >
            {mode === "approve" ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            {saving ? "Zapisywanie..." : mode === "approve" ? "Akceptuj podpis" : "Odrzuć wniosek"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
