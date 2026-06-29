"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ChecklistItemDialog } from "@/components/process/checklist-item-dialog";
import { ChecklistMobileNav } from "@/components/process/checklist-mobile-nav";
import { Field, Textarea } from "@/components/ui/input";
import type { UserProfile } from "@/lib/auth/types";
import { boardSectionDomId, scrollToBoardSection } from "@/lib/board-scroll";
import { INTERNAL_ACCEPTANCE_STATUS_STYLES } from "@/lib/internal-acceptance/status-styles";
import {
  INTERNAL_ACCEPTANCE_STATUS_LABELS,
  type InternalAcceptanceStatus,
} from "@/lib/internal-acceptance/types";
import {
  checklistLineStatus,
  checklistProgress,
  getChecklistSections,
  isChecklistLineComplete,
  normalizeChecklistPayload,
} from "@/lib/process/item-payload";
import type { ChecklistItemPayload, ChecklistLine } from "@/lib/process/types";
import { cn, formatDateTime } from "@/lib/utils";

function applyLinePatch(
  payload: ChecklistItemPayload,
  sectionId: string,
  lineId: string,
  patch: Partial<ChecklistLine>,
  actorName: string,
): ChecklistItemPayload {
  return {
    ...payload,
    sections: getChecklistSections(payload).map((section) => {
      if (section.id !== sectionId) {
        return section;
      }
      return {
        ...section,
        lines: section.lines.map((line) => {
          if (line.id !== lineId) {
            return line;
          }
          const nextStatus = patch.status ?? line.status ?? checklistLineStatus(line);
          const complete = patch.status
            ? isChecklistLineComplete(patch.status)
            : patch.checked ?? line.checked;
          return {
            ...line,
            ...patch,
            status: nextStatus,
            checked: complete,
            checkedAt:
              patch.checkedAt ??
              (complete ? new Date().toISOString() : patch.status ? undefined : line.checkedAt),
            checkedBy:
              patch.checkedBy ?? (complete ? actorName : patch.status ? undefined : line.checkedBy),
          };
        }),
      };
    }),
  };
}

