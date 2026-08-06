"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { MilestoneDateBadge } from "@/components/process/milestone-date-badge";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectEdit } from "@/components/project-edit-provider";
import { RotItemDetailPanel } from "@/components/rot/rot-item-detail-panel";
import { hasFullAppAccess } from "@/lib/auth/types";
import { DEFAULT_POLICY_THRESHOLDS, type PolicyThresholds } from "@/lib/policy-thresholds/types";
import { ROT_CATEGORY_LABELS, ROT_SOURCE_LABELS, ROT_STATUS_LABELS, type RotItem, type RotStatus } from "@/lib/rot/types";
import { toLocalIsoDate } from "@/lib/rot/review-date";
import { fetchPolicyThresholds } from "@/lib/supabase/policy-thresholds-repository";
import {
  clearRotItemReviewDate,
  fetchRotItems,
  markRotItemReviewed,
  setRotItemReviewDate,
} from "@/lib/supabase/rot-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

const STATUS_ORDER: RotStatus[] = ["CZEKA_NA_ZEWNETRZNE", "W_TOKU", "ZAMKNIETE"];

const STATUS_TONES: Record<RotStatus, "waiting" | "blue" | "closed"> = {
  CZEKA_NA_ZEWNETRZNE: "waiting",
  W_TOKU: "blue",
  ZAMKNIETE: "closed",
};

const UNASSIGNED_STAGE_KEY = "__bez_przypisania__";

/** Klucz i etykieta etapu pozycji — wskazany (stageId) ma pierwszeństwo przed wywnioskowanym
 *  (nigdy nie występują razem, patrz migracja 309). Klucz po id, nie po tytule — ten sam etap w
 *  dwóch projektach ma ten sam process_stages.id. */
function stageOf(item: RotItem): { key: string; title: string; inferred: boolean } {
  if (item.stageId) return { key: item.stageId, title: item.stageTitle ?? item.stageId, inferred: false };
  if (item.inferredStageId) {
    return { key: item.inferredStageId, title: item.inferredStageTitle ?? item.inferredStageId, inferred: true };
  }
  return { key: UNASSIGNED_STAGE_KEY, title: "Bez przypisania", inferred: false };
}

function RotItemRow({
  item,
  onOpenDetail,
  canEditReview,
  onSaveReviewDate,
  onMarkReviewed,
  thresholds,
  showStatusBadge,
}: {
  item: RotItem;
  onOpenDetail: (item: RotItem) => void;
  canEditReview: boolean;
  onSaveReviewDate: (item: RotItem, date: string | null) => Promise<void>;
  onMarkReviewed: (item: RotItem) => Promise<void>;
  thresholds: PolicyThresholds;
  /** Widok "Wg etapu" miesza statusy w jednej sekcji — status trzeba wtedy pokazać w wierszu,
   *  żeby nie zgubić informacji, którą normalnie niesie nagłówek sekcji. */
  showStatusBadge?: boolean;
}) {
  const stale = item.rotStatus !== "ZAMKNIETE" && item.daysOpen > thresholds.rotStagnationDays;
  const isAutoReviewDate = !item.reviewDate;
  const effectiveReviewDate = item.effectiveReviewDate;
  const reviewOverdue =
    item.rotStatus !== "ZAMKNIETE" && effectiveReviewDate.slice(0, 10) < toLocalIsoDate(new Date());
  const stage = stageOf(item);
  const carriedOver = item.moveCount != null && item.moveCount > 0;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenDetail(item)}
          className="min-w-0 truncate text-sm font-medium text-foreground hover:underline"
          title="Otwórz tę pozycję (nie cały projekt)"
        >
          {item.projectName}
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral" className="text-[10px]">
            {ROT_SOURCE_LABELS[item.sourceType]}
          </Badge>
          {showStatusBadge ? (
            <Badge tone={STATUS_TONES[item.rotStatus]} className="text-[10px]">
              {ROT_STATUS_LABELS[item.rotStatus]}
            </Badge>
          ) : null}
          <span
            title={stage.inferred ? "Wywnioskowany z project_stage_history — nikt tego nie wskazał wprost." : undefined}
          >
            <Badge
              tone={stage.key === UNASSIGNED_STAGE_KEY ? "waiting" : "neutral"}
              className={`text-[10px] ${stage.inferred ? "opacity-70" : ""}`}
            >
              {stage.title}
              {stage.inferred ? " (wywnioskowany)" : ""}
            </Badge>
          </span>
          {carriedOver ? (
            <Badge tone={item.moveCount! >= 3 ? "critical" : "waiting"} className="text-[10px]">
              {item.moveCount! >= 3 ? <AlertTriangle className="h-3 w-3" /> : null}
              przeniesiono {item.moveCount}×
            </Badge>
          ) : null}
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
          {reviewOverdue ? (
            <Badge tone="critical" className="text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              Po dacie kontroli
            </Badge>
          ) : null}
          {isAutoReviewDate ? (
            <span title="Wyliczona automatycznie — nikt jeszcze jej nie ustawił ręcznie.">
              <Badge tone="neutral" className="text-[10px]">
                sugerowana
              </Badge>
            </span>
          ) : null}
          {canEditReview ? (
            <MilestoneDateBadge
              date={effectiveReviewDate}
              editable
              onSave={(date) => onSaveReviewDate(item, date)}
              title={
                isAutoReviewDate
                  ? "Data wyliczona automatycznie. Kliknij, aby nadpisać ręcznie."
                  : "Kliknij, aby zmienić datę kontroli tej pozycji"
              }
              emptyLabel="Ustaw datę kontroli"
              ariaLabel="Data kontroli pozycji ROT"
            />
          ) : (
            <MilestoneDateBadge date={effectiveReviewDate} />
          )}
          {canEditReview && item.rotStatus !== "ZAMKNIETE" ? (
            <button
              type="button"
              onClick={() => void onMarkReviewed(item)}
              className="rounded-md border border-border/60 px-2 py-0.5 text-[10px] text-muted hover:bg-surface-muted/40 hover:text-foreground"
              title="Sprawdzono, temat wciąż otwarty — przesuwa datę kontroli o interwał do przodu."
            >
              Przejrzano
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-foreground/90">{item.title}</p>
      {item.detail ? <p className="text-xs text-muted">{item.detail}</p> : null}
      {carriedOver ? (
        <p className="text-xs text-amber-300">
          Pochodzi z etapu {item.originStageTitle ?? "nieznanego"}, przeniesiona {item.moveCount}×, czeka
          na: {item.carryOverReason ?? "—"}.
        </p>
      ) : null}
    </div>
  );
}

