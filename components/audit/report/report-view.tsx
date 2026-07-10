"use client";

import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  ChevronDown,
  Download,
  Printer,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  CalendarDays,
  User,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReportViewModel } from "@/lib/audit/types";
import { VERIFICATION_STATUS_PL } from "@/lib/sri/labels";
import { useCountUp } from "./use-count-up";
import { usePdfExport } from "./use-pdf-export";

// Model wspólny dla właściciela / przykładu / publicznego (sekcje mogą być pominięte).
type ReportModel = Partial<ReportViewModel> & { meta: ReportViewModel["meta"] };

const CURRENT_COLOR = "#2563eb";
const POTENTIAL_COLOR = "#10b981";

const CLASS_COLORS: Record<number, string> = {
  1: "#16a34a", // A
  2: "#65a30d", // B
  3: "#a3a30d", // C
  4: "#d97706", // D
  5: "#ea580c", // E
  6: "#dc2626", // F
  7: "#991b1b", // G
};

function classColor(n: number) {
  return CLASS_COLORS[n] ?? "#6b7280";
}

function Section({
  id,
  title,
  subtitle,
  icon,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="break-inside-avoid">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function ScoreGauge({
  current,
  potential,
  classLabel,
  classNumber,
}: {
  current: number;
  potential: number;
  classLabel: string;
  classNumber: number;
}) {
  const animated = useCountUp(current, 1000, 1);
  const color = classColor(classNumber);
  const data = [{ name: "SRI", value: current, fill: color }];

  return (
    <div className="relative flex flex-col items-center">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={220}
            endAngle={-40}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={12} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-4xl font-bold text-foreground tabular-nums">
          {animated.toFixed(1)}%
        </span>
        <span
          className="mt-1 rounded-full px-3 py-0.5 text-sm font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          Klasa {classLabel}
        </span>
        <span className="mt-2 text-xs text-muted">
          Potencjał po modernizacji: <strong className="text-emerald-600">{potential.toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground print:hidden"
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("px-4 pb-4", !open && "hidden print:block")}>{children}</div>
    </div>
  );
}

export function ReportView({
  model,
  showToolbar = true,
}: {
  model: ReportModel;
  showToolbar?: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const { exportPdf, exporting } = usePdfExport(
    `raport-sri-${model.meta.buildingName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`,
  );

  const domainData = useMemo(
    () =>
      (model.domains ?? []).map((d) => ({
        domain: d.namePl,
        Obecnie: Math.round(d.current),
        "Po modernizacji": Math.round(d.potential),
      })),
    [model.domains],
  );

  const criteriaData = useMemo(
    () =>
      (model.criteria ?? []).map((c) => ({
        name: c.namePl,
        Obecnie: Math.round(c.current),
        "Po modernizacji": Math.round(c.potential),
      })),
    [model.criteria],
  );

  const meta = model.meta;
  const score = model.score;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {showToolbar ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <p className="text-sm text-muted">Raport SRI</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Drukuj
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={exporting}
              onClick={() => exportPdf(printRef.current)}
            >
              <Download className="h-4 w-4" /> {exporting ? "Generowanie…" : "Pobierz PDF"}
            </Button>
          </div>
        </div>
      ) : null}

      <div ref={printRef} className="space-y-8 bg-surface">
        {/* 1. Strona tytułowa */}
        <Card className="break-inside-avoid">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Raport oceny gotowości inteligentnej (SRI)
              </p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">{meta.buildingName}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                {meta.address ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {meta.address}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />{" "}
                  {meta.auditedAt ? new Date(meta.auditedAt).toLocaleDateString("pl-PL") : "—"}
                </span>
                {meta.auditor ? (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {meta.auditor}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> {meta.methodologyVersionId}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {meta.buildingTypePl} · {meta.climateZonePl}
              </p>
            </div>
            {score ? (
              <div className="w-full max-w-[240px] shrink-0">
                <ScoreGauge
                  current={score.current}
                  potential={score.potential}
                  classLabel={score.classLabel}
                  classNumber={score.classNumber}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* 2. Executive Summary */}
        {score ? (
          <Section title="Podsumowanie zarządcze" icon={<TrendingUp className="h-5 w-5 text-accent" />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent>
                  <p className="text-xs text-muted">Wynik obecny</p>
                  <p className="text-2xl font-bold text-foreground">{score.current.toFixed(1)}%</p>
                  <p className="text-xs text-muted">Klasa {score.classLabel}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs text-muted">Potencjał po modernizacji</p>
                  <p className="text-2xl font-bold text-emerald-600">{score.potential.toFixed(1)}%</p>
                  <p className="text-xs text-muted">Klasa {score.potentialClassLabel}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs text-muted">Możliwa poprawa</p>
                  <p className="text-2xl font-bold text-foreground">
                    +{(score.potential - score.current).toFixed(1)} p.p.
                  </p>
                  <p className="text-xs text-muted">na podstawie rekomendacji</p>
                </CardContent>
              </Card>
            </div>

            {(model.strengths?.length || model.gaps?.length) ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {model.strengths?.length ? (
                  <Card>
                    <CardContent>
                      <p className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                        <ShieldCheck className="h-4 w-4" /> Mocne strony
                      </p>
                      <ul className="space-y-1 text-sm text-foreground">
                        {model.strengths.map((s) => (
                          <li key={s}>• {s}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}
                {model.gaps?.length ? (
                  <Card>
                    <CardContent>
                      <p className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
                        <AlertTriangle className="h-4 w-4" /> Największe braki
                      </p>
                      <ul className="space-y-1 text-sm text-foreground">
                        {model.gaps.map((s) => (
                          <li key={s}>• {s}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}

            {model.topRecommendations?.length ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  3 najważniejsze rekomendacje
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {model.topRecommendations.map((r, i) => (
                    <Card key={r.code}>
                      <CardContent>
                        <p className="text-xs font-semibold text-accent">#{i + 1} · {r.priority}</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{r.namePl}</p>
                        <p className="mt-1 text-xs text-muted line-clamp-3">{r.gapDescription}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}
          </Section>
        ) : null}

        {/* 4. Domeny (radar) */}
        {domainData.length ? (
          <Section
            title="Wyniki w domenach"
            subtitle="Obecnie vs po modernizacji (%)"
          >
            <Card className="break-inside-avoid">
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={domainData} outerRadius="72%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11 }} />
                      <Radar
                        name="Obecnie"
                        dataKey="Obecnie"
                        stroke={CURRENT_COLOR}
                        fill={CURRENT_COLOR}
                        fillOpacity={0.35}
                      />
                      <Radar
                        name="Po modernizacji"
                        dataKey="Po modernizacji"
                        stroke={POTENTIAL_COLOR}
                        fill={POTENTIAL_COLOR}
                        fillOpacity={0.2}
                      />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Section>
        ) : null}

        {/* 5. Impact criteria (poziome słupki) */}
        {criteriaData.length ? (
          <Section title="Kryteria wpływu (7)" subtitle="Obecnie vs po modernizacji (%)">
            <Card className="break-inside-avoid">
              <CardContent>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={criteriaData}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={160}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Obecnie" fill={CURRENT_COLOR} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Po modernizacji" fill={POTENTIAL_COLOR} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Section>
        ) : null}

        {/* 6. Top recommendations */}
        {model.recommendations?.length ? (
          <Section
            title={`Rekomendacje (${model.recommendations.length})`}
            subtitle="Priorytetyzowane działania modernizacyjne"
          >
            {/* Desktop: tabela */}
            <Card className="hidden break-inside-avoid overflow-hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2">Priorytet</th>
                      <th className="px-3 py-2">Usługa / problem</th>
                      <th className="px-3 py-2">Domena</th>
                      <th className="px-3 py-2">Poziom → cel</th>
                      <th className="px-3 py-2">Wpływ</th>
                      <th className="px-3 py-2">Trudność</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.recommendations.slice(0, 30).map((r) => (
                      <tr key={r.code} className="border-t border-border align-top">
                        <td className="px-3 py-2 font-medium">{r.priority}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{r.namePl}</p>
                          <p className="text-xs text-muted line-clamp-2">{r.gapDescription}</p>
                        </td>
                        <td className="px-3 py-2 text-muted">{r.domainPl}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {r.currentLevel} → {r.targetLevel}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-emerald-600">
                          +{r.expectedGainPercent.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 capitalize text-muted">{r.difficulty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile: karty */}
            <div className="space-y-3 sm:hidden">
              {model.recommendations.slice(0, 30).map((r) => (
                <Card key={r.code}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-accent">{r.priority}</span>
                      <span className="text-xs text-emerald-600">+{r.expectedGainPercent.toFixed(2)}%</span>
                    </div>
                    <p className="mt-1 font-medium text-foreground">{r.namePl}</p>
                    <p className="mt-1 text-xs text-muted">{r.gapDescription}</p>
                    <p className="mt-2 text-xs text-muted">
                      {r.domainPl} · poziom {r.currentLevel} → {r.targetLevel} · trudność {r.difficulty}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>
        ) : null}

        {/* 7. Roadmap */}
        {model.roadmap?.length ? (
          <Section title="Roadmapa modernizacji" subtitle="Kolejne etapy i przewidywany wynik">
            <div className="space-y-3">
              {model.roadmap.map((stage) => (
                <Card key={stage.stageId} className="break-inside-avoid">
                  <CardContent>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">
                        Etap {stage.stageId}: {stage.name}
                      </p>
                      <span className="rounded-full bg-emerald-50 px-3 py-0.5 text-sm font-semibold text-emerald-700">
                        Przewidywany SRI: {stage.predictedScore.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{stage.description}</p>
                    <p className="mt-2 text-xs text-muted">
                      Działania: {stage.actions.length} · Zależności:{" "}
                      {stage.dependencies.join(", ") || "brak"}
                      {stage.blockers.length ? ` · Blokery: ${stage.blockers.join(", ")}` : ""}
                    </p>
                    <ul className="mt-2 grid gap-1 text-xs text-foreground sm:grid-cols-2">
                      {stage.actions.slice(0, 8).map((a) => (
                        <li key={a.code}>
                          • {a.namePl} <span className="text-muted">({a.domainPl})</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>
        ) : null}

        {/* 8. Szczegóły techniczne */}
        {model.technical?.services?.length ? (
          <Section title="Szczegóły techniczne">
            <Collapsible title={`Usługi i poziomy funkcjonalności (${model.technical.services.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-2 py-1">Usługa</th>
                      <th className="px-2 py-1">Domena</th>
                      <th className="px-2 py-1">FL / max</th>
                      <th className="px-2 py-1">Weryfikacja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.technical.services.map((s) => (
                      <tr key={s.code} className="border-t border-border">
                        <td className="px-2 py-1">{s.namePl}</td>
                        <td className="px-2 py-1 text-muted">{s.domainPl}</td>
                        <td className="px-2 py-1 tabular-nums">
                          {s.fl} / {s.flMax}
                        </td>
                        <td className="px-2 py-1 text-muted">
                          {s.verificationStatus
                            ? VERIFICATION_STATUS_PL[s.verificationStatus] ?? s.verificationStatus
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">Źródło metodologii: {meta.methodologyVersionId}</p>
            </Collapsible>
          </Section>
        ) : null}

        {/* 9. Załączniki (zdjęcia) */}
        {model.attachments?.evidence?.length ? (
          <Section title="Załączniki">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {model.attachments.evidence.map((e, i) => (
                <a
                  key={e.id || i}
                  href={e.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-border"
                >
                  {e.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.url} alt={e.caption ?? "Dowód"} className="h-28 w-full object-cover" />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-xs text-muted">
                      Plik
                    </div>
                  )}
                  {e.caption ? (
                    <p className="px-2 py-1 text-xs text-muted line-clamp-1">{e.caption}</p>
                  ) : null}
                </a>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

export default ReportView;
