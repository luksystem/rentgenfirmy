"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/components/audit/report/report-view";
import type { ReportViewModel } from "@/lib/audit/types";

type State =
  | { kind: "loading" }
  | { kind: "password"; error?: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "ok"; model: ReportViewModel };

const UNAVAILABLE_TEXT: Record<string, string> = {
  inactive: "Ten link został wyłączony przez właściciela.",
  expired: "Ważność tego linku wygasła.",
  view_limit: "Osiągnięto limit wyświetleń tego raportu.",
  not_ready: "Raport nie jest jeszcze gotowy.",
  not_found: "Nie znaleziono raportu.",
};

export function PublicReportClient({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReport = useCallback(async () => {
    const res = await fetch(`/api/public/report/${token}`);
    if (res.status === 404) {
      setState({ kind: "unavailable", reason: "not_found" });
      return;
    }
    const data = await res.json();
    if (data.status === "ok") setState({ kind: "ok", model: data.report as ReportViewModel });
    else if (data.status === "password") setState({ kind: "password" });
    else if (data.status === "unavailable") setState({ kind: "unavailable", reason: data.reason });
    else setState({ kind: "unavailable", reason: "not_found" });
  }, [token]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/report/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword("");
        await fetchReport();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setState({ kind: "password", error: "Zbyt wiele błędnych prób. Spróbuj ponownie później." });
      } else {
        setState({ kind: "password", error: data.error ?? "Nieprawidłowe hasło." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardContent className="text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
            <p className="mt-3 text-foreground">
              {UNAVAILABLE_TEXT[state.reason] ?? "Raport jest niedostępny."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.kind === "password") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent>
            <div className="text-center">
              <Lock className="mx-auto h-8 w-8 text-accent" />
              <h1 className="mt-2 text-lg font-semibold text-foreground">Raport chroniony hasłem</h1>
              <p className="mt-1 text-sm text-muted">Wprowadź hasło, aby wyświetlić raport SRI.</p>
            </div>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="Hasło"
              />
              {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
              <Button type="submit" className="w-full" disabled={submitting || !password}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Otwórz raport
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ReportView model={state.model} />;
}
