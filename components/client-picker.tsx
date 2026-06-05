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
import { clientToServiceClient, type Client, type ClientInput, type ServiceClient } from "@/lib/service/types";

type ClientPickerProps = {
  clients: Client[];
  clientId: string | null;
  clientSnapshot: ServiceClient;
  onSelectClient: (clientId: string | null, snapshot: ServiceClient) => void;
  onCreateClient: (input: ClientInput) => Promise<Client>;
  disabled?: boolean;
};

const emptyClientInput = (): ClientInput => ({
  fullName: "",
  location: "",
  email: "",
  phone: "",
});

export function ClientPicker({
  clients,
  clientId,
  clientSnapshot,
  onSelectClient,
  onCreateClient,
  disabled = false,
}: ClientPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState<ClientInput>(emptyClientInput);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.fullName.localeCompare(b.fullName, "pl")),
    [clients],
  );

  function handleSelect(value: string) {
    if (value === "__new__") {
      setNewClient({
        ...emptyClientInput(),
        fullName: clientSnapshot.fullName,
        location: clientSnapshot.location,
        email: clientSnapshot.email,
        phone: clientSnapshot.phone,
      });
      setDialogOpen(true);
      return;
    }

    if (value === "__manual__") {
      onSelectClient(null, clientSnapshot);
      return;
    }

    const client = clients.find((item) => item.id === value);
    if (!client) {
      return;
    }

    onSelectClient(client.id, clientToServiceClient(client));
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
      onSelectClient(created.id, clientToServiceClient(created));
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
      <Field label="Klient">
        <select
          value={clientId ?? "__manual__"}
          onChange={(event) => handleSelect(event.target.value)}
          disabled={disabled}
          className="flex h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
        >
          <option value="__manual__">Wpisz dane ręcznie</option>
          {sortedClients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.fullName}
              {client.location ? ` · ${client.location}` : ""}
            </option>
          ))}
          <option value="__new__">+ Dodaj nowego klienta</option>
        </select>
      </Field>

      <Field label="Imię i nazwisko klienta">
        <Input
          value={clientSnapshot.fullName}
          disabled={Boolean(clientId) || disabled}
          onChange={(event) =>
            onSelectClient(clientId, { ...clientSnapshot, fullName: event.target.value })
          }
        />
      </Field>
      <Field label="Obiekt / lokalizacja">
        <Input
          value={clientSnapshot.location}
          disabled={Boolean(clientId) || disabled}
          onChange={(event) =>
            onSelectClient(clientId, { ...clientSnapshot, location: event.target.value })
          }
        />
      </Field>
      <Field label="E-mail">
        <Input
          type="email"
          value={clientSnapshot.email}
          disabled={Boolean(clientId) || disabled}
          onChange={(event) =>
            onSelectClient(clientId, { ...clientSnapshot, email: event.target.value })
          }
        />
      </Field>
      <Field label="Telefon">
        <Input
          value={clientSnapshot.phone}
          disabled={Boolean(clientId) || disabled}
          onChange={(event) =>
            onSelectClient(clientId, { ...clientSnapshot, phone: event.target.value })
          }
        />
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
