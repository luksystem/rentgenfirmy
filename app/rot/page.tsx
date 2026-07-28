"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectEdit } from "@/components/project-edit-provider";
import { ROT_CATEGORY_LABELS, ROT_SOURCE_LABELS, ROT_STATUS_LABELS, type RotItem, type RotStatus } from "@/lib/rot/types";
import { fetchRotItems } from "@/lib/supabase/rot-repository";
import { useAppStore } from "@/store/app-store";

const STATUS_ORDER: RotStatus[] = ["CZEKA_NA_ZEWNETRZNE", "W_TOKU", "ZAMKNIETE"];

const STATUS_TONES: Record<RotStatus, "waiting" | "blue" | "closed"> = {
  CZEKA_NA_ZEWNETRZNE: "waiting",
  W_TOKU: "blue",
  ZAMKNIETE: "closed",
};

function RotItemRow({ item, onOpenProject }: { item: RotItem; onOpenProject: (projectId: string) => void }) {
  const stale = item.rotStatus !== "ZAMKNIETE" && item.daysOpen > 5;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenProject(item.projectId)}
          className="min-w-0 truncate text-sm font-medium text-foreground hover:underline"
        >
          {item.projectName}
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral" className="text-[10px]">
            {ROT_SOURCE_LABELS[item.sourceType]}
          </Badge>
          {item.category ? (
            <Badge tone="waiting" className="text-[10px]">
              {ROT_CATEGORY_LABELS[item.category]}
            </Badge>
          ) : null}
          {stale ? (
            <Badge tone="critical" className="text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              {item.daysOpen} dni bez ruchu
            </Badge>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-foreground/90">{item.title}</p>
      {item.detail ? <p className="text-xs text-muted">{item.detail}</p> : null}
    </div>
  );
}

export default function RotPage() {
  const [items, setItems] = useState<RotItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const projects = useAppStore((state) => state.projects);
  const { openProjectEdit } = useProjectEdit();

  useEffect(() => {
    let cancelled = false;
    void fetchRotItems()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Nie udało się wczytać ROT.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpenProject(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (project) openProjectEdit(project);
  }

  const grouped = useMemo(() => {
    const byStatus: Record<RotStatus, RotItem[]> = { CZEKA_NA_ZEWNETRZNE: [], W_TOKU: [], ZAMKNIETE: [] };
    for (const item of items ?? []) {
      byStatus[item.rotStatus].push(item);
    }
    return byStatus;
  }, [items]);

  return (
    <>
      <PageHeader
        eyebrow="Otwarte pętle"
        title="ROT — Rejestr Otwartych Tematów"
        description="Widok, nie osobny byt: zbiera otwarte tematy z kanbana, zmian projektowych, szybkich ofert i ustaleń. Każdy temat ma jedno miejsce prawdy — tu tylko go widać."
      />

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}

      {items === null ? (
        <p className="text-sm text-muted">Ładowanie…</p>
      ) : (
        <div className="grid gap-4">
          {STATUS_ORDER.filter((status) => status !== "ZAMKNIETE").map((status) => (
            <Card key={status}>
              <CardContent className="grid gap-2 py-5">
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONES[status]}>{ROT_STATUS_LABELS[status]}</Badge>
                  <span className="text-xs text-muted">{grouped[status].length}</span>
                </div>
                {grouped[status].length === 0 ? (
                  <p className="text-sm text-muted">Brak pozycji.</p>
                ) : (
                  <div className="grid gap-2">
                    {grouped[status].map((item) => (
                      <RotItemRow
                        key={`${item.sourceType}-${item.sourceId}`}
                        item={item}
                        onOpenProject={handleOpenProject}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="grid gap-2 py-5">
              <button
                type="button"
                className="flex items-center gap-2 text-left"
                onClick={() => setShowClosed((value) => !value)}
              >
                <Badge tone="closed">{ROT_STATUS_LABELS.ZAMKNIETE}</Badge>
                <span className="text-xs text-muted">
                  {grouped.ZAMKNIETE.length} — {showClosed ? "zwiń" : "pokaż"}
                </span>
              </button>
              {showClosed ? (
                grouped.ZAMKNIETE.length === 0 ? (
                  <p className="text-sm text-muted">Brak pozycji.</p>
                ) : (
                  <div className="grid gap-2">
                    {grouped.ZAMKNIETE.map((item) => (
                      <RotItemRow
                        key={`${item.sourceType}-${item.sourceId}`}
                        item={item}
                        onOpenProject={handleOpenProject}
                      />
                    ))}
                  </div>
                )
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
