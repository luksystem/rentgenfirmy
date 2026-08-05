"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive } from "lucide-react";
import { CollapsibleSection } from "@/components/dashboard/agreement-collapsible-shell";
import { Input } from "@/components/ui/input";
import {
  groupAcHistoryItems,
  stripAcHtml,
  type ProjectAcHistoryGroup,
  type ProjectAcHistoryItem,
  type ProjectAcLink,
} from "@/lib/dashboard/ac-history-types";
import { fetchProjectAcHistory, fetchProjectAcLink } from "@/lib/supabase/project-ac-history-repository";
import { formatDate, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 40;

function groupMatchesQuery(group: ProjectAcHistoryGroup, query: string) {
  if (!query) return true;
  const haystack = [
    group.task?.title,
    group.task?.body,
    ...group.subtasks.map((s) => s.title),
    ...group.comments.map((c) => c.body),
    ...group.comments.map((c) => c.authorName),
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
  return haystack.includes(query);
}

function groupSummary(group: ProjectAcHistoryGroup) {
  const parts: string[] = [];
  if (group.subtasks.length) parts.push(`${group.subtasks.length} podzadań`);
  if (group.comments.length) parts.push(`${group.comments.length} komentarzy`);
  return parts.join(" · ") || "Brak podzadań i komentarzy";
}

function groupMeta(group: ProjectAcHistoryGroup) {
  const item = group.task ?? group.comments[0] ?? group.subtasks[0];
  if (!item?.acCreatedOn) return group.task ? group.task.authorName : "";
  const author = group.task?.authorName;
  return [formatDate(item.acCreatedOn.slice(0, 10)), author].filter(Boolean).join(" · ");
}

function renderBody(text: string) {
  const plain = stripAcHtml(text);
  if (!plain) return null;
  return <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{plain}</p>;
}

function renderAttachments(names: string[]) {
  if (!names.length) return null;
  return (
    <p className="mt-1 text-xs text-muted">
      Załączniki (archiwalne, plik nie jest dostępny online): {names.join(", ")}
    </p>
  );
}

function renderComment(comment: ProjectAcHistoryItem) {
  return (
    <div key={comment.id} className="rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2">
      <p className="text-xs text-muted">
        {comment.authorName || "Nieznany autor"}
        {comment.acCreatedOn ? ` · ${formatDateTime(comment.acCreatedOn)}` : ""}
      </p>
      {renderBody(comment.body)}
      {renderAttachments(comment.attachmentNames)}
    </div>
  );
}

function renderGroup(group: ProjectAcHistoryGroup, index: number) {
  const title = group.task ? group.task.title || "(zadanie bez tytułu)" : "Wpisy bez powiązanego zadania";
  const key = group.task?.id ?? `orphan-${index}`;

  const badge = group.task ? (
    <span
      className={
        group.task.isCompleted
          ? "shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200"
          : "shrink-0 rounded-full border border-border/70 bg-surface-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted"
      }
    >
      {group.task.isCompleted ? "Zrobione" : "Otwarte"}
    </span>
  ) : null;

  return (
    <CollapsibleSection
      key={key}
      title={title}
      badge={badge}
      meta={groupMeta(group)}
      summary={groupSummary(group)}
      defaultExpanded={false}
    >
      {group.task ? (
        <div>
          {renderBody(group.task.body)}
          {renderAttachments(group.task.attachmentNames)}
        </div>
      ) : null}

      {group.subtasks.length ? (
        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Podzadania</p>
          {group.subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-start gap-2 text-sm">
              <span
                className={
                  subtask.isCompleted ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border"
                }
                aria-hidden
              />
              <span className={subtask.isCompleted ? "text-muted line-through" : "text-foreground/90"}>
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {group.comments.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Komentarze</p>
          {group.comments.map(renderComment)}
        </div>
      ) : null}
    </CollapsibleSection>
  );
}

export function ProjectAcHistoryPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ProjectAcHistoryItem[]>([]);
  const [links, setLinks] = useState<ProjectAcLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchProjectAcHistory(projectId), fetchProjectAcLink(projectId)])
      .then(([historyItems, linkRows]) => {
        if (cancelled) return;
        setItems(historyItems);
        setLinks(linkRows);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać historii.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const groups = useMemo(() => groupAcHistoryItems(items), [items]);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return groups.filter((group) => groupMatchesQuery(group, normalizedQuery));
  }, [groups, query]);

  const visibleGroups = filteredGroups.slice(0, visibleCount);

  const counts = useMemo(
    () => ({
      tasks: items.filter((item) => item.kind === "task").length,
      subtasks: items.filter((item) => item.kind === "subtask").length,
      comments: items.filter((item) => item.kind === "comment").length,
    }),
    [items],
  );

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie historii z ActiveCollab…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
        Brak zaimportowanej historii z ActiveCollab dla tego projektu.
      </p>
    );
  }

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-surface-muted/15 p-4">
        <Archive className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
        <div className="min-w-0">
          <p className="text-sm text-foreground">
            Archiwum historyczne z ActiveCollab (dawny system zarządzania projektami) — tylko do
            odczytu, widoczne wyłącznie dla zespołu.
          </p>
          <p className="mt-1 text-xs text-muted">
            {counts.tasks} zadań · {counts.subtasks} podzadań · {counts.comments} komentarzy
            {links[0]?.importedAt ? ` · zaimportowano ${formatDate(links[0].importedAt.slice(0, 10))}` : ""}
          </p>
        </div>
      </div>

      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setVisibleCount(PAGE_SIZE);
        }}
        placeholder="Szukaj w zadaniach i komentarzach…"
      />

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-muted">Brak wyników dla tego wyszukiwania.</p>
      ) : (
        <div className="grid gap-2">{visibleGroups.map((group, index) => renderGroup(group, index))}</div>
      )}

      {filteredGroups.length > visibleGroups.length ? (
        <button
          type="button"
          onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          className="justify-self-start rounded-lg border border-border/70 bg-surface-muted/15 px-4 py-2 text-sm text-foreground/90 hover:bg-surface-muted/30"
        >
          Pokaż więcej ({filteredGroups.length - visibleGroups.length} pozostało)
        </button>
      ) : null}
    </div>
  );
}
