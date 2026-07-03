"use client";

import Link from "next/link";
import { useState } from "react";
import { Edit, FileText, Plus, Trash2, UserPlus } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isContactConverted, type Contact, type ContactInput } from "@/lib/contacts/types";
import { formatDateTime } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type DialogMode = "create" | "edit" | "history" | null;

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const { addContact, updateContact, deleteContact, convertContactToClient, isSaving } =
    useAppStore();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  function openCreate() {
    setActiveContact(null);
    setDialogMode("create");
  }

  function openEdit(contact: Contact) {
    setActiveContact(contact);
    setDialogMode("edit");
  }

  function openHistory(contact: Contact) {
    setActiveContact(contact);
    setDialogMode("history");
  }

  function closeDialog() {
    setDialogMode(null);
    setActiveContact(null);
  }

  async function handleSubmit(input: ContactInput) {
    try {
      if (dialogMode === "edit" && activeContact) {
        await updateContact(activeContact.id, input);
      } else {
        await addContact(input);
      }
      closeDialog();
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Usunąć ten kontakt?")) {
      return;
    }
    try {
      await deleteContact(id);
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  async function handleConvert(contact: Contact) {
    if (
      !window.confirm(
        `Przekształcić kontakt „${contact.fullName}” w klienta? Pojawi się w sekcji Klienci.`,
      )
    ) {
      return;
    }

    try {
      await convertContactToClient(contact.id);
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 p-4">
          <div>
            <p className="font-semibold text-foreground">Lista kontaktów</p>
            <p className="text-sm text-muted">{contacts.length} kontaktów w widoku</p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj kontakt
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Lokalizacja</th>
                <th className="px-4 py-3">Dane kontaktowe</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Brak kontaktów pasujących do filtrów.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const converted = isContactConverted(contact);
                  return (
                    <tr key={contact.id} className="hover:bg-surface-muted/60">
                      <td className="px-4 py-3 font-medium">{contact.fullName || "—"}</td>
                      <td className="px-4 py-3">{contact.location || "—"}</td>
                      <td className="px-4 py-3">
                        {[contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {converted ? (
                          <div className="grid gap-1">
                            <span className="text-emerald-300">Klient</span>
                            {contact.convertedAt ? (
                              <span className="text-xs text-muted">
                                {formatDateTime(contact.convertedAt)}
                              </span>
                            ) : null}
                            {contact.convertedClientId ? (
                              <Link
                                href={`/przestrzenie/klient/${contact.convertedClientId}`}
                                className="text-xs text-accent hover:underline"
                              >
                                Otwórz klienta
                              </Link>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted">Aktywny kontakt</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openHistory(contact)}
                          >
                            Historia
                          </Button>
                          {!converted ? (
                            <>
                              <Button type="button" variant="secondary" size="sm" asChild>
                                <Link href={`/oferty/nowy?contactId=${encodeURIComponent(contact.id)}`}>
                                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                                  Nowa oferta
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleConvert(contact)}
                              >
                                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                Stwórz klienta
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(contact)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDelete(contact.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edytuj kontakt" : "Nowy kontakt"}</DialogTitle>
            <DialogDescription>
              Kontakt może później zostać przekształcony w klienta ręcznie lub po akceptacji oferty.
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            contact={dialogMode === "edit" ? activeContact : null}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "history"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Historia kontaktu</DialogTitle>
            <DialogDescription>{activeContact?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[420px] gap-3 overflow-y-auto">
            {(activeContact?.history ?? []).length === 0 ? (
              <p className="text-sm text-muted">Brak wpisów w historii.</p>
            ) : (
              [...(activeContact?.history ?? [])].reverse().map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border/70 p-3 text-sm">
                  <p className="font-medium text-foreground">{entry.message}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(entry.at)}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
