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

function RotItemRow({
  item,
  onOpenDetail,
  canEditReview,
  onSaveReviewDate,
  onMarkReviewed,
  thresholds,
}: {
  item: RotItem;
  onOpenDetail: (item: RotItem) => void;
  canEditReview: boolean;
  onSaveReviewDate: (item: RotItem, date: string | null) => Promise<void>;
  onMarkReviewed: (item: RotItem) => Promise<void>;
  thresholds: PolicyThresholds;
}) {
  const stale = item.rotStatus !== "ZAMKNIETE" && item.daysOpen > thresholds.rotStagnationDays;
  const isAutoReviewDate = !item.reviewDate;
  const effectiveReviewDate = item.effectiveReviewDate;
  const reviewOverdue =
    item.rotStatus !== "ZAMKNIETE" && effectiveReviewDate.slice(0, 10) < toLocalIsoDate(new Date());
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
          <Badge tone={item.stageTitle ? "neutral" : "waiting"} className="text-[10px]">
            {item.stageTitle ?? "Bez przypisania"}
          </Badge>
          {item.moveCount != null && item.moveCount > 0 ? (
            <Badge tone={item.moveCount >= 3 ? "critical" : "waiting"} className="text-[10px]">
              {item.moveCount >= 3 ? <AlertTriangle className="h-3 w-3" /> : null}
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
    </div>
  );
}

export default function RotPage() {
  const [items, setItems] = useState<RotItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
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

  const grouped = useMemo(() => {
    const byStatus: Record<RotStatus, RotItem[]> = { CZEKA_NA_ZEWNETRZNE: [], W_TOKU: [], ZAMKNIETE: [] };
    const todayIso = toLocalIsoDate(new Date());
    for (const item of items ?? []) {
      if (onlyOverdue && !(item.rotStatus !== "ZAMKNIETE" && item.effectiveReviewDate.slice(0, 10) < todayIso)) {
        continue;
      }
      byStatus[item.rotStatus].push(item);
    }
    return byStatus;
  }, [items, onlyOverdue]);

  function itemKey(item: Pick<RotItem, "sourceType" | "sourceId">) {
    return `${item.sourceType}-${item.sourceId}`;
  }

  function handleOpenDetail(item: RotItem) {
    setDetailKey(itemKey(item));
  }

  const detailGroup = useMemo(() => {
    if (!detailKey) return [];
    for (const status of STATUS_ORDER) {
      if (grouped[status].some((row) => itemKey(row) === detailKey)) {
        return grouped[status];
      }
    }
    return [];
  }, [detailKey, grouped]);

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

      <label className="mb-3 flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={onlyOverdue}
          onChange={(event) => setOnlyOverdue(event.target.checked)}
          className="h-4 w-4 rounded border-border/70"
        />
        Tylko po dacie kontroli
      </label>

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
