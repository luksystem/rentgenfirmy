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
  part = "all",
  onAssign,
  onSign,
  stageResponsible,
}: {
  instance: ProjectProcessItem;
  teamProfiles: UserProfile[];
  currentUserId?: string;
  canManageAssignment?: boolean;
  disabled?: boolean;
  /** checklist: osobno „assignee” u góry i „signature” pod listą */
  part?: "all" | "assignee" | "signature";
  onAssign: (assigneeId: string | null) => Promise<void>;
  onSign: (signatureNote: string) => Promise<void>;
  /**
   * Odpowiedzialny za ETAP, wyliczony z macierzy ról i obsady projektu (D42). Element bez własnego
   * przypisania dziedziczy tę osobę — bo element zawsze ma odpowiedzialnego, a domyślnie jest nim
   * ten, kto odpowiada za etap. Świadomie NIE kopiujemy tej osoby do wiersza przy tworzeniu:
   * kopia rozjechałaby się przy pierwszej zmianie obsady, a mamy 564 elementy w bazie. Wskazanie
   * ręczne zapisuje się normalnie i wygrywa.
   */
  stageResponsible?: { userId: string | null; name: string | null } | null;
}) {
  // Picker startuje na osobie z etapu, gdy nikt nie jest przypisany wprost — „domyślnie wybrana”
  // ma znaczyć wybraną, nie tylko podpowiedzianą w opisie.
  const [assigneeId, setAssigneeId] = useState(
    instance.assigneeId ?? stageResponsible?.userId ?? "",
  );
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

  const showAssignee = part === "all" || part === "assignee";
  const showSignature = part === "all" || part === "signature";

  const title =
    part === "assignee"
      ? "Odpowiedzialność"
      : part === "signature"
        ? "Podpis"
        : "Odpowiedzialność";
  const TitleIcon = part === "signature" ? PenLine : UserRound;

  return (
    <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <TitleIcon className="h-4 w-4 text-accent" />
        {title}
      </div>

      <div className="mt-4 grid gap-4">
        {showAssignee ? (
          <>
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

            {!instance.assigneeName && stageResponsible?.name ? (
              <p className="text-sm text-muted">
                Odpowiada:{" "}
                <strong className="text-foreground">{stageResponsible.name}</strong>{" "}
                <span className="text-xs">(z etapu)</span>
                <span className="mt-1 block text-xs font-normal">
                  Nikt nie jest przypisany wprost, więc odpowiada osoba prowadząca ten etap.
                  Możesz wskazać kogoś innego powyżej.
                </span>
              </p>
            ) : null}

            {instance.assigneeName ? (
              <p className="text-sm text-muted">
                Przypisano: <strong className="text-foreground">{instance.assigneeName}</strong>
                {instance.kind === "checklist" ? (
                  <span className="mt-1 block text-xs font-normal">
                    Punkty checklisty bez własnej osoby dziedziczą tę odpowiedzialność.
                  </span>
                ) : null}
              </p>
            ) : null}
          </>
        ) : null}

        {showSignature ? (
          <>
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
            ) : part === "signature" && !instance.assigneeId ? (
              <p className="text-sm text-muted">Najpierw przypisz osobę odpowiedzialną u góry checklisty.</p>
            ) : null}
          </>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </div>
  );
}

export function formatAssigneeLabel(
  instance: ProjectProcessItem,
  /** D42/D44 — odpowiedzialny za etap, użyty gdy element nie ma własnego przypisania. */
  stageResponsibleName?: string | null,
) {
  if (instance.signedAt && instance.signedByName) {
    return `Podpis: ${instance.signedByName}`;
  }
  if (instance.assigneeName) {
    return `Odp.: ${instance.assigneeName}`;
  }
  if (stageResponsibleName) {
    // Oznaczone inaczej niż wskazanie ręczne — czytelnik ma wiedzieć, że to wynik reguły,
    // a nie czyjaś decyzja.
    return `Odp.: ${stageResponsibleName} (z etapu)`;
  }
  return null;
}
