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
import { activeContacts, type Contact, type ContactInput } from "@/lib/contacts/types";
import { formatPartyName } from "@/lib/party/display-name";
import { sortContactsByLastName } from "@/lib/sort/party-and-project";
import { cn } from "@/lib/utils";

type ContactSelectWithCreateProps = {
  contacts: Contact[];
  value: string | null;
  onChange: (contactId: string | null) => void;
  onCreateContact: (input: ContactInput) => Promise<Contact>;
  emptyLabel?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  createButtonPosition?: "top" | "bottom";
  allowCreate?: boolean;
  allowManual?: boolean;
};

const emptyContactInput = (): ContactInput => ({
  firstName: "",
  lastName: "",
  location: "",
  addressStreet: "",
  addressCity: "",
  addressPostalCode: "",
  email: "",
  phone: "",
});

function contactSearchText(contact: Contact) {
  return [contact.firstName, contact.lastName, contact.location, contact.email, contact.phone, contact.addressCity]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function contactDisplayName(contact: Contact) {
  return formatPartyName(contact);
}

export function ContactSelectWithCreate({
  contacts,
  value,
  onChange,
  onCreateContact,
  emptyLabel = "Bez kontaktu",
  label = "Kontakt",
  disabled = false,
  className,
  createButtonPosition = "bottom",
  allowCreate = true,
  allowManual = true,
}: ContactSelectWithCreateProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState<ContactInput>(emptyContactInput());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectableContacts = useMemo(() => activeContacts(contacts), [contacts]);

  const sortedContacts = useMemo(() => sortContactsByLastName(selectableContacts), [selectableContacts]);

  const selectedContact = useMemo(
    () => sortedContacts.find((contact) => contact.id === value) ?? null,
    [sortedContacts, value],
  );

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return sortedContacts;
    }
    return sortedContacts.filter((contact) => contactSearchText(contact).includes(needle));
  }, [query, sortedContacts]);

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
    if (selectedContact) {
      setQuery(contactDisplayName(selectedContact));
    } else if (!open) {
      setQuery("");
    }
  }, [open, selectedContact]);

  function selectContact(contactId: string | null) {
    onChange(contactId);
    setOpen(false);
    if (!contactId) {
      setQuery("");
    }
  }

  async function handleCreateContact() {
    if (!newContact.lastName.trim()) {
      setError("Nazwisko kontaktu jest wymagane.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const created = await onCreateContact(newContact);
      onChange(created.id);
      setQuery(contactDisplayName(created));
      setDialogOpen(false);
      setNewContact(emptyContactInput());
      setOpen(false);
    } catch {
      setError("Nie udało się dodać kontaktu.");
    } finally {
      setIsCreating(false);
    }
  }

  function openCreateDialog() {
    setOpen(false);
    setNewContact(emptyContactInput());
    setDialogOpen(true);
  }

  const createButton = allowCreate ? (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-accent hover:bg-accent/5",
        createButtonPosition === "bottom" && "mt-1",
      )}
      onClick={openCreateDialog}
    >
      <Plus className="h-4 w-4" />
      Dodaj nowy kontakt
    </button>
  ) : null;

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
              aria-label="Rozwiń listę kontaktów"
            >
              <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
            </button>
          </div>

          {open && !disabled ? (
            <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1 shadow-card">
              {createButtonPosition === "top" ? createButton : null}
              {allowManual ? (
                <button
                  type="button"
                  className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-muted"
                  onClick={() => selectContact(null)}
                >
                  {emptyLabel}
                </button>
              ) : null}
              {filteredContacts.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">Brak wyników dla „{query.trim()}”.</p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className={cn(
                      "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted",
                      value === contact.id && "bg-accent/10 text-foreground",
                    )}
                    onClick={() => selectContact(contact.id)}
                  >
                    <span className="font-medium">{contactDisplayName(contact)}</span>
                    {contact.location || contact.email ? (
                      <span className="text-xs text-muted">
                        {[contact.location, contact.email].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
              {createButtonPosition === "bottom" ? createButton : null}
            </div>
          ) : null}
        </div>
      </Field>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowy kontakt</DialogTitle>
            <DialogDescription>
              Kontakt zostanie zapisany w module Kontakty i przypisany do tego wpisu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Imię">
                <Input
                  value={newContact.firstName}
                  onChange={(event) =>
                    setNewContact({ ...newContact, firstName: event.target.value })
                  }
                />
              </Field>
              <Field label="Nazwisko">
                <Input
                  value={newContact.lastName}
                  onChange={(event) =>
                    setNewContact({ ...newContact, lastName: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Obiekt / lokalizacja">
              <Input
                value={newContact.location}
                onChange={(event) =>
                  setNewContact({ ...newContact, location: event.target.value })
                }
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={newContact.email}
                onChange={(event) => setNewContact({ ...newContact, email: event.target.value })}
              />
            </Field>
            <Field label="Telefon">
              <Input
                value={newContact.phone}
                onChange={(event) => setNewContact({ ...newContact, phone: event.target.value })}
              />
            </Field>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="button" disabled={isCreating} onClick={() => void handleCreateContact()}>
              {isCreating ? "Zapisywanie…" : "Dodaj kontakt"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
