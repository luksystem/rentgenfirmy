"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { PublicKanbanHeader } from "@/components/process/public-kanban-header";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicKanbanBoard } from "@/components/process/public-kanban-board";
import { computeKanbanBoardStats } from "@/lib/process/kanban-task-meta";
import type {
  KanbanBoard,
  KanbanPublicAccessInfo,
  KanbanPublicContext,
} from "@/lib/process/kanban-types";

const DEFAULT_CONTEXT: KanbanPublicContext = {
  projectId: null,
  projectName: "Projekt",
  projectType: null,
  clientName: null,
  assigneeOptions: [],
};

const DEFAULT_ACCESS: KanbanPublicAccessInfo = {
  authRequired: false,
  legacyNameRequired: true,
  usernameRequired: false,
  authorDisplayName: "Klient",
};

type KanbanLoadPayload = {
  board?: KanbanBoard;
  context?: KanbanPublicContext;
  access?: KanbanPublicAccessInfo;
  authorName?: string;
  authRequired?: boolean;
  error?: string;
};

export default function PublicKanbanPage() {
  const params = useParams();
  const token = String(params.token);
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [context, setContext] = useState<KanbanPublicContext>(DEFAULT_CONTEXT);
  const [access, setAccess] = useState<KanbanPublicAccessInfo>(DEFAULT_ACCESS);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [legacyNameDraft, setLegacyNameDraft] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);

  const applyPayload = useCallback((payload: KanbanLoadPayload) => {
    if (payload.context) {
      setContext(payload.context);
    }
    if (payload.access) {
      setAccess(payload.access);
    }

    if (payload.authRequired) {
      setBoard(null);
      setStarted(false);
      return;
    }

    if (payload.board) {
      setBoard(payload.board);
    }

    if (payload.authorName) {
      setAuthorName(payload.authorName);
      setStarted(true);
    }
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/kanban/${encodeURIComponent(token)}`, {
      credentials: "include",
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Nie znaleziono tablicy.");
    }
    const payload = (await response.json()) as KanbanLoadPayload;
    applyPayload(payload);
  }, [applyPayload, token]);

  const boardStats = useMemo(
    () => (board ? computeKanbanBoardStats(board) : null),
    [board],
  );

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy.");
      } finally {
        setReady(true);
      }
    })();
  }, [refresh]);

  async function handleLogin() {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const response = await fetch(`/api/kanban/${encodeURIComponent(token)}/auth`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: loginPassword,
          username: access.usernameRequired ? loginUsername : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się zalogować.");
      }

      const payload = (await response.json()) as { authorName?: string };
      if (payload.authorName) {
        setAuthorName(payload.authorName);
      }
      setStarted(true);
      await refresh();
    } catch (loginFailure) {
      setLoginError(loginFailure instanceof Error ? loginFailure.message : "Błąd logowania.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background via-background to-accent/5 p-6">
        <p className="text-sm text-muted">Ładowanie tablicy…</p>
      </div>
    );
  }

  if (error || (!board && !access.authRequired && !access.legacyNameRequired)) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-background via-background to-accent/5 p-4 sm:p-6">
        <Card className="mx-auto max-w-md border-rose-500/20">
          <CardContent className="py-8 text-sm text-rose-300">{error ?? "Tablica niedostępna."}</CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col bg-gradient-to-b from-background via-background to-accent/5 px-4 py-6 sm:px-6">
        <div className="mx-auto grid w-full max-w-md flex-1 content-center gap-5">
          <PublicKanbanHeader context={context} />

          {access.authRequired ? (
            <div className="rounded-2xl border border-border/70 bg-surface-elevated/80 p-5 shadow-soft backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">Chroniona tablica</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Podaj dane dostępu przekazane przy wdrożeniu, aby dodawać zgłoszenia i komentować.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {access.usernameRequired ? (
                  <Field label="Login">
                    <Input
                      value={loginUsername}
                      placeholder="Login od instalatora"
                      className="h-11"
                      autoComplete="username"
                      onChange={(event) => setLoginUsername(event.target.value)}
                    />
                  </Field>
                ) : null}
                <Field label="Hasło dostępu">
                  <Input
                    type="password"
                    value={loginPassword}
                    placeholder="Hasło do tablicy"
                    className="h-11"
                    autoComplete="current-password"
                    onChange={(event) => setLoginPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void handleLogin();
                      }
                    }}
                  />
                </Field>
                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={
                    isLoggingIn ||
                    !loginPassword.trim() ||
                    (access.usernameRequired && !loginUsername.trim())
                  }
                  onClick={() => void handleLogin()}
                >
                  {isLoggingIn ? "Logowanie…" : "Wejdź na tablicę"}
                </Button>
                {loginError ? <p className="text-sm text-rose-400">{loginError}</p> : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-surface-elevated/80 p-5 shadow-soft backdrop-blur-sm">
              <p className="text-sm leading-relaxed text-muted">
                Podaj imię lub nazwę firmy, aby dodawać zgłoszenia, komentować i przenosić je między etapami.
              </p>
              <div className="mt-4 grid gap-3">
                <Field label="Twoje imię / firma">
                  <Input
                    value={legacyNameDraft}
                    placeholder="np. Jan Kowalski"
                    className="h-11"
                    onChange={(event) => setLegacyNameDraft(event.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={!legacyNameDraft.trim()}
                  onClick={() => {
                    setAuthorName(legacyNameDraft.trim());
                    setStarted(true);
                  }}
                >
                  Wejdź na tablicę
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background via-background to-accent/5 p-6">
        <p className="text-sm text-muted">Ładowanie tablicy…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-background via-background to-accent/5">
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 sm:px-6 sm:py-6">
        <PublicKanbanHeader context={context} stats={boardStats} compact />
        <PublicKanbanBoard
          token={token}
          board={board}
          authorName={authorName}
          assigneeOptions={context.assigneeOptions}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
