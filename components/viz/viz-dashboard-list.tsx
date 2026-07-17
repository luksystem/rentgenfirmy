"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Loader2, Plus, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VizCreateDashboardDialog } from "@/components/viz/viz-create-dashboard-dialog";
import { VIZ_DASHBOARD_STATUS_LABELS, type VizDashboardStatus } from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

function statusTone(status: VizDashboardStatus): "active" | "waiting" | "closed" {
  if (status === "active") return "active";
  if (status === "draft") return "waiting";
  return "closed";
}

export function VizDashboardList() {
  const dashboards = useVizStore((s) => s.dashboards);
  const isLoading = useVizStore((s) => s.isLoading);
  const hydrated = useVizStore((s) => s.hydrated);
  const error = useVizStore((s) => s.error);
  const ensure = useVizStore((s) => s.hydrate);
  const clients = useAppStore((s) => s.clients);
  const profile = useAuthStore((s) => s.profile);
  const [createOpen, setCreateOpen] = useState(false);

  const canCreateDashboard =
    profile?.role === "administrator" ||
    profile?.role === "manager" ||
    profile?.role === "instalator" ||
    profile?.role === "podwykonawca";

  const loading = isLoading && !hydrated;

  const clientNameById = useMemo(
    () =>
      new Map(
        clients.map((c) => [
          c.id,
          [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.location || c.id,
        ]),
      ),
    [clients],
  );

  if (error && !hydrated) {
    return (
      <Card className="p-6">
        <p className="text-sm text-rose-300">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={() => void ensure({ force: true })}>
          Spróbuj ponownie
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {loading ? "Ładowanie dashboardów…" : `${dashboards.length} dashboardów`}
        </p>
        {canCreateDashboard ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nowy dashboard
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Ładowanie…
        </div>
      ) : dashboards.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <LayoutDashboard className="h-10 w-10 text-muted" />
          <div>
            <p className="font-medium text-foreground">Brak dashboardów</p>
            <p className="mt-1 max-w-md text-sm text-muted">
              {canCreateDashboard
                ? "Utwórz pierwszy dashboard BMS, wybierz szablon Decathlon i przypisz projekty sklepów."
                : "Nie masz jeszcze przypisanych dashboardów. Skontaktuj się z administratorem Luksystem."}
            </p>
          </div>
          {canCreateDashboard ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Utwórz dashboard
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/wizualizacje/${dashboard.id}`}
                    className="text-lg font-semibold text-foreground hover:text-accent"
                  >
                    {dashboard.name}
                  </Link>
                  {dashboard.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{dashboard.description}</p>
                  ) : null}
                </div>
                <Badge tone={statusTone(dashboard.status)}>
                  {VIZ_DASHBOARD_STATUS_LABELS[dashboard.status]}
                </Badge>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted">Szablon</dt>
                  <dd>{dashboard.templateName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Klient</dt>
                  <dd>
                    {dashboard.clientName ??
                      (dashboard.clientId ? clientNameById.get(dashboard.clientId) : null) ??
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Sklepy / projekty</dt>
                  <dd>{dashboard.projectCount}</dd>
                </div>
                <div>
                  <dt className="text-muted">Aktualizacja</dt>
                  <dd>{new Date(dashboard.updatedAt).toLocaleDateString("pl-PL")}</dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                <Button asChild size="sm" variant="default">
                  <Link href={`/wizualizacje/${dashboard.id}`}>Otwórz</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/wizualizacje/${dashboard.id}/konfiguracja`}>
                    <Settings2 className="h-3.5 w-3.5" />
                    Konfiguracja
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {canCreateDashboard ? (
        <VizCreateDashboardDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </>
  );
}
