"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Cloud,
  CloudOff,
  Loader2,
  Paperclip,
  PlayCircle,
  Save,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuditQuestion, AuditSession, MethodologyOption } from "@/lib/audit/types";
import { BUILDING_TYPE_PL, CLIMATE_ZONE_PL } from "@/lib/sri/labels";
import { useAutosave } from "./use-autosave";

type AnswerMeta = { verificationStatus: string | null; note: string | null };

type DetailResponse = {
  session: AuditSession;
  methodologies: MethodologyOption[];
  buildingTypes: string[];
  climateZones: string[];
  questions: AuditQuestion[];
  answers: Record<string, number>;
  answerMeta: Record<string, AnswerMeta>;
  hasResults: boolean;
};

const VERIFICATION = [
  { id: "confirmed", label: "Potwierdzona", cls: "text-emerald-700 border-emerald-300 bg-emerald-50" },
  { id: "uncertain", label: "Niepewna", cls: "text-amber-700 border-amber-300 bg-amber-50" },
  { id: "to_verify", label: "Do weryfikacji", cls: "text-blue-700 border-blue-300 bg-blue-50" },
  { id: "no_data", label: "Brak danych", cls: "text-gray-600 border-gray-300 bg-gray-50" },
] as const;

function SaveIndicator({ status }: { status: string }) {
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Zapisywanie…
      </span>
    );
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <Cloud className="h-3.5 w-3.5" /> Zapisano
      </span>
    );
  if (status === "offline")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
        <CloudOff className="h-3.5 w-3.5" /> Offline — ponowię
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-600">
        <CloudOff className="h-3.5 w-3.5" /> Błąd zapisu
      </span>
    );
  return null;
}

