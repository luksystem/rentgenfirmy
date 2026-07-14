"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VIZ_DASHBOARD_STATUSES, VIZ_DASHBOARD_STATUS_LABELS } from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";
import { useAppStore } from "@/store/app-store";

type VizCreateDashboardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VizCreateDashboardDialog({ open, onOpenChange }: VizCreateDashboardDialogProps) {
  const router = useRouter();
  const templates = useVizStore((s) => s.templates);
  const createDashboard = useVizStore((s) => s.createDashboard);
  const clients = useAppStore((s) => s.clients);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateSlug, setTemplateSlug] = useState("decathlon_bms");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<(typeof VIZ_DASHBOARD_STATUSES)[number]>("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedClients = useMemo(
    () =>
      [...clients].sort((a, b) => {
        const aName = [a.firstName, a.lastName].filter(Boolean).join(" ");
        const bName = [b.firstName, b.lastName].filter(Boolean).join(" ");
        return aName.localeCompare(bName, "pl");
      }),
    [clients],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Nazwa jest wymagana.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const dashboard = await createDashboard({
        name: name.trim(),
        description: description.trim() || null,
        templateSlug: templateSlug || null,
        clientId: clientId || null,
        status,
      });
      onOpenChange(false);
      setName("");
      setDescription("");
      setClientId("");
      setStatus("draft");
      router.push(`/wizualizacje/${dashboard.id}/konfiguracja`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Błąd tworzenia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nowy dashboard</DialogTitle>
          <DialogDescription>
            Wybierz szablon, klienta i nadaj nazwę. Po utworzeniu przypiszesz projekty i mapowania
            zmiennych.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nazwa</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Decathlon — sieć sklepów PL"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Opis</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcjonalny opis dashboardu"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Szablon</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
              value={templateSlug}
              onChange={(e) => setTemplateSlug(e.target.value)}
            >
              <option value="">Bez szablonu</option>
              {templates.map((template) => (
                <option key={template.slug} value={template.slug}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Klient</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— wybierz klienta —</option>
              {sortedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {[client.firstName, client.lastName].filter(Boolean).join(" ") ||
                    client.location ||
                    client.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof VIZ_DASHBOARD_STATUSES)[number])
              }
            >
              {VIZ_DASHBOARD_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {VIZ_DASHBOARD_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Tworzenie…" : "Utwórz dashboard"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
