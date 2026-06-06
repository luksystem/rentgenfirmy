"use client";

import { ClientSelectWithCreate } from "@/components/client-select-with-create";
import { Field, Input } from "@/components/ui/input";
import { clientToServiceClient, type Client, type ClientInput, type ServiceClient } from "@/lib/service/types";

type ClientPickerProps = {
  clients: Client[];
  clientId: string | null;
  clientSnapshot: ServiceClient;
  onSelectClient: (clientId: string | null, snapshot: ServiceClient) => void;
  onCreateClient: (input: ClientInput) => Promise<Client>;
  disabled?: boolean;
};

export function ClientPicker({
  clients,
  clientId,
  clientSnapshot,
  onSelectClient,
  onCreateClient,
  disabled = false,
}: ClientPickerProps) {
  function handleClientChange(nextClientId: string | null) {
    if (!nextClientId) {
      onSelectClient(null, clientSnapshot);
      return;
    }

    const client = clients.find((item) => item.id === nextClientId);
    if (!client) {
      return;
    }

    onSelectClient(nextClientId, clientToServiceClient(client));
  }

  async function handleCreateClient(input: ClientInput) {
    const created = await onCreateClient(input);
    onSelectClient(created.id, clientToServiceClient(created));
    return created;
  }

  return (
    <>
      <ClientSelectWithCreate
        clients={clients}
        value={clientId}
        onChange={handleClientChange}
        onCreateClient={handleCreateClient}
        emptyLabel="Wpisz dane ręcznie"
        disabled={disabled}
      />

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
    </>
  );
}
