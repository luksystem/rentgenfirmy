"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { Contact, ContactInput } from "@/lib/contacts/types";

export function ContactForm({
  contact,
  isSaving,
  onSubmit,
  onCancel,
}: {
  contact: Contact | null;
  isSaving: boolean;
  onSubmit: (input: ContactInput) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const defaults: ContactInput = {
    fullName: contact?.fullName ?? "",
    location: contact?.location ?? "",
    addressStreet: contact?.addressStreet ?? "",
    addressCity: contact?.addressCity ?? "",
    addressPostalCode: contact?.addressPostalCode ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    notes: contact?.notes ?? "",
    externalId: contact?.externalId ?? null,
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await onSubmit({
      fullName: String(form.get("fullName") ?? ""),
      location: String(form.get("location") ?? ""),
      addressStreet: String(form.get("addressStreet") ?? ""),
      addressCity: String(form.get("addressCity") ?? ""),
      addressPostalCode: String(form.get("addressPostalCode") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      notes: String(form.get("notes") ?? ""),
      externalId: String(form.get("externalId") ?? "") || null,
    });
  }

  return (
    <form className="grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Imię i nazwisko">
        <Input name="fullName" defaultValue={defaults.fullName} required />
      </Field>
      <Field label="Obiekt / nazwa lokalizacji">
        <Input name="location" defaultValue={defaults.location} />
      </Field>
      <Field label="Ulica i numer">
        <Input name="addressStreet" defaultValue={defaults.addressStreet} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kod pocztowy">
          <Input name="addressPostalCode" defaultValue={defaults.addressPostalCode} />
        </Field>
        <Field label="Miasto">
          <Input name="addressCity" defaultValue={defaults.addressCity} />
        </Field>
      </div>
      <Field label="E-mail">
        <Input name="email" type="email" defaultValue={defaults.email} />
      </Field>
      <Field label="Telefon">
        <Input name="phone" defaultValue={defaults.phone} />
      </Field>
      <Field label="ID zewnętrzne (np. CRM)">
        <Input name="externalId" defaultValue={defaults.externalId ?? ""} />
      </Field>
      <Field label="Notatki">
        <Textarea name="notes" defaultValue={defaults.notes ?? ""} rows={3} />
      </Field>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Zapisywanie…" : contact ? "Zapisz zmiany" : "Dodaj kontakt"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Anuluj
          </Button>
        ) : null}
      </div>
    </form>
  );
}