function SurveyQuestion({
  q,
  level,
  meta,
  onLevel,
  onVerification,
  onNote,
  onEvidence,
}: {
  q: AuditQuestion;
  level: number | undefined;
  meta: AnswerMeta | undefined;
  onLevel: (v: number) => void;
  onVerification: (v: string) => void;
  onNote: (v: string) => void;
  onEvidence: (f: File) => void;
}) {
  const [showTech, setShowTech] = useState(false);
  const answered = level !== undefined;

  return (
    <Card className={cn("break-inside-avoid", answered && "border-accent/40")}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">{q.namePl}</p>
            <p className="text-xs text-muted">{q.code}</p>
          </div>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
            opcjonalne
          </span>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Poziom funkcjonalności</label>
          <select
            value={level ?? ""}
            onChange={(e) => onLevel(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Wybierz poziom…
            </option>
            {q.levels.map((l) => (
              <option key={l.level} value={l.level}>
                Poziom {l.level}
                {l.descriptionEn ? ` — ${l.descriptionEn}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {VERIFICATION.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onVerification(v.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition",
                meta?.verificationStatus === v.id
                  ? v.cls
                  : "border-border text-muted hover:bg-surface-muted",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <textarea
          value={meta?.note ?? ""}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Notatka audytora (opcjonalna)…"
          rows={2}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-accent">
            <Paperclip className="h-3.5 w-3.5" /> Dodaj dowód
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                for (const f of files) {
                  onEvidence(f);
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            Wyjaśnienie techniczne
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showTech && "rotate-180")} />
          </button>
        </div>

        {showTech ? (
          <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted">
            <p className="mb-1 font-medium text-foreground">Poziomy funkcjonalności:</p>
            <ul className="space-y-0.5">
              {q.levels.map((l) => (
                <li key={l.level}>
                  <strong>Poziom {l.level}:</strong> {l.descriptionEn || "—"}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              <strong>Dlaczego ważne:</strong> wyższy poziom automatyzacji w domenie{" "}
              {q.domainNamePl} podnosi wynik SRI oraz komfort, efektywność energetyczną i
              elastyczność.
            </p>
            <p className="mt-1">
              <strong>Dowód:</strong> zdjęcie urządzenia / sterownika lub zrzut z systemu potwierdzający
              wybrany poziom.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-4 py-8">
      <div className="h-8 w-1/2 rounded bg-surface-muted" />
      <div className="h-3 rounded bg-surface-muted" />
      <div className="h-40 rounded-2xl bg-surface-muted" />
      <div className="h-40 rounded-2xl bg-surface-muted" />
    </div>
  );
}

export function AuditSurvey({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [meta, setMeta] = useState<Record<string, AnswerMeta>>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // formularz metodologii + meta raportu
  const [methodology, setMethodology] = useState("eu-sri-v4.5");
  const [buildingType, setBuildingType] = useState("non_residential");
  const [climateZone, setClimateZone] = useState("north_europe");
  const [address, setAddress] = useState("");
  const [auditor, setAuditor] = useState("");
  const [auditedAt, setAuditedAt] = useState("");

  const answersRef = useRef(answers);
  const metaRef = useRef(meta);
  const dirtyRef = useRef<Set<string>>(new Set());
  answersRef.current = answers;
  metaRef.current = meta;

  const doSave = useCallback(async () => {
    const codes = Array.from(dirtyRef.current).filter((c) => answersRef.current[c] !== undefined);
    if (codes.length === 0) {
      dirtyRef.current.clear();
      return;
    }
    const payloadAnswers: Record<string, number> = {};
    const payloadMeta: Record<string, AnswerMeta> = {};
    for (const c of codes) {
      payloadAnswers[c] = answersRef.current[c];
      if (metaRef.current[c]) payloadMeta[c] = metaRef.current[c];
    }
    const res = await fetch(`/api/audit/${id}/answers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payloadAnswers, meta: payloadMeta }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Błąd zapisu");
    }
    dirtyRef.current.clear();
  }, [id]);

  const { status: saveStatus, schedule } = useAutosave(doSave);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setDetail(data);
      setAnswers(data.answers ?? {});
      setMeta(data.answerMeta ?? {});
      setMethodology(data.session.methodologyVersionId ?? "eu-sri-v4.5");
      setBuildingType(data.session.buildingType ?? "non_residential");
      setClimateZone(data.session.climateZone ?? "north_europe");
      setAddress(data.session.buildingAddress ?? "");
      setAuditor(data.session.auditorName ?? "");
      setAuditedAt(data.session.auditedAt ? data.session.auditedAt.slice(0, 10) : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setLevel = (code: string, v: number) => {
    setAnswers((p) => ({ ...p, [code]: v }));
    dirtyRef.current.add(code);
    schedule();
  };
  const setVerification = (code: string, v: string) => {
    setMeta((p) => ({ ...p, [code]: { verificationStatus: v, note: p[code]?.note ?? null } }));
    dirtyRef.current.add(code);
    schedule();
  };
  const setNote = (code: string, v: string) => {
    setMeta((p) => ({
      ...p,
      [code]: { verificationStatus: p[code]?.verificationStatus ?? null, note: v },
    }));
    dirtyRef.current.add(code);
    schedule();
  };

  const uploadEvidence = async (code: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("questionCode", code);
    const res = await fetch(`/api/audit/${id}/evidence`, { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Błąd uploadu dowodu");
    }
  };

  const saveMethodology = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/audit/${id}/methodology`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodologyVersionId: methodology, buildingType, climateZone }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetch(`/api/audit/${id}/meta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingAddress: address || null,
          auditorName: auditor || null,
          auditedAt: auditedAt || null,
        }),
      });
      await load();
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    }
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      await doSave();
      const res = await fetch(`/api/audit/${id}/run`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push(`/audyt/${id}/raport`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
      setRunning(false);
    }
  };

  const domains = useMemo(() => {
    if (!detail) return [];
    const order: string[] = [];
    const byDomain: Record<string, AuditQuestion[]> = {};
    for (const q of detail.questions) {
      if (!byDomain[q.domainNamePl]) {
        byDomain[q.domainNamePl] = [];
        order.push(q.domainNamePl);
      }
      byDomain[q.domainNamePl].push(q);
    }
    return order.map((name) => ({ name, questions: byDomain[name] }));
  }, [detail]);

  const totalQuestions = detail?.questions.length ?? 0;
  const answeredCount = useMemo(
    () => (detail ? detail.questions.filter((q) => answers[q.code] !== undefined).length : 0),
    [detail, answers],
  );
  const percent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (loading) return <Skeleton />;
  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-rose-600">{error ?? "Nie znaleziono audytu."}</p>
        <Link href="/audyt" className="mt-4 inline-block text-accent underline">
          ← Lista audytów
        </Link>
      </div>
    );
  }

  const needsMethodology = detail.session.status === "draft" || detail.questions.length === 0;
  // step 0 = metodologia, 1..N = domeny, N+1 = podsumowanie
  const totalSteps = domains.length + 2;
  const currentStep = Math.min(step, totalSteps - 1);
  const isMethodologyStep = currentStep === 0;
  const isSummaryStep = currentStep === totalSteps - 1;
  const currentDomain = !isMethodologyStep && !isSummaryStep ? domains[currentStep - 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/audyt">
            <ArrowLeft className="h-4 w-4" /> Audyty
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          {detail.session.status === "completed" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/audyt/${id}/raport`}>Zobacz raport</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <h1 className="text-xl font-bold text-foreground">{detail.session.name}</h1>

      {/* pasek postępu */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Ukończono {percent}%</span>
          <span>
            {answeredCount}/{totalQuestions} pytań
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* nawigacja po krokach (domeny) */}
      {!needsMethodology ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStep(0)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              isMethodologyStep ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted",
            )}
          >
            Ustawienia
          </button>
          {domains.map((d, i) => (
            <button
              key={d.name}
              type="button"
              onClick={() => setStep(i + 1)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs",
                currentStep === i + 1
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-muted text-muted",
              )}
            >
              {d.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setStep(totalSteps - 1)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              isSummaryStep ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted",
            )}
          >
            Podsumowanie
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="mt-5 space-y-4">
        {/* KROK: metodologia + meta */}
        {isMethodologyStep || needsMethodology ? (
          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-semibold text-foreground">Metodologia i dane budynku</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Metodologia</span>
                  <select
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  >
                    {detail.methodologies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Typ budynku</span>
                  <select
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  >
                    {detail.buildingTypes.map((b) => (
                      <option key={b} value={b}>
                        {BUILDING_TYPE_PL[b] ?? b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Strefa klimatyczna</span>
                  <select
                    value={climateZone}
                    onChange={(e) => setClimateZone(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  >
                    {detail.climateZones.map((c) => (
                      <option key={c} value={c}>
                        {CLIMATE_ZONE_PL[c] ?? c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Adres budynku</span>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Audytor</span>
                  <input
                    value={auditor}
                    onChange={(e) => setAuditor(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Data audytu</span>
                  <input
                    type="date"
                    value={auditedAt}
                    onChange={(e) => setAuditedAt(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <Button onClick={saveMethodology}>
                <Save className="h-4 w-4" /> Zapisz i przejdź do pytań
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* KROK: domena */}
        {currentDomain ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{currentDomain.name}</h2>
            {currentDomain.questions.map((q) => (
              <SurveyQuestion
                key={q.code}
                q={q}
                level={answers[q.code]}
                meta={meta[q.code]}
                onLevel={(v) => setLevel(q.code, v)}
                onVerification={(v) => setVerification(q.code, v)}
                onNote={(v) => setNote(q.code, v)}
                onEvidence={(f) => void uploadEvidence(q.code, f)}
              />
            ))}
          </div>
        ) : null}

        {/* KROK: podsumowanie */}
        {isSummaryStep && !needsMethodology ? (
          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-semibold text-foreground">Podsumowanie i obliczenia</h2>
              <p className="text-sm text-muted">
                Odpowiedziano na {answeredCount} z {totalQuestions} pytań. Uruchom silnik SRI, aby
                obliczyć wynik, rekomendacje i roadmapę, a następnie wygenerować raport.
              </p>
              <Button onClick={run} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Obliczanie…
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" /> Uruchom obliczenia i otwórz raport
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* nawigacja dół */}
      {!needsMethodology ? (
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="h-4 w-4" /> Wstecz
          </Button>
          <Link href="/audyt" className="text-xs text-muted underline">
            Zapisz i dokończ później
          </Link>
          <Button
            variant="outline"
            size="sm"
            disabled={isSummaryStep}
            onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
          >
            Dalej <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
