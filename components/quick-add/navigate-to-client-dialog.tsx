"use client";

import { useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import {
  buildClientAddressLine,
  buildGoogleMapsDirectionsUrl,
} from "@/lib/dashboard/google-maps";
import { formatPartyName } from "@/lib/party/display-name";
import { useAppStore } from "@/store/app-store";

export function NavigateToClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const clients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
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
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 40);
  }, [clients, query]);

  const clientProjects = useMemo(
    () =>
      clientId
        ? projects.filter((project) => project.clientId === clientId)
        : [],
    [clientId, projects],
  );

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;

  const addressLine = selectedClient ? buildClientAddressLine(selectedClient) : "";

  function reset() {
    setQuery("");
    setClientId(null);
    setProjectId(null);
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

  function handleNavigate() {
    if (!selectedClient) {
      setError("Wybierz klienta.");
      return;
    }
    if (clientProjects.length > 1 && !projectId) {
      setError("Klient ma kilka projektów — wybierz projekt.");
      return;
    }
    if (!addressLine.trim()) {
      setError("Brak adresu w bazie dla tego klienta.");
      return;
    }
    const url = buildGoogleMapsDirectionsUrl(addressLine);
    if (!url) {
      setError("Nie udało się zbudować trasy.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Prowadź do</DialogTitle>
          <DialogDescription>
            Wybierz klienta (i projekt, jeśli ma kilka). Otworzymy Google Maps z trasą do adresu z
            bazy.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Szukaj klienta">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nazwisko, miasto, ulica…"
              autoFocus
            />
          </Field>

          <div className="max-h-48 min-h-0 overflow-y-auto rounded-xl border border-border/70">
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
                        <span className="text-xs text-muted">
                          {buildClientAddressLine(client) || "Brak adresu w bazie"}
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

          {selectedClient ? (
            <p className="flex items-start gap-2 text-xs text-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>
                {addressLine.trim()
                  ? addressLine
                  : "Brak adresu — uzupełnij dane klienta w bazie."}
                {projectId
                  ? ` · projekt: ${clientProjects.find((p) => p.id === projectId)?.name ?? ""}`
                  : ""}
              </span>
            </p>
          ) : null}

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" onClick={handleNavigate} disabled={!selectedClient}>
            <Navigation className="mr-1.5 h-4 w-4" />
            Otwórz Maps
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
