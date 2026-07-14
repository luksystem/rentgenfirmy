"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Contact } from "@/lib/contacts/types";
import {
  PROJECT_CONTACT_ROLES,
  PROJECT_CONTACT_ROLE_LABELS,
  type ProjectContact,
  type ProjectContactRole,
} from "@/lib/viz/project-contact-types";

const selectClassName =
  "h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm";

type VizProjectContactsPanelProps = {
  dashboardId: string;
  projectId: string;
};

export function VizProjectContactsPanel({ dashboardId, projectId }: VizProjectContactsPanelProps) {
  const [items, setItems] = useState<ProjectContact[]>([]);
  const [pickerContacts, setPickerContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactId, setContactId] = useState("");
  const [roleCode, setRoleCode] = useState<ProjectContactRole>("technical_contact");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [itemsRes, pickerRes] = await Promise.all([
        fetch(`/api/viz/dashboards/${dashboardId}/projects/${projectId}/contacts`),
        fetch(
          `/api/viz/dashboards/${dashboardId}/projects/${projectId}/contacts?picker=1`,
        ),
      ]);

      if (!itemsRes.ok || !pickerRes.ok) {
        throw new Error("Nie udało się pobrać kontaktów.");
      }

      const itemsData = (await itemsRes.json()) as { items: ProjectContact[] };
      const pickerData = (await pickerRes.json()) as { contacts: Contact[] };
      setItems(itemsData.items);
      setPickerContacts(pickerData.contacts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId, projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/projects/${projectId}/contacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: contactId || null,
            roleCode,
            displayName: displayName.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            notes: notes.trim() || null,
            isPrimary: items.length === 0,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się dodać kontaktu.");
      }

      setContactId("");
      setDisplayName("");
      setEmail("");
      setPhone("");
      setNotes("");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Usunąć powiązanie kontaktu z tym sklepem?")) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/projects/${projectId}/contacts?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Nie udało się usunąć kontaktu.");
      }
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    }
  }

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie kontaktów…
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">Dodaj kontakt BMS</h3>
        <form onSubmit={(e) => void handleCreate(e)} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Kontakt z bazy (opcjonalnie)</label>
            <select
              className={selectClassName}
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">— wpisz ręcznie poniżej —</option>
              {pickerContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {[contact.firstName, contact.lastName].filter(Boolean).join(" ")} · {contact.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Rola</label>
            <select
              className={selectClassName}
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value as ProjectContactRole)}
            >
              {PROJECT_CONTACT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {PROJECT_CONTACT_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nazwa wyświetlana</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Gdy nie wybrano kontaktu z bazy"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">E-mail</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Telefon</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Notatki</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSaving || (!contactId && !displayName.trim())}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Dodaj kontakt
            </Button>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>

      {!items.length ? (
        <Card className="p-6 text-sm text-muted">Brak kontaktów przypisanych do tego sklepu.</Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="text-sm">
              <p className="font-medium">
                {item.displayName ?? "—"}
                {item.isPrimary ? (
                  <span className="ml-2 text-xs text-accent">· główny</span>
                ) : null}
              </p>
              <p className="text-muted">{PROJECT_CONTACT_ROLE_LABELS[item.roleCode]}</p>
              <p className="mt-1 text-muted">
                {[item.email, item.phone].filter(Boolean).join(" · ") || "—"}
              </p>
              {item.notes ? <p className="mt-1 text-muted">{item.notes}</p> : null}
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => void handleDelete(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))
      )}
    </div>
  );
}
