"use client";

import { useEffect, useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/auth/types";

type ClientChatMember = {
  id: string;
  profileId: string;
  isPrimary: boolean;
  profile: UserProfile | null;
};

/**
 * Powiązanie profilu klienta (rola 'klient', prawdziwe logowanie Supabase Auth) z pokojem
 * "Klient" — jedyny sposób, w jaki kontakt klienta dostaje dostęp do czatu (RLS blokuje
 * ręczne dodawanie do pokoju kind='client' inną drogą, patrz 193_chat_rls_helpers...sql).
 * Kontakt musi mieć już konto z rolą "klient" — załóż je w Ustawienia → Użytkownicy.
 */
export function ChatClientMemberManager({ clientId, onLinked }: { clientId: string; onLinked: () => void }) {
  const [members, setMembers] = useState<ClientChatMember[]>([]);
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, usersRes] = await Promise.all([
        fetch(`/api/admin/clients/${clientId}/chat-members`, { credentials: "include" }),
        fetch("/api/admin/users", { credentials: "include" }),
      ]);
      if (!membersRes.ok) {
        throw new Error("Nie udało się pobrać powiązanych kontaktów.");
      }
      const membersData = await membersRes.json();
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      setMembers(membersData.members ?? []);
      const linkedIds = new Set((membersData.members ?? []).map((m: ClientChatMember) => m.profileId));
      setCandidates(
        (usersData.users ?? []).filter(
          (user: UserProfile) => user.role === "klient" && user.isActive && !linkedIds.has(user.id),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać danych.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleLink() {
    if (!selectedProfileId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/chat-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profileId: selectedProfileId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Nie udało się powiązać kontaktu.");
      }
      setSelectedProfileId("");
      await refresh();
      onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się powiązać kontaktu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink(profileId: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/chat-members/${profileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Nie udało się odłączyć kontaktu.");
      }
      await refresh();
      onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się odłączyć kontaktu.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-muted">Wczytywanie…</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">
        Kontakt klienta widzi ten pokój dopiero po powiązaniu tutaj — musi mieć konto z rolą
        „klient” (Ustawienia → Użytkownicy).
      </p>

      {members.length === 0 ? (
        <p className="text-xs text-muted">Brak powiązanych kontaktów klienta.</p>
      ) : (
        members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border border-border/50 px-2 py-1.5 text-sm">
            <span className="truncate text-foreground/85">
              {member.profile ? `${member.profile.firstName} ${member.profile.lastName}` : member.profileId}
              {member.profile?.email ? <span className="ml-1 text-xs text-muted">({member.profile.email})</span> : null}
            </span>
            <button
              type="button"
              title="Odłącz od czatu"
              disabled={saving}
              onClick={() => void handleUnlink(member.profileId)}
              className="shrink-0 rounded p-1 text-muted hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}

      <div className="mt-2 flex items-center gap-2">
        <select
          value={selectedProfileId}
          onChange={(event) => setSelectedProfileId(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent/40"
        >
          <option value="">
            {candidates.length ? "Wybierz konto klienta…" : "Brak wolnych kont z rolą 'klient'"}
          </option>
          {candidates.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.firstName} {profile.lastName} ({profile.email})
            </option>
          ))}
        </select>
        <Button type="button" size="sm" disabled={!selectedProfileId || saving} onClick={() => void handleLink()}>
          <Link2 className="h-3.5 w-3.5" />
          Powiąż
        </Button>
      </div>

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
