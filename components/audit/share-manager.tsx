"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Link2,
  Link2Off,
  RefreshCw,
  Loader2,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REPORT_SECTION_KEYS } from "@/lib/audit/types";
import type { ReportShare, SectionVisibility, ShareAccessLogEntry, ReportSectionKey } from "@/lib/audit/types";

const SECTION_LABELS: Record<ReportSectionKey, string> = {
  overall_score: "Wynik ogólny",
  domains: "Domeny",
  criteria: "Kryteria wpływu",
  recommendations: "Rekomendacje",
  roadmap: "Roadmapa",
  photos: "Zdjęcia",
  technical: "Dane techniczne",
  client_data: "Dane klienta",
};

const EVENT_LABELS: Record<string, string> = {
  view: "Wyświetlenie",
  password_ok: "Poprawne hasło",
  password_fail: "Błędne hasło",
};

export function ShareManager({ sessionId }: { sessionId: string }) {
  const [share, setShare] = useState<ReportShare | null>(null);
  const [log, setLog] = useState<ShareAccessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [sections, setSections] = useState<SectionVisibility | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/${sessionId}/share`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setShare(data.share);
      setLog(data.accessLog ?? []);
      if (data.share) {
        setExpiresAt(data.share.expiresAt ? data.share.expiresAt.slice(0, 10) : "");
        setMaxViews(data.share.maxViews ? String(data.share.maxViews) : "");
        setSections(data.share.visibleSections);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const publicUrl = share ? `${window.location.origin}/public/report/${share.token}` : "";

  const save = async (extra?: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        expiresAt: expiresAt || null,
        maxViews: maxViews ? Number(maxViews) : null,
        visibleSections: sections ?? undefined,
        ...extra,
      };
      if (password) body.password = password;
      const res = await fetch(`/api/audit/${sessionId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setPassword("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/audit/${sessionId}/share/regenerate`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  };

  const disableLink = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/audit/${sessionId}/share`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setShare(null);
      setSections(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleSection = (key: ReportSectionKey) => {
    setSections((prev) =>
      prev ? { ...prev, [key]: !prev[key] } : prev,
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/audyt/${sessionId}/raport`}>
          <ArrowLeft className="h-4 w-4" /> Raport
        </Link>
      </Button>

      <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-foreground">
        <Shield className="h-5 w-5 text-accent" /> Udostępnianie raportu
      </h1>

      {error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {!share ? (
        <Card className="mt-4">
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">
              Raport nie jest udostępniony. Ustaw hasło, aby utworzyć bezpieczny link publiczny.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Hasło dostępu (min. 4 znaki)</span>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="np. Budynek2026"
              />
            </label>
            <Button onClick={() => save({ isActive: true })} disabled={busy || password.length < 4}>
              <Link2 className="h-4 w-4" /> Utwórz link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-4">
          {/* status + link */}
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    share.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  {share.isActive ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                  {share.isActive ? "Aktywny" : "Nieaktywny"}
                </span>
                <span className="text-xs text-muted">
                  Wyświetleń: {share.viewCount}
                  {share.maxViews ? ` / ${share.maxViews}` : ""}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={publicUrl}
                  className="w-full truncate rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs"
                />
                <Button variant="secondary" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={regenerate} disabled={busy}>
                  <RefreshCw className="h-4 w-4" /> Nowy token
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save({ isActive: !share.isActive })}
                  disabled={busy}
                >
                  {share.isActive ? "Wyłącz link" : "Włącz link"}
                </Button>
                <Button variant="destructive" size="sm" onClick={disableLink} disabled={busy}>
                  <Link2Off className="h-4 w-4" /> Usuń link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* konfiguracja */}
          <Card>
            <CardContent className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Ustawienia</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Zmień hasło</span>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="(bez zmian)"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Wygasa</span>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Limit wyświetleń</span>
                  <input
                    type="number"
                    min={1}
                    value={maxViews}
                    onChange={(e) => setMaxViews(e.target.value)}
                    placeholder="bez limitu"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted">Widoczne sekcje w raporcie publicznym</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {REPORT_SECTION_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={sections?.[key] ?? false}
                        onChange={() => toggleSection(key)}
                      />
                      {SECTION_LABELS[key]}
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={() => save()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Zapisz ustawienia
              </Button>
            </CardContent>
          </Card>

          {/* historia dostępu */}
          <Card>
            <CardContent>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Historia wejść</h2>
              {log.length === 0 ? (
                <p className="text-xs text-muted">Brak zarejestrowanych wejść.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-muted">
                      <tr>
                        <th className="py-1">Data</th>
                        <th className="py-1">Zdarzenie</th>
                        <th className="py-1">IP (hash)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.map((e) => (
                        <tr key={e.id} className="border-t border-border">
                          <td className="py-1">{new Date(e.accessedAt).toLocaleString("pl-PL")}</td>
                          <td className="py-1">{EVENT_LABELS[e.event] ?? e.event}</td>
                          <td className="py-1 font-mono text-muted">
                            {e.ipHash ? e.ipHash.slice(0, 10) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
