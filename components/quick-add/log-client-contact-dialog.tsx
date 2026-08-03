"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, PhoneOutgoing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { getUserDisplayName } from "@/lib/auth/types";
import { formatPartyName } from "@/lib/party/display-name";
import { logOutgoingContact } from "@/lib/supabase/communication-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

function todayInputValue() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Wybór klienta (i projektu, jeśli ma kilka) + odnotowanie kontaktu — wszystko w jednym popupie,
 * bez przenoszenia do panelu klienta (korekta właściciela: pierwsza wersja nawigowała do zakładki
 * „Kontakt", zamiast dać wypełnić pole na miejscu). */
export function LogClientContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const clients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const profile = useAuthStore((state) => state.profile);
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(todayInputValue);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = [...clients].sort((a, b) =>
      formatPartyName(a).localeCompare(formatPartyName(b), "pl"),
    );
    if (!normalized) {
      return list.slice(0, 40);
    }
    return list
      .filter((client) => {
        const haystack = [
          formatPartyName(client),
          client.location,
          client.addressCity,
          client.addressStreet,
          client.phone,
          client.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 40);
  }, [clients, query]);

  const clientProjects = useMemo(
    () => (clientId ? projects.filter((project) => project.clientId === clientId) : []),
    [clientId, projects],
  );

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;

  function reset() {
    setQuery("");
    setClientId(null);
    setProjectId(null);
    setEventDate(todayInputValue());
    setNote("");
    setSaving(false);
    setSaved(false);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  }

  function handleSelectClient(id: string) {
    setClientId(id);
    setProjectId(null);
    setError(null);
    const related = projects.filter((project) => project.clientId === id);
    if (related.length === 1) {
      setProjectId(related[0].id);
    }
  }

  async function handleSave() {
    if (!projectId) {
      setError("Wybierz projekt.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await logOutgoingContact({
        projectId,
        eventAt: new Date(`${eventDate}T12:00:00`).toISOString(),
        actorId: profile?.id ?? null,
        actorName: profile ? getUserDisplayName(profile) : "Zespół",
        note,
      });
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać kontaktu.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(selectedClient && projectId && !saved);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kontakt z klientem</DialogTitle>
          <DialogDescription>
            Wybierz klienta (i projekt, jeśli ma kilka) i odnotuj fakt kontaktu — bez treści rozmowy.
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="grid gap-3 py-2">
            <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Kontakt odnotowany.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            <Field label="Szukaj klienta">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Imię, nazwisko, miasto, telefon…"
                autoFocus
              />
            </Field>

            <div className="max-h-40 min-h-0 overflow-y-auto rounded-xl border border-border/70">
              {filteredClients.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted">Brak wyników.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {filteredClients.map((client) => {
                    const selected = client.id === clientId;
                    return (
                      <li key={client.id}>
                        <button
                          type="button"
                          className={
                            selected
                              ? "flex w-full flex-col gap-0.5 bg-accent/10 px-3 py-2.5 text-left"
                              : "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-surface-muted/40"
                          }
                          onClick={() => handleSelectClient(client.id)}
                        >
                          <span className="text-sm font-medium text-foreground">
                            {formatPartyName(client)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {clientProjects.length > 1 ? (
              <Field label="Projekt">
                <Select
                  value={projectId ?? ""}
                  onChange={(event) => setProjectId(event.target.value || null)}
                >
                  <option value="">— wybierz projekt —</option>
                  {clientProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {selectedClient && clientProjects.length === 0 ? (
              <p className="text-sm text-rose-300">Ten klient nie ma jeszcze żadnego projektu.</p>
            ) : null}

            {selectedClient && projectId ? (
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <Field label="Kiedy">
                  <Input
                    type="date"
                    value={eventDate}
                    max={todayInputValue()}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </Field>
                <Field label="Czego dotyczyło (opcjonalnie)">
                  <Textarea
                    value={note}
                    rows={2}
                    placeholder="np. telefon o terminie montażu"
                    onChange={(event) => setNote(event.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            {saved ? "Zamknij" : "Anuluj"}
          </Button>
          {!saved ? (
            <Button type="button" disabled={!canSave || saving} onClick={() => void handleSave()}>
              <PhoneOutgoing className="mr-1.5 h-4 w-4" />
              {saving ? "Zapisywanie…" : "Zapisz kontakt"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
