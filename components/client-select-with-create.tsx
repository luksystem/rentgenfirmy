"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Client, ClientInput } from "@/lib/service/types";
import { cn } from "@/lib/utils";

type ClientSelectWithCreateProps = {
  clients: Client[];
  value: string | null;
  onChange: (clientId: string | null) => void;
  onCreateClient: (input: ClientInput) => Promise<Client>;
  emptyLabel?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

const emptyClientInput = (): ClientInput => ({
  fullName: "",
  location: "",
  addressStreet: "",
  addressCity: "",
  addressPostalCode: "",
  email: "",
  phone: "",
});

function clientSearchText(client: Client) {
  return [client.fullName, client.location, client.email, client.phone, client.addressCity]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ClientSelectWithCreate({
  clients,
  value,
  onChange,
  onCreateClient,
  emptyLabel = "Bez klienta",
  label = "Klient",
  disabled = false,
  className,
}: ClientSelectWithCreateProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState<ClientInput>(emptyClientInput);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.fullName.localeCompare(b.fullName, "pl")),
    [clients],
  );

  const selectedClient = useMemo(
    () => sortedClients.find((client) => client.id === value) ?? null,
    [sortedClients, value],
  );

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return sortedClients;
    }
    return sortedClients.filter((client) => clientSearchText(client).includes(needle));
  }, [query, sortedClients]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (selectedClient) {
      setQuery(selectedClient.fullName);
    } else if (!open) {
      setQuery("");
    }
  }, [open, selectedClient]);

  function selectClient(clientId: string | null) {
    onChange(clientId);
    setOpen(false);
    if (!clientId) {
      setQuery("");
    }
  }

  async function handleCreateClient() {
    if (!newClient.fullName.trim()) {
      setError("Imię i nazwisko klienta jest wymagane.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const created = await onCreateClient(newClient);
      onChange(created.id);
      setQuery(created.fullName);
      setDialogOpen(false);
      setNewClient(emptyClientInput());
      setOpen(false);
    } catch {
      setError("Nie udało się dodać klienta.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <Field label={label} className={className}>
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              disabled={disabled}
              placeholder={emptyLabel}
              className="pr-10"
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                if (!event.target.value.trim()) {
                  onChange(null);
                }
              }}
            />
            <button
              type="button"
              disabled={disabled}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-surface-muted"
              onClick={() => setOpen((current) => !current)}
              aria-label="Rozwiń listę klientów"
            >
              <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
            </button>
          </div>

          {open && !disabled ? (
            <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1 shadow-card">
              <button
                type="button"
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-muted"
                onClick={() => selectClient(null)}
              >
                {emptyLabel}
              </button>
              {filteredClients.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">Brak wyników dla „{query.trim()}”.</p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className={cn(
                      "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted",
                      value === client.id && "bg-accent/10 text-foreground",
                    )}
                    onClick={() => selectClient(client.id)}
                  >
                    <span className="font-medium">{client.fullName}</span>
                    {client.location || client.email ? (
                      <span className="text-xs text-muted">
                        {[client.location, client.email].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
              <button
                type="button"
                className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-accent hover:bg-accent/5"
                onClick={() => {
                  setOpen(false);
                  setNewClient(emptyClientInput());
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Dodaj nowego klienta
              </button>
            </div>
          ) : null}
        </div>
      </Field>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowy klient</DialogTitle>
            <DialogDescription>
              Klient zostanie zapisany w bazie i przypisany do tego wpisu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Imię i nazwisko">
              <Input
                value={newClient.fullName}
                onChange={(event) =>
                  setNewClient({ ...newClient, fullName: event.target.value })
                }
              />
            </Field>
            <Field label="Obiekt / lokalizacja">
              <Input
                value={newClient.location}
                onChange={(event) =>
                  setNewClient({ ...newClient, location: event.target.value })
                }
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={newClient.email}
                onChange={(event) => setNewClient({ ...newClient, email: event.target.value })}
              />
            </Field>
            <Field label="Telefon">
              <Input
                value={newClient.phone}
                onChange={(event) => setNewClient({ ...newClient, phone: event.target.value })}
              />
            </Field>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="button" disabled={isCreating} onClick={() => void handleCreateClient()}>
              {isCreating ? "Zapisywanie…" : "Dodaj klienta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
