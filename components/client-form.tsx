"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { Client, ClientInput } from "@/lib/service/types";

export function ClientForm({
  client,
  isSaving,
  onSubmit,
  onCancel,
}: {
  client: Client | null;
  isSaving: boolean;
  onSubmit: (input: ClientInput) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const defaults: ClientInput = {
    firstName: client?.firstName ?? "",
    lastName: client?.lastName ?? "",
    location: client?.location ?? "",
    addressStreet: client?.addressStreet ?? "",
    addressCity: client?.addressCity ?? "",
    addressPostalCode: client?.addressPostalCode ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    notes: client?.notes ?? "",
    externalId: client?.externalId ?? null,
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await onSubmit({
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Imię">
          <Input name="firstName" defaultValue={defaults.firstName} />
        </Field>
        <Field label="Nazwisko">
          <Input name="lastName" defaultValue={defaults.lastName} required />
        </Field>
      </div>
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
      <Field label="ID zewnętrzne (np. Pipedrive)">
        <Input name="externalId" defaultValue={defaults.externalId ?? ""} />
      </Field>
      <Field label="Notatki">
        <Textarea name="notes" defaultValue={defaults.notes ?? ""} rows={3} />
      </Field>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Zapisywanie…" : client ? "Zapisz zmiany" : "Dodaj klienta"}
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
