"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeRecord,
  type ServiceIntakeStatus,
} from "@/lib/service-intake/types";
import { cn, formatDate } from "@/lib/utils";

const STATUS_FILTERS: Array<{ id: ServiceIntakeStatus | "all"; label: string }> = [
  { id: "all", label: "Wszystkie" },
  { id: "new", label: "Nowe" },
  { id: "in_review", label: "W trakcie" },
  { id: "converted", label: "Przekształcone" },
  { id: "closed", label: "Zamknięte" },
  { id: "rejected", label: "Odrzucone" },
];

export function ServiceIntakeListPanel() {
  const [items, setItems] = useState<ServiceIntakeRecord[]>([]);
  const [filter, setFilter] = useState<ServiceIntakeStatus | "all">("new");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/service-intake${query}`, { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać zgłoszeń.");
      }
      setItems(payload.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function updateStatus(id: string, status: ServiceIntakeStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zaktualizować statusu.");
      }
      await loadItems();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Błąd.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm",
              filter === entry.id
                ? "bg-accent text-white"
                : "border border-border bg-surface-muted text-muted",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Wczytywanie…
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Brak zgłoszeń w tym filtrze.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="grid gap-3 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {item.referenceNumber} · {item.projectName ?? "Obiekt"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.clientName ?? item.contactFullName} · {item.contactEmail}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(item.createdAt)} · {SERVICE_INTAKE_PRIORITY_LABELS[item.priority]} ·{" "}
                    {item.serviceTypeHint}
                  </p>
                </div>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">
                  {SERVICE_INTAKE_STATUS_LABELS[item.status]}
                </span>
              </div>

              <p className="text-sm text-foreground">{item.description}</p>

              <div className="flex flex-wrap gap-2">
                {item.status === "new" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={updatingId === item.id}
                    onClick={() => void updateStatus(item.id, "in_review")}
                  >
                    Przyjmij
                  </Button>
                ) : null}
                {item.status !== "converted" && item.status !== "closed" && item.status !== "rejected" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === item.id}
                      onClick={() => void updateStatus(item.id, "closed")}
                    >
                      Zamknij
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === item.id}
                      onClick={() => void updateStatus(item.id, "rejected")}
                    >
                      Odrzuć
                    </Button>
                  </>
                ) : null}
                <Button size="sm" variant="outline" asChild>
                  <Link href="/oferty/nowy">Utwórz ofertę</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
