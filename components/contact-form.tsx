"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { Contact, ContactInput } from "@/lib/contacts/types";
import { parseOptionalCoordinate } from "@/lib/party/gps";
import { useAuthStore } from "@/store/auth-store";

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
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const [gpsTouched, setGpsTouched] = useState(false);

  const defaults: ContactInput = {
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    location: contact?.location ?? "",
    addressStreet: contact?.addressStreet ?? "",
    addressCity: contact?.addressCity ?? "",
    addressPostalCode: contact?.addressPostalCode ?? "",
    lat: contact?.lat ?? null,
    lng: contact?.lng ?? null,
    gpsManual: contact?.gpsManual ?? false,
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    notes: contact?.notes ?? "",
    externalId: contact?.externalId ?? null,
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lat = parseOptionalCoordinate(form.get("lat"));
    const lng = parseOptionalCoordinate(form.get("lng"));

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
      lat,
      lng,
      gpsManual: isAdministrator && gpsTouched,
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
      {isAdministrator ? (
        <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Pozycja GPS</p>
          <p className="text-xs text-muted">
            Wyliczana automatycznie przy zapisie adresu. Admin może ustawić ręcznie.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Szerokość (lat)">
              <Input
                name="lat"
                inputMode="decimal"
                placeholder="np. 52.2297"
                defaultValue={defaults.lat != null ? String(defaults.lat) : ""}
                onChange={() => setGpsTouched(true)}
              />
            </Field>
            <Field label="Długość (lng)">
              <Input
                name="lng"
                inputMode="decimal"
                placeholder="np. 21.0122"
                defaultValue={defaults.lng != null ? String(defaults.lng) : ""}
                onChange={() => setGpsTouched(true)}
              />
            </Field>
          </div>
        </div>
      ) : null}
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
