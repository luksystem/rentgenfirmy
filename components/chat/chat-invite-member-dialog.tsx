"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { USER_ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/auth/types";

type ChatInviteMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  onInvited: () => void;
};

const INVITABLE_ROLES: UserRole[] = ["gosc", "podwykonawca", "instalator", "office", "manager"];

export function ChatInviteMemberDialog({ open, onOpenChange, roomId, onInvited }: ChatInviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole>("gosc");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      setError("Podaj adres e-mail.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), firstName, lastName, role }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Nie udało się dodać uczestnika.");
      }
      setEmail("");
      setFirstName("");
      setLastName("");
      onInvited();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać uczestnika.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj uczestnika</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">E-mail</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="osoba@przyklad.pl"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted">Imię</label>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Nazwisko</label>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Rola (jeśli tworzymy nowe konto)</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
            >
              {INVITABLE_ROLES.filter((r) => USER_ROLES.includes(r)).map((r) => (
                <option key={r} value={r}>
                  {USER_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
