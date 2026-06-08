"use client";

import { useState } from "react";
import { PenLine, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import type { UserProfile } from "@/lib/auth/types";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import type { ProjectProcessItem } from "@/lib/process/types";
import { formatDate } from "@/lib/utils";

export function ProcessItemResponsibleSection({
  instance,
  teamProfiles,
  currentUserId,
  canManageAssignment = false,
  disabled = false,
  onAssign,
  onSign,
}: {
  instance: ProjectProcessItem;
  teamProfiles: UserProfile[];
  currentUserId?: string;
  canManageAssignment?: boolean;
  disabled?: boolean;
  onAssign: (assigneeId: string | null) => Promise<void>;
  onSign: (signatureNote: string) => Promise<void>;
}) {
  const [assigneeId, setAssigneeId] = useState(instance.assigneeId ?? "");
  const [signatureNote, setSignatureNote] = useState(instance.signatureNote ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAssign = Boolean(canManageAssignment || !instance.assigneeId);
  const canSign =
    Boolean(currentUserId) &&
    instance.assigneeId === currentUserId &&
    !instance.signedAt &&
    !disabled;

  async function handleAssign() {
    setIsSaving(true);
    setError(null);
    try {
      await onAssign(assigneeId || null);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Błąd przypisania.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSign() {
    setIsSaving(true);
    setError(null);
    try {
      await onSign(signatureNote);
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : "Błąd podpisu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <UserRound className="h-4 w-4 text-accent" />
        Odpowiedzialność
      </div>

      <div className="mt-4 grid gap-4">
        <Field label="Osoba odpowiedzialna">
          <Select
            value={assigneeId}
            disabled={disabled || isSaving || !canAssign}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            <option value="">— wybierz osobę —</option>
            {teamProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileToOptionLabel(profile)}
              </option>
            ))}
          </Select>
        </Field>

        {canAssign ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled || isSaving || !assigneeId}
            onClick={() => void handleAssign()}
          >
            {isSaving ? "Zapisywanie…" : "Zapisz odpowiedzialnego"}
          </Button>
        ) : null}

        {instance.assigneeName ? (
          <p className="text-sm text-muted">
            Przypisano: <strong className="text-foreground">{instance.assigneeName}</strong>
          </p>
        ) : null}

        {instance.signedAt ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-emerald-200">
              <PenLine className="h-4 w-4" />
              Podpisano przez {instance.signedByName}
            </div>
            <p className="mt-1 text-muted">{formatDate(instance.signedAt)}</p>
            {instance.signatureNote ? (
              <p className="mt-2 whitespace-pre-wrap text-foreground">{instance.signatureNote}</p>
            ) : null}
          </div>
        ) : canSign ? (
          <>
            <Field label="Notatka do podpisu (opcjonalnie)">
              <Textarea
                value={signatureNote}
                disabled={isSaving}
                placeholder="Krótka uwaga przy podpisie"
                onChange={(event) => setSignatureNote(event.target.value)}
              />
            </Field>
            <Button type="button" disabled={isSaving} onClick={() => void handleSign()}>
              {isSaving ? "Podpisywanie…" : "Podpisuję jako odpowiedzialny"}
            </Button>
          </>
        ) : instance.assigneeId && currentUserId !== instance.assigneeId ? (
          <p className="text-sm text-muted">
            Podpis może złożyć tylko {instance.assigneeName || "przypisana osoba"}.
          </p>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </div>
  );
}

export function formatAssigneeLabel(instance: ProjectProcessItem) {
  if (instance.signedAt && instance.signedByName) {
    return `Podpis: ${instance.signedByName}`;
  }
  if (instance.assigneeName) {
    return `Odp.: ${instance.assigneeName}`;
  }
  return null;
}
