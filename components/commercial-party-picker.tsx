"use client";

import { ClientSelectWithCreate } from "@/components/client-select-with-create";
import { ContactSelectWithCreate } from "@/components/contact-select-with-create";
import { Field, Input } from "@/components/ui/input";
import { contactToServiceClient, type Contact, type ContactInput } from "@/lib/contacts/types";
import {
  clientToServiceClient,
  type Client,
  type ClientInput,
  type ServiceClient,
} from "@/lib/service/types";
import { cn } from "@/lib/utils";

export type CommercialPartyKind = "client" | "contact";

type CommercialPartyPickerProps = {
  partyKind: CommercialPartyKind;
  onPartyKindChange: (kind: CommercialPartyKind) => void;
  clients: Client[];
  contacts: Contact[];
  clientId: string | null;
  contactId: string | null;
  partySnapshot: ServiceClient;
  onSelectClient: (clientId: string | null, snapshot: ServiceClient) => void;
  onSelectContact: (contactId: string | null, snapshot: ServiceClient) => void;
  onCreateClient: (input: ClientInput) => Promise<Client>;
  onCreateContact: (input: ContactInput) => Promise<Contact>;
  disabled?: boolean;
  mode?: "default" | "offer";
};

function PartySnapshotReadonly({
  snapshot,
  label,
  firstName,
  lastName,
}: {
  snapshot: ServiceClient;
  label: string;
  firstName?: string;
  lastName?: string;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border/80 bg-surface-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dane {label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Imię">
          <Input value={firstName ?? ""} readOnly />
        </Field>
        <Field label="Nazwisko">
          <Input value={lastName ?? snapshot.fullName} readOnly />
        </Field>
      </div>
      <Field label="Obiekt / nazwa lokalizacji">
        <Input value={snapshot.location} readOnly />
      </Field>
      <Field label="E-mail">
        <Input value={snapshot.email} readOnly />
      </Field>
      <Field label="Telefon">
        <Input value={snapshot.phone} readOnly />
      </Field>
    </div>
  );
}

export function CommercialPartyPicker({
  partyKind,
  onPartyKindChange,
  clients,
  contacts,
  clientId,
  contactId,
  partySnapshot,
  onSelectClient,
  onSelectContact,
  onCreateClient,
  onCreateContact,
  disabled = false,
  mode = "default",
}: CommercialPartyPickerProps) {
  const isOfferMode = mode === "offer";

  function switchKind(nextKind: CommercialPartyKind) {
    if (nextKind === partyKind) {
      return;
    }
    onPartyKindChange(nextKind);
  }

  function handleClientChange(nextClientId: string | null) {
    if (!nextClientId) {
      onSelectClient(null, partySnapshot);
      return;
    }
    const client = clients.find((item) => item.id === nextClientId);
    if (!client) {
      return;
    }
    onSelectClient(nextClientId, clientToServiceClient(client));
  }

  function handleContactChange(nextContactId: string | null) {
    if (!nextContactId) {
      onSelectContact(null, partySnapshot);
      return;
    }
    const contact = contacts.find((item) => item.id === nextContactId);
    if (!contact) {
      return;
    }
    onSelectContact(nextContactId, contactToServiceClient(contact));
  }

  const linkedId = partyKind === "client" ? clientId : contactId;
  const snapshotLabel = partyKind === "client" ? "klienta" : "kontaktu";
  const linkedClient = clientId ? clients.find((item) => item.id === clientId) : null;
  const linkedContact = contactId ? contacts.find((item) => item.id === contactId) : null;
  const linkedParty = partyKind === "client" ? linkedClient : linkedContact;

  return (
    <div className="grid gap-3">
      <div className="inline-flex rounded-xl border border-border/80 bg-surface-muted/30 p-1">
        {(
          [
            ["client", "Klient"],
            ["contact", "Kontakt"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            disabled={disabled}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              partyKind === kind
                ? "bg-background text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
            onClick={() => switchKind(kind)}
          >
            {label}
          </button>
        ))}
      </div>

      {partyKind === "client" ? (
        <ClientSelectWithCreate
          clients={clients}
          value={clientId}
          onChange={handleClientChange}
          onCreateClient={onCreateClient}
          emptyLabel={isOfferMode ? "Wybierz klienta" : "Wpisz dane ręcznie"}
          disabled={disabled}
          allowManual={!isOfferMode}
          allowCreate={!isOfferMode}
        />
      ) : (
        <ContactSelectWithCreate
          contacts={contacts}
          value={contactId}
          onChange={handleContactChange}
          onCreateContact={onCreateContact}
          emptyLabel={isOfferMode ? "Wybierz kontakt" : "Wpisz dane ręcznie"}
          disabled={disabled}
          allowManual={!isOfferMode}
          allowCreate
          createButtonPosition={isOfferMode ? "top" : "bottom"}
        />
      )}

      {isOfferMode ? (
        linkedId ? (
          <PartySnapshotReadonly
            snapshot={partySnapshot}
            label={snapshotLabel}
            firstName={linkedParty?.firstName}
            lastName={linkedParty?.lastName}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border/80 bg-surface-muted/20 px-3 py-2 text-xs text-muted">
            {partyKind === "client"
              ? "Wybierz klienta z listy. Jeśli go nie ma w bazie, przełącz na zakładkę Kontakt i użyj «Dodaj nowy kontakt» u góry listy."
              : "Wybierz kontakt z listy lub dodaj nowy kontakt u góry listy."}
          </p>
        )
      ) : (
        <>
          <Field label={`Imię i nazwisko ${snapshotLabel}`}>
            <Input
              value={partySnapshot.fullName}
              disabled={Boolean(linkedId) || disabled}
              onChange={(event) =>
                partyKind === "client"
                  ? onSelectClient(clientId, { ...partySnapshot, fullName: event.target.value })
                  : onSelectContact(contactId, { ...partySnapshot, fullName: event.target.value })
              }
            />
          </Field>
          <Field label="Obiekt / lokalizacja">
            <Input
              value={partySnapshot.location}
              disabled={Boolean(linkedId) || disabled}
              onChange={(event) =>
                partyKind === "client"
                  ? onSelectClient(clientId, { ...partySnapshot, location: event.target.value })
                  : onSelectContact(contactId, { ...partySnapshot, location: event.target.value })
              }
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={partySnapshot.email}
              disabled={Boolean(linkedId) || disabled}
              onChange={(event) =>
                partyKind === "client"
                  ? onSelectClient(clientId, { ...partySnapshot, email: event.target.value })
                  : onSelectContact(contactId, { ...partySnapshot, email: event.target.value })
              }
            />
          </Field>
          <Field label="Telefon">
            <Input
              value={partySnapshot.phone}
              disabled={Boolean(linkedId) || disabled}
              onChange={(event) =>
                partyKind === "client"
                  ? onSelectClient(clientId, { ...partySnapshot, phone: event.target.value })
                  : onSelectContact(contactId, { ...partySnapshot, phone: event.target.value })
              }
            />
          </Field>
        </>
      )}

      {partyKind === "contact" ? (
        <p className="text-xs text-muted">
          Po akceptacji oferty przez kontakt zostanie on automatycznie przekształcony w klienta i
          pojawi się w sekcji Klienci.
        </p>
      ) : null}
    </div>
  );
}
