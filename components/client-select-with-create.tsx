"use client";

import { useMemo, useState } from "react";
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

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.fullName.localeCompare(b.fullName, "pl")),
    [clients],
  );

  function handleSelect(selected: string) {
    if (selected === "__new__") {
      setNewClient(emptyClientInput());
      setDialogOpen(true);
      return;
    }

    onChange(selected || null);
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
      setDialogOpen(false);
      setNewClient(emptyClientInput());
    } catch {
      setError("Nie udało się dodać klienta.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <Field label={label} className={className}>
        <select
          value={value ?? ""}
          onChange={(event) => handleSelect(event.target.value)}
          disabled={disabled}
          className="flex h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
        >
          <option value="">{emptyLabel}</option>
          {sortedClients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.fullName}
              {client.location ? ` · ${client.location}` : ""}
            </option>
          ))}
          <option value="__new__">+ Dodaj nowego klienta</option>
        </select>
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
