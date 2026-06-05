"use client";

import { useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { ClientForm } from "@/components/client-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Client, ClientInput } from "@/lib/service/types";
import { useAppStore } from "@/store/app-store";

type DialogMode = "create" | "edit" | null;

export function ClientsTable() {
  const { clients, addClient, updateClient, deleteClient, isSaving } = useAppStore();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  function openCreate() {
    setEditingClient(null);
    setDialogMode("create");
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingClient(null);
  }

  async function handleSubmit(input: ClientInput) {
    try {
      if (dialogMode === "edit" && editingClient) {
        await updateClient(editingClient.id, input);
      } else {
        await addClient(input);
      }
      closeDialog();
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Usunąć tego klienta?")) {
      return;
    }

    try {
      await deleteClient(id);
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 p-4">
          <div>
            <p className="font-semibold text-foreground">Lista klientów</p>
            <p className="text-sm text-muted">{clients.length} klientów w bazie</p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj klienta
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Klient</th>
                <th className="px-4 py-3">Lokalizacja</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">ID zewnętrzne</th>
                <th className="px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-surface-muted/60">
                  <td className="px-4 py-3 font-medium">{client.fullName || "—"}</td>
                  <td className="px-4 py-3">{client.location || "—"}</td>
                  <td className="px-4 py-3">
                    {[client.email, client.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">{client.externalId || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(client)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(client.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edytuj klienta" : "Nowy klient"}</DialogTitle>
            <DialogDescription>
              Dane klienta mogą być powiązane z projektami i wyliczeniami serwisu.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            key={editingClient?.id ?? "new"}
            client={editingClient}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
