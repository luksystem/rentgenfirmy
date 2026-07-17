"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { UserIdentity } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import {
  ACTIVITY_ENTITY_TYPE_LABELS,
  ACTIVITY_ENTITY_TYPES,
  type ActivityLogEntry,
} from "@/lib/activity-log/types";
import type { UserProfile } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ActivityLogPanel() {
  const router = useRouter();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actorUserId, setActorUserId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const profilesById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const user of users) {
      map.set(user.id, user);
    }
    return map;
  }, [users]);

  const buildQuery = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (cursor) {
        params.set("cursor", cursor);
      }
      if (actorUserId) {
        params.set("actorUserId", actorUserId);
      }
      if (entityType) {
        params.set("entityType", entityType);
      }
      if (from) {
        params.set("from", new Date(`${from}T00:00:00`).toISOString());
      }
      if (to) {
        params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
      }
      return params.toString();
    },
    [actorUserId, entityType, from, to],
  );

  const loadPage = useCallback(
    async (mode: "replace" | "append", cursor?: string | null) => {
      if (mode === "replace") {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const response = await fetch(`/api/admin/activity-log?${buildQuery(cursor)}`, {
          credentials: "include",
        });
        const payload = (await response.json()) as {
          entries?: ActivityLogEntry[];
          nextCursor?: string | null;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Nie udało się pobrać logów.");
        }

        const nextEntries = payload.entries ?? [];
        setEntries((prev) => (mode === "append" ? [...prev, ...nextEntries] : nextEntries));
        setNextCursor(payload.nextCursor ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Nie udało się pobrać logów.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    void fetch("/api/admin/users", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { users?: UserProfile[] };
        setUsers(payload.users ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadPage("replace");
  }, [loadPage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logi aplikacji"
        description="Historia działań użytkowników — kto co dodał, zapisał lub usunął."
      />

      <div className="grid gap-3 rounded-xl border border-border/70 bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Użytkownik">
          <Select
            value={actorUserId}
            onChange={(event) => setActorUserId(event.target.value)}
          >
            <option value="">Wszyscy</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Typ">
          <Select value={entityType} onChange={(event) => setEntityType(event.target.value)}>
            <option value="">Wszystkie</option>
            {ACTIVITY_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ACTIVITY_ENTITY_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Od">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="Do">
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
      </div>

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted">Ładowanie logów…</p>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/80 px-6 py-12 text-center">
          <ScrollText className="h-8 w-8 text-muted" />
          <p className="text-sm font-medium text-foreground">Brak wpisów</p>
          <p className="max-w-md text-sm text-muted">
            Logi pojawią się po kolejnych działaniach w aplikacji (od momentu wdrożenia dziennika).
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/70 bg-surface">
          {entries.map((entry) => {
            const profile = entry.actorUserId
              ? profilesById.get(entry.actorUserId) ?? null
              : null;
            const clickable = Boolean(entry.href);
            const typeLabel =
              ACTIVITY_ENTITY_TYPE_LABELS[
                entry.entityType as keyof typeof ACTIVITY_ENTITY_TYPE_LABELS
              ] ?? entry.entityType;

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (entry.href) {
                      router.push(entry.href);
                    }
                  }}
                  className={cn(
                    "flex w-full flex-col gap-2 px-4 py-3 text-left transition sm:flex-row sm:items-center sm:gap-4",
                    clickable
                      ? "hover:bg-surface-muted/80 focus-visible:bg-surface-muted/80 focus-visible:outline-none"
                      : "cursor-default",
                  )}
                >
                  <div className="min-w-0 sm:w-48 sm:shrink-0">
                    <UserIdentity
                      profile={profile}
                      name={entry.actorName}
                      size="sm"
                      subtitle={formatDateTime(entry.createdAt)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{entry.summary}</span>
                      {entry.entityLabel ? (
                        <span className="text-muted"> — {entry.entityLabel}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{typeLabel}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={isLoadingMore}
            onClick={() => void loadPage("append", nextCursor)}
          >
            {isLoadingMore ? "Ładowanie…" : "Załaduj więcej"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
