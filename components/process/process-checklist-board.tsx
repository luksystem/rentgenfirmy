"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Paperclip, Plus, StickyNote, Trash2 } from "lucide-react";
import type { ChecklistDocumentationUploadContext } from "@/components/process/checklist-line-documentation-panel";
import { ChecklistItemDialog } from "@/components/process/checklist-item-dialog";
import { ChecklistMobileNav } from "@/components/process/checklist-mobile-nav";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
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
  getChecklistDocumentationBlockReason,
  getChecklistLineAssignee,
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
  projectProcessItemId,
  defaultAssigneeId = null,
  defaultAssigneeName = null,
  onSave,
  raisedMobileNavForBack = false,
  onCreateTasksFromNote,
}: {
  initialPayload: ChecklistItemPayload;
  readOnly?: boolean;
  actorId?: string;
  actorName?: string;
  teamProfiles?: UserProfile[];
  publicToken?: string;
  projectProcessItemId?: string;
  /** Osoba odpowiedzialna za całą checklistę — punkty bez własnego przypisania ją dziedziczą. */
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
  onSave?: (payload: ChecklistItemPayload) => Promise<void>;
  raisedMobileNavForBack?: boolean;
  /** Checklista jest na etapie zamykającym projekt — pokaż "Utwórz taski z notatek" (widok zespołu). */
  onCreateTasksFromNote?: (note: string) => void;
}) {
  const [payload, setPayload] = useState(() => normalizeChecklistPayload(initialPayload));
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [navSectionId, setNavSectionId] = useState<string | null>(null);
  const [customLineDrafts, setCustomLineDrafts] = useState<Record<string, string>>({});
  const [mobileNoteOpen, setMobileNoteOpen] = useState(false);

  const actor = useMemo(
    () => ({ id: actorId, name: actorName.trim() || "Zespół" }),
    [actorId, actorName],
  );

  const documentationUploadContext = useMemo((): ChecklistDocumentationUploadContext | undefined => {
    if (readOnly) {
      return undefined;
    }
    if (publicToken) {
      return { mode: "public", publicToken, actorName: actor.name };
    }
    if (projectProcessItemId) {
      return { mode: "team", projectProcessItemId, actorName: actor.name };
    }
    return undefined;
  }, [actor.name, projectProcessItemId, publicToken, readOnly]);

  useEffect(() => {
    setPayload(normalizeChecklistPayload(initialPayload));
  }, [initialPayload]);

  const sections = useMemo(() => getChecklistSections(payload), [payload]);
  const progress = checklistProgress(payload);
  const defaultAssignee = useMemo(
    () => ({ assigneeId: defaultAssigneeId, assigneeName: defaultAssigneeName }),
    [defaultAssigneeId, defaultAssigneeName],
  );

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

  async function handleAddCustomLine(sectionId: string) {
    const text = (customLineDrafts[sectionId] ?? "").trim();
    if (!text) {
      return;
    }
    const newLine: ChecklistLine = {
      id: crypto.randomUUID(),
      text,
      checked: false,
      status: "NOT_STARTED",
      isCustom: true,
    };
    const nextPayload: ChecklistItemPayload = {
      ...payload,
      sections: getChecklistSections(payload).map((section) =>
        section.id === sectionId ? { ...section, lines: [...section.lines, newLine] } : section,
      ),
    };
    setCustomLineDrafts((current) => ({ ...current, [sectionId]: "" }));
    await persist(nextPayload);
  }

  async function handleRemoveCustomLine(sectionId: string, lineId: string) {
    const nextPayload: ChecklistItemPayload = {
      ...payload,
      sections: getChecklistSections(payload).map((section) =>
        section.id === sectionId
          ? { ...section, lines: section.lines.filter((line) => line.id !== lineId) }
          : section,
      ),
    };
    await persist(nextPayload);
  }

  const showMobileNav = sections.length > 1;
  const showMobileNoteBar = !readOnly;
  /** Wysokość pasków zakotwiczonych pod treścią na mobile — kafelki list i przycisk „Wróć”. */
  const NAV_TILES_REM = 4.5;
  const BACK_BUTTON_REM = 3.5;
  const noteBarBottomRem =
    (showMobileNav ? NAV_TILES_REM : 0) + (raisedMobileNavForBack ? BACK_BUTTON_REM : 0);

  return (
    <div
      className={cn(
        "grid gap-4",
        !showMobileNoteBar &&
          showMobileNav &&
          (raisedMobileNavForBack ? "pb-40 md:pb-0" : "pb-24 md:pb-0"),
        !showMobileNoteBar && !showMobileNav && raisedMobileNavForBack && "pb-20 md:pb-0",
        showMobileNoteBar && showMobileNav && raisedMobileNavForBack && "pb-44 md:pb-0",
        showMobileNoteBar && showMobileNav && !raisedMobileNavForBack && "pb-[7.5rem] md:pb-0",
        showMobileNoteBar && !showMobileNav && raisedMobileNavForBack && "pb-[6.5rem] md:pb-0",
        showMobileNoteBar && !showMobileNav && !raisedMobileNavForBack && "pb-12 md:pb-0",
      )}
    >      <div className="z-20 flex items-center gap-2 rounded-lg border border-border/60 bg-surface/95 px-2.5 py-1.5 backdrop-blur-md max-md:sticky max-md:top-0">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
          {progress.completed}/{progress.total} ·{" "}
          {progress.total ? Math.round((progress.completed / progress.total) * 100) : 0}%
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
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
                const assignee = getChecklistLineAssignee(line, defaultAssignee);
                return (
                  <div
                    key={line.id}
                    className={cn(
                      "flex items-stretch gap-1 rounded-lg border border-l-4 transition",
                      styles.row,
                      activeLineId === line.id && styles.rowActive,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLineId(line.id);
                        setActiveSectionId(section.id);
                      }}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.dot)} />
                          <span className="font-medium text-foreground">
                            {line.text}
                            {line.requireDocumentation ? (
                              <Paperclip
                                className="ml-1.5 inline h-3.5 w-3.5 align-text-bottom text-amber-300/90"
                                aria-label="Wymaga dokumentacji"
                              />
                            ) : null}
                          </span>
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
                      {assignee.assigneeName || line.checkedAt ? (
                        <p className="mt-1 pl-4 text-[11px] text-muted/80">
                          {assignee.assigneeName
                            ? `Odp.: ${assignee.assigneeName}${assignee.inherited ? " (checklista)" : ""}`
                            : null}
                          {assignee.assigneeName && line.checkedAt ? " · " : null}
                          {line.checkedAt ? formatDateTime(line.checkedAt) : null}
                        </p>
                      ) : null}
                    </button>
                    {line.isCustom && !readOnly ? (
                      <button
                        type="button"
                        aria-label="Usuń punkt"
                        onClick={() => void handleRemoveCustomLine(section.id, line.id)}
                        className="shrink-0 self-stretch px-2 text-muted transition hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!readOnly ? (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={customLineDrafts[section.id] ?? ""}
                  placeholder="Dodaj punkt…"
                  onChange={(event) =>
                    setCustomLineDrafts((current) => ({ ...current, [section.id]: event.target.value }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleAddCustomLine(section.id);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!(customLineDrafts[section.id] ?? "").trim()}
                  onClick={() => void handleAddCustomLine(section.id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {!readOnly ? (
        <div className="hidden md:grid">
          <Field label="Notatka do checklisty">
            <Textarea
              value={payload.note ?? ""}
              disabled={Boolean(savingLineId)}
              onChange={(event) => setPayload({ ...payload, note: event.target.value })}
              onBlur={() => void persist({ ...payload })}
            />
            {onCreateTasksFromNote ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-2"
                disabled={!(payload.note ?? "").trim()}
                onClick={() => onCreateTasksFromNote(payload.note ?? "")}
              >
                Utwórz taski z notatek
              </Button>
            ) : null}
          </Field>
        </div>
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
        defaultAssigneeId={defaultAssigneeId}
        defaultAssigneeName={defaultAssigneeName}
        onOpenChange={(open) => {
          if (!open) {
            setActiveLineId(null);
            setActiveSectionId(null);
          }
        }}
        readOnly={readOnly}
        saving={activeLineId !== null && savingLineId === activeLineId}
        onStatusChange={(status: InternalAcceptanceStatus) => {
          if (activeSectionId && activeLineId && activeEntry) {
            const blockReason = getChecklistDocumentationBlockReason(activeEntry.line, status);
            if (blockReason) {
              setError(blockReason);
              return;
            }
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
        documentationUploadContext={documentationUploadContext}
      />

      <ChecklistMobileNav
        sections={sections}
        activeSectionId={navSectionId}
        raisedForBackButton={raisedMobileNavForBack}
        onSelect={(sectionId) => {
          setNavSectionId(sectionId);
          scrollToBoardSection(boardSectionDomId("checklist-section", sectionId));
        }}
      />

      {showMobileNoteBar ? (
        <div
          className="fixed inset-x-0 z-[105] md:hidden"
          style={{ bottom: `calc(${noteBarBottomRem}rem + env(safe-area-inset-bottom))` }}
        >
          {mobileNoteOpen ? (
            <div className="border-t border-border/80 bg-surface-elevated/95 px-3 pb-2 pt-2 backdrop-blur-md">
              <button
                type="button"
                className="mb-2 flex w-full items-center justify-between text-sm font-medium text-foreground"
                onClick={() => setMobileNoteOpen(false)}
              >
                <span className="flex items-center gap-1.5">
                  <StickyNote className="h-4 w-4 text-accent" />
                  Notatka do checklisty
                </span>
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
              <Textarea
                value={payload.note ?? ""}
                disabled={Boolean(savingLineId)}
                onChange={(event) => setPayload({ ...payload, note: event.target.value })}
                onBlur={() => void persist({ ...payload })}
                rows={4}
                className="max-h-[30vh]"
              />
              {onCreateTasksFromNote ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full"
                  disabled={!(payload.note ?? "").trim()}
                  onClick={() => onCreateTasksFromNote(payload.note ?? "")}
                >
                  Utwórz taski z notatek
                </Button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMobileNoteOpen(true)}
              className="flex w-full items-center gap-2 border-t border-border/80 bg-surface-elevated/95 px-3 py-2.5 text-left text-sm backdrop-blur-md"
            >
              <StickyNote className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-muted">
                {payload.note?.trim() ? payload.note : "Notatka do checklisty"}
              </span>
              <ChevronUp className="h-4 w-4 shrink-0 text-muted" />
            </button>
          )}
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