export default function RotPage() {
  const [items, setItems] = useState<RotItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"status" | "stage">("status");
  const [thresholds, setThresholds] = useState<PolicyThresholds>(DEFAULT_POLICY_THRESHOLDS);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const projects = useAppStore((state) => state.projects);
  const { openProjectEdit } = useProjectEdit();
  const profile = useAuthStore((state) => state.profile);
  const canEditReview = profile ? hasFullAppAccess(profile.role) : false;

  useEffect(() => {
    let cancelled = false;
    void fetchRotItems()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Nie udało się wczytać ROT.");
      });
    void fetchPolicyThresholds()
      .then((loaded) => {
        if (!cancelled) setThresholds(loaded);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpenProject(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (project) openProjectEdit(project);
  }

  async function handleSaveReviewDate(item: RotItem, date: string | null) {
    if (date) {
      await setRotItemReviewDate(item.sourceType, item.sourceId, date, profile?.id);
      setItems((current) =>
        (current ?? []).map((row) =>
          row.sourceType === item.sourceType && row.sourceId === item.sourceId
            ? { ...row, reviewDate: date, effectiveReviewDate: date }
            : row,
        ),
      );
      return;
    }
    // Czyszczenie: nowa data sugerowana (formuła) liczy się tylko w SQL — dociągnij świeży wiersz,
    // zamiast zgadywać ją tutaj i ryzykować drugą implementację tej samej logiki.
    await clearRotItemReviewDate(item.sourceType, item.sourceId);
    const refreshed = await fetchRotItems();
    setItems(refreshed);
  }

  async function handleMarkReviewed(item: RotItem) {
    const nextDate = await markRotItemReviewed(
      item.sourceType,
      item.sourceId,
      thresholds.rotReviewDefaultIntervalDays,
      profile?.id,
    );
    setItems((current) =>
      (current ?? []).map((row) =>
        row.sourceType === item.sourceType && row.sourceId === item.sourceId
          ? { ...row, reviewDate: nextDate, effectiveReviewDate: nextDate }
          : row,
      ),
    );
  }

  const filteredItems = useMemo(() => {
    const todayIso = toLocalIsoDate(new Date());
    return (items ?? []).filter((item) => {
      if (onlyOverdue && !(item.rotStatus !== "ZAMKNIETE" && item.effectiveReviewDate.slice(0, 10) < todayIso)) {
        return false;
      }
      if (stageFilter !== "all" && stageOf(item).key !== stageFilter) {
        return false;
      }
      return true;
    });
  }, [items, onlyOverdue, stageFilter]);

  const grouped = useMemo(() => {
    const byStatus: Record<RotStatus, RotItem[]> = { CZEKA_NA_ZEWNETRZNE: [], W_TOKU: [], ZAMKNIETE: [] };
    for (const item of filteredItems) {
      byStatus[item.rotStatus].push(item);
    }
    return byStatus;
  }, [filteredItems]);

  /** Opcje filtra etapu — po id (stageOf.key), zeby ten sam etap w dwoch projektach byl jednym
   *  wpisem. Liczone z NIEFILTROWANYCH pozycji, zeby wybranie etapu nie usuwalo go z listy opcji. */
  const stageOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items ?? []) {
      const stage = stageOf(item);
      if (!map.has(stage.key)) map.set(stage.key, stage.title);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pl"));
  }, [items]);

  /** Widok "Wg etapu" — dodatkowy wymiar, nie nowa nawigacja: zamkniete pozycje pomijamy (pytanie
   *  brzmi "co jest otwarte na etapie X", nie "co kiedykolwiek tam bylo"). */
  const groupedByStage = useMemo(() => {
    const map = new Map<string, { title: string; items: RotItem[] }>();
    for (const item of filteredItems) {
      if (item.rotStatus === "ZAMKNIETE") continue;
      const stage = stageOf(item);
      const bucket = map.get(stage.key) ?? { title: stage.title, items: [] };
      bucket.items.push(item);
      map.set(stage.key, bucket);
    }
    return Array.from(map.entries()).sort(([keyA, a], [keyB, b]) => {
      if (keyA === UNASSIGNED_STAGE_KEY) return 1;
      if (keyB === UNASSIGNED_STAGE_KEY) return -1;
      return a.title.localeCompare(b.title, "pl");
    });
  }, [filteredItems]);

  function itemKey(item: Pick<RotItem, "sourceType" | "sourceId">) {
    return `${item.sourceType}-${item.sourceId}`;
  }

  function handleOpenDetail(item: RotItem) {
    setDetailKey(itemKey(item));
  }

  const detailGroup = useMemo(() => {
    if (!detailKey) return [];
    if (viewMode === "stage") {
      for (const [, bucket] of groupedByStage) {
        if (bucket.items.some((row) => itemKey(row) === detailKey)) {
          return bucket.items;
        }
      }
      return [];
    }
    for (const status of STATUS_ORDER) {
      if (grouped[status].some((row) => itemKey(row) === detailKey)) {
        return grouped[status];
      }
    }
    return [];
  }, [detailKey, grouped, groupedByStage, viewMode]);

  const detailIndex = detailGroup.findIndex((row) => itemKey(row) === detailKey);
  const detailItem = detailIndex >= 0 ? detailGroup[detailIndex] : null;

  function handleNavigateDetail(direction: "prev" | "next") {
    if (detailIndex < 0) return;
    const nextIndex = direction === "prev" ? detailIndex - 1 : detailIndex + 1;
    const nextItem = detailGroup[nextIndex];
    if (nextItem) setDetailKey(itemKey(nextItem));
  }

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

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={onlyOverdue}
            onChange={(event) => setOnlyOverdue(event.target.checked)}
            className="h-4 w-4 rounded border-border/70"
          />
          Tylko po dacie kontroli
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          Etap:
          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
            className="rounded-md border border-border/70 bg-transparent px-2 py-1 text-sm text-foreground"
          >
            <option value="all">Wszystkie</option>
            {stageOptions.map(([key, title]) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1 text-sm text-muted">
          Widok:
          <button
            type="button"
            onClick={() => setViewMode("status")}
            className={`rounded-md border px-2 py-1 text-xs ${
              viewMode === "status" ? "border-accent/60 text-accent" : "border-border/70 text-muted"
            }`}
          >
            Wg statusu
          </button>
          <button
            type="button"
            onClick={() => setViewMode("stage")}
            className={`rounded-md border px-2 py-1 text-xs ${
              viewMode === "stage" ? "border-accent/60 text-accent" : "border-border/70 text-muted"
            }`}
          >
            Wg etapu
          </button>
        </div>
      </div>

      {items === null ? (
        <p className="text-sm text-muted">Ładowanie…</p>
      ) : viewMode === "stage" ? (
        <div className="grid gap-4">
          {groupedByStage.length === 0 ? (
            <p className="text-sm text-muted">Brak otwartych pozycji.</p>
          ) : (
            groupedByStage.map(([key, bucket]) => (
              <Card key={key}>
                <CardContent className="grid gap-2 py-5">
                  <div className="flex items-center gap-2">
                    <Badge tone={key === UNASSIGNED_STAGE_KEY ? "waiting" : "neutral"}>{bucket.title}</Badge>
                    <span className="text-xs text-muted">{bucket.items.length}</span>
                  </div>
                  <div className="grid gap-2">
                    {bucket.items.map((item) => (
                      <RotItemRow
                        key={`${item.sourceType}-${item.sourceId}`}
                        item={item}
                        onOpenDetail={handleOpenDetail}
                        canEditReview={canEditReview}
                        onSaveReviewDate={handleSaveReviewDate}
                        onMarkReviewed={handleMarkReviewed}
                        thresholds={thresholds}
                        showStatusBadge
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
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
                        onOpenDetail={handleOpenDetail}
                        canEditReview={canEditReview}
                        onSaveReviewDate={handleSaveReviewDate}
                        onMarkReviewed={handleMarkReviewed}
                        thresholds={thresholds}
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
                        onOpenDetail={handleOpenDetail}
                        canEditReview={canEditReview}
                        onSaveReviewDate={handleSaveReviewDate}
                        onMarkReviewed={handleMarkReviewed}
                        thresholds={thresholds}
                      />
                    ))}
                  </div>
                )
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      <RotItemDetailPanel
        item={detailItem}
        onClose={() => setDetailKey(null)}
        onOpenProject={handleOpenProject}
        onNavigate={handleNavigateDetail}
        hasPrev={detailIndex > 0}
        hasNext={detailIndex >= 0 && detailIndex < detailGroup.length - 1}
      />
    </>
  );
}
