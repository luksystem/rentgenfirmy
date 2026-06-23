"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { PublicKanbanHeader } from "@/components/process/public-kanban-header";
import { PublicKanbanBoard } from "@/components/process/public-kanban-board";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
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

export function PublicKanbanEmbedded({
  token,
  defaultAuthorName = "",
  dashboardToken,
  onBack,
}: {
  token: string;
  defaultAuthorName?: string;
  /** Token publicznego dashboardu — umożliwia otwarcie tablicy bez ponownego logowania. */
  dashboardToken?: string;
  onBack?: () => void;
}) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [context, setContext] = useState<KanbanPublicContext>(DEFAULT_CONTEXT);
  const [access, setAccess] = useState<KanbanPublicAccessInfo>(DEFAULT_ACCESS);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [legacyNameDraft, setLegacyNameDraft] = useState(defaultAuthorName);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [started, setStarted] = useState(Boolean(defaultAuthorName.trim()));
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
    } else if (defaultAuthorName.trim() && !payload.access?.authRequired) {
      setAuthorName(defaultAuthorName.trim());
      setStarted(true);
    }
  }, [defaultAuthorName]);

  const refresh = useCallback(async () => {
    const query = dashboardToken
      ? `?dashboardToken=${encodeURIComponent(dashboardToken)}`
      : "";
    const response = await fetch(`/api/kanban/${encodeURIComponent(token)}${query}`, {
      credentials: "include",
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Nie znaleziono tablicy.");
    }
    const payload = (await response.json()) as KanbanLoadPayload;
    applyPayload(payload);
  }, [applyPayload, dashboardToken, token]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const boardStats = useMemo(
    () => (board ? computeKanbanBoardStats(board) : null),
    [board],
  );

  useEffect(() => {
    setReady(false);
    setError(null);
    setBoard(null);
    setStarted(Boolean(defaultAuthorName.trim()));
    setAuthorName(defaultAuthorName);
    setLegacyNameDraft(defaultAuthorName);

    void (async () => {
      try {
        await refreshRef.current();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy.");
      } finally {
        setReady(true);
      }
    })();
  }, [defaultAuthorName, dashboardToken, token]);

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
    return <p className="py-8 text-sm text-muted">Ładowanie tablicy…</p>;
  }

  if (error || (!board && !access.authRequired && !access.legacyNameRequired)) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-surface p-4 text-sm text-rose-300">
        {error ?? "Tablica niedostępna."}
        {onBack ? (
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do procesu
          </Button>
        ) : null}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="grid min-w-0 gap-4">
        {onBack ? (
          <Button type="button" size="sm" variant="outline" className="w-fit" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do procesu
          </Button>
        ) : null}
        <PublicKanbanHeader context={context} />

        {access.authRequired ? (
          <div className="rounded-2xl border border-border/70 bg-surface-elevated/80 p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Chroniona tablica</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {dashboardToken
                    ? "Ta tablica wymaga osobnego hasła. Zaloguj się do niej poniżej lub wróć do procesu."
                    : "Podaj dane dostępu przekazane przy wdrożeniu."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {access.usernameRequired ? (
                <Field label="Login">
                  <Input
                    value={loginUsername}
                    placeholder="Login od instalatora"
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
          <div className="rounded-2xl border border-border/70 bg-surface-elevated/80 p-4 shadow-soft">
            <p className="text-sm leading-relaxed text-muted">
              Podaj imię lub nazwę firmy, aby dodawać zgłoszenia i komentować.
            </p>
            <div className="mt-4 grid gap-3">
              <Field label="Twoje imię / firma">
                <Input
                  value={legacyNameDraft}
                  placeholder="np. Jan Kowalski"
                  onChange={(event) => setLegacyNameDraft(event.target.value)}
                />
              </Field>
              <Button
                type="button"
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
    );
  }

  if (!board) {
    return <p className="py-8 text-sm text-muted">Ładowanie tablicy…</p>;
  }

  return (
    <div className="grid min-w-0 max-w-full gap-3">
      {onBack ? (
        <Button type="button" size="sm" variant="outline" className="w-fit" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do procesu
        </Button>
      ) : null}
      <PublicKanbanHeader context={context} stats={boardStats} compact />
      <PublicKanbanBoard
        token={token}
        board={board}
        authorName={authorName}
        assigneeOptions={context.assigneeOptions}
        onRefresh={refresh}
      />
    </div>
  );
}
