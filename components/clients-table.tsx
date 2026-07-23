"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Edit, CalendarClock, LayoutDashboard, Plus, Star, Trash2 } from "lucide-react";
import { ClientForm } from "@/components/client-form";
import { InspectionPlanWizard } from "@/components/inspections/inspection-plan-wizard";
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
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type DialogMode = "create" | "edit" | null;

export function ClientsTable({
  clients,
  favoriteClientIds,
  onTogglePin,
}: {
  clients: Client[];
  favoriteClientIds: Set<string>;
  onTogglePin: (clientId: string) => void;
}) {
  const router = useRouter();
  const addClient = useAppStore((state) => state.addClient);
  const updateClient = useAppStore((state) => state.updateClient);
  const deleteClient = useAppStore((state) => state.deleteClient);
  const isSaving = useAppStore((state) => state.isSaving);
  const projects = useAppStore((state) => state.projects);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [planClient, setPlanClient] = useState<Client | null>(null);

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

  function openClientSpace(clientId: string) {
    router.push(`/przestrzenie/klient/${clientId}`);
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 p-4">
          <div>
            <p className="font-semibold text-foreground">Lista klientów</p>
            <p className="text-sm text-muted">{clients.length} klientów w widoku</p>
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
                <th className="px-4 py-3">Imię</th>
                <th className="px-4 py-3">Nazwisko</th>
                <th className="px-4 py-3">Lokalizacja</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">ID zewnętrzne</th>
                <th className="px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Brak klientów pasujących do filtrów.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const hasProjects = projects.some((project) => project.clientId === client.id);

                  return (
                  <tr
                    key={client.id}
                    className={cn(
                      "cursor-pointer hover:bg-surface-muted/60",
                      !hasProjects && "bg-amber-500/8 hover:bg-amber-500/12",
                    )}
                    onClick={() => openClientSpace(client.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onTogglePin(client.id);
                          }}
                          title={
                            favoriteClientIds.has(client.id)
                              ? "Usuń z ulubionych"
                              : "Dodaj do ulubionych"
                          }
                          className="text-muted transition hover:text-amber-400"
                        >
                          <Star
                            className="h-4 w-4"
                            fill={favoriteClientIds.has(client.id) ? "currentColor" : "none"}
                            strokeWidth={2}
                          />
                        </button>
                        <span>{client.firstName || "—"}</span>
                        {!hasProjects ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                            Brak projektu
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{client.lastName || "—"}</td>
                    <td className="px-4 py-3">{client.location || "—"}</td>
                    <td className="px-4 py-3">
                      {[client.email, client.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3">{client.externalId || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link href={`/przestrzenie/klient/${client.id}`} title="Dashboard klienta">
                            <LayoutDashboard className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          title="Zaplanuj przeglądy"
                          onClick={() => setPlanClient(client)}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                        </Button>
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
                  );
                })
              )}
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

      <InspectionPlanWizard
        open={Boolean(planClient)}
        client={planClient}
        projects={projects}
        onClose={() => setPlanClient(null)}
        onSuccess={() => {
          setPlanClient(null);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("inspections-count-changed"));
          }
        }}
      />
    </>
  );
}