export function ProcessChecklistBoard({
  initialPayload,
  readOnly = false,
  actorId,
  actorName = "Zespół",
  teamProfiles = [],
  publicToken,
  onSave,
}: {
  initialPayload: ChecklistItemPayload;
  readOnly?: boolean;
  actorId?: string;
  actorName?: string;
  teamProfiles?: UserProfile[];
  publicToken?: string;
  onSave?: (payload: ChecklistItemPayload) => Promise<void>;
}) {
  const [payload, setPayload] = useState(() => normalizeChecklistPayload(initialPayload));
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [navSectionId, setNavSectionId] = useState<string | null>(null);

  const actor = useMemo(
    () => ({ id: actorId, name: actorName.trim() || "Zespół" }),
    [actorId, actorName],
  );

  useEffect(() => {
    setPayload(normalizeChecklistPayload(initialPayload));
  }, [initialPayload]);

  const sections = useMemo(() => getChecklistSections(payload), [payload]);
  const progress = checklistProgress(payload);

  const activeEntry = useMemo(() => {
    for (const section of sections) {
      const line = section.lines.find((entry) => entry.id === activeLineId);
      if (line) {
        return { section, line };
      }
    }
    return null;
  }, [activeLineId, sections]);

  async function persist(nextPayload: ChecklistItemPayload) {
    const normalized = normalizeChecklistPayload(nextPayload);
    setError(null);
    try {
      if (publicToken) {
        const response = await fetch(`/api/element/${publicToken}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklist: normalized, actorName: actor.name }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Błąd zapisu.");
        }
        const body = (await response.json()) as { checklist: ChecklistItemPayload };
        setPayload(normalizeChecklistPayload(body.checklist));
      } else if (onSave) {
        await onSave(normalized);
        setPayload(normalized);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
      throw saveError;
    }
  }

  async function persistLinePatch(sectionId: string, lineId: string, patch: Partial<ChecklistLine>) {
    setSavingLineId(lineId);
    try {
      await persist(applyLinePatch(payload, sectionId, lineId, patch, actor.name));
    } finally {
      setSavingLineId(null);
    }
  }

  function handleLocalLinePatch(sectionId: string, lineId: string, patch: Partial<ChecklistLine>) {
    setPayload((current) => applyLinePatch(current, sectionId, lineId, patch, actor.name));
  }

  const showMobileNav = sections.length > 1;

  return (
    <div className={cn("grid gap-4", showMobileNav && "pb-24 md:pb-0")}>
      <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/25 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          {progress.completed}/{progress.total} punktów ·{" "}
          {progress.total ? Math.round((progress.completed / progress.total) * 100) : 0}%
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {sections.map((section) => (
          <section
            key={section.id}
            id={boardSectionDomId("checklist-section", section.id)}
            className="rounded-xl border border-border/70 bg-surface/40 p-3 scroll-mt-3"
          >
            <h3 className="mb-2 text-sm font-semibold text-foreground">{section.name}</h3>
            <div className="grid gap-2">
              {section.lines.map((line) => {
                const status = checklistLineStatus(line);
                const styles = INTERNAL_ACCEPTANCE_STATUS_STYLES[status];
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => {
                      setActiveLineId(line.id);
                      setActiveSectionId(section.id);
                    }}
                    className={cn(
                      "rounded-lg border border-l-4 px-3 py-2.5 text-left text-sm transition",
                      styles.row,
                      activeLineId === line.id && styles.rowActive,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.dot)} />
                        <span className="font-medium text-foreground">{line.text}</span>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                          styles.badge,
                        )}
                      >
                        {INTERNAL_ACCEPTANCE_STATUS_LABELS[status]}
                      </span>
                    </div>
                    {line.assigneeName || line.checkedAt ? (
                      <p className="mt-1 pl-4 text-[11px] text-muted/80">
                        {line.assigneeName ? `Odp.: ${line.assigneeName}` : null}
                        {line.assigneeName && line.checkedAt ? " · " : null}
                        {line.checkedAt ? formatDateTime(line.checkedAt) : null}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {!readOnly ? (
        <Field label="Notatka do checklisty">
          <Textarea
            value={payload.note ?? ""}
            disabled={Boolean(savingLineId)}
            onChange={(event) => setPayload({ ...payload, note: event.target.value })}
            onBlur={() => void persist({ ...payload })}
          />
        </Field>
      ) : payload.note ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Notatka</p>
          <p className="mt-1 text-sm text-foreground">{payload.note}</p>
        </div>
      ) : null}

      <ChecklistItemDialog
        line={activeEntry?.line ?? null}
        open={activeLineId !== null}
        teamProfiles={teamProfiles}
        onOpenChange={(open) => {
          if (!open) {
            setActiveLineId(null);
            setActiveSectionId(null);
          }
        }}
        readOnly={readOnly}
        saving={activeLineId !== null && savingLineId === activeLineId}
        onStatusChange={(status: InternalAcceptanceStatus) => {
          if (activeSectionId && activeLineId) {
            void persistLinePatch(activeSectionId, activeLineId, { status });
          }
        }}
        onFieldChange={(patch) => {
          if (activeSectionId && activeLineId) {
            void persistLinePatch(activeSectionId, activeLineId, patch);
          }
        }}
        onLocalFieldChange={(patch) => {
          if (activeSectionId && activeLineId) {
            handleLocalLinePatch(activeSectionId, activeLineId, patch);
          }
        }}
      />

      <ChecklistMobileNav
        sections={sections}
        activeSectionId={navSectionId}
        onSelect={(sectionId) => {
          setNavSectionId(sectionId);
          scrollToBoardSection(boardSectionDomId("checklist-section", sectionId));
        }}
      />

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
