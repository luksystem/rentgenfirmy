"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  AuditSession,
  AuditQuestion,
  MethodologyOption,
  AuditRecommendation,
  RoadmapStage,
  CalculationResult,
} from "@/lib/audit/types";

type DetailResponse = {
  session: AuditSession;
  methodologies: MethodologyOption[];
  buildingTypes: string[];
  climateZones: string[];
  questions: AuditQuestion[];
  answers: Record<string, number>;
  hasResults: boolean;
};

type ReportResponse = {
  calculation: CalculationResult;
  recommendations: AuditRecommendation[];
  roadmap: RoadmapStage[];
};

const cell: React.CSSProperties = { border: "1px solid #ccc", padding: "4px 8px", textAlign: "left" };

export function AuditWizard({ id }: { id: string }) {
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // metodologia
  const [methodology, setMethodology] = useState("eu-sri-v4.5");
  const [buildingType, setBuildingType] = useState("non_residential");
  const [climateZone, setClimateZone] = useState("north_europe");

  const load = useCallback(async () => {
    const res = await fetch(`/api/audit/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Błąd");
      return;
    }
    setDetail(data);
    setAnswers(data.answers ?? {});
    if (data.session.status === "completed") {
      const r = await fetch(`/api/audit/${id}/report`);
      if (r.ok) setReport(await r.json());
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMethodology() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/${id}/methodology`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          methodologyVersionId: methodology,
          buildingType,
          climateZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("Zapisano metodologię.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  }

  async function saveAnswers() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/${id}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("Zapisano odpowiedzi.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  }

  async function uploadEvidence(questionCode: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("questionCode", questionCode);
    const res = await fetch(`/api/audit/${id}/evidence`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Błąd uploadu");
    else setMsg(`Dodano evidence do ${questionCode}.`);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`Obliczono: SRI ${data.calculation.totalScorePercent}% (${data.calculation.class.label}).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <p>Ładowanie…</p>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    );
  }

  const { session, questions } = detail;
  const grouped = questions.reduce<Record<string, AuditQuestion[]>>((acc, q) => {
    (acc[q.domainNamePl] ??= []).push(q);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <p>
        <Link href="/audyt">← Lista audytów</Link>
      </p>
      <h1>{session.name}</h1>
      <p style={{ color: "#555" }}>Status: {session.status}</p>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Krok 2: metodologia */}
      <section style={{ margin: "16px 0", padding: 12, border: "1px solid #ddd" }}>
        <h2>1. Metodologia i budynek</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label>
            Metodologia:{" "}
            <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
              {detail.methodologies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Typ budynku:{" "}
            <select value={buildingType} onChange={(e) => setBuildingType(e.target.value)}>
              {detail.buildingTypes.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label>
            Strefa klimatyczna:{" "}
            <select value={climateZone} onChange={(e) => setClimateZone(e.target.value)}>
              {detail.climateZones.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={saveMethodology} disabled={busy}>
            Zapisz metodologię
          </button>
        </div>
      </section>

      {/* Krok 3-5: pytania, odpowiedzi, evidence */}
      {questions.length > 0 && (
        <section style={{ margin: "16px 0", padding: 12, border: "1px solid #ddd" }}>
          <h2>2. Pytania i odpowiedzi ({questions.length})</h2>
          {Object.entries(grouped).map(([domain, qs]) => (
            <div key={domain} style={{ marginBottom: 12 }}>
              <h3>{domain}</h3>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  {qs.map((q) => (
                    <tr key={q.code}>
                      <td style={cell}>
                        {q.code} — {q.namePl}
                      </td>
                      <td style={cell}>
                        <select
                          value={answers[q.code] ?? 0}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [q.code]: Number(e.target.value) }))
                          }
                        >
                          {q.levels.map((l) => (
                            <option key={l.level} value={l.level}>
                              {l.level}
                              {l.descriptionEn ? ` — ${l.descriptionEn}` : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={cell}>
                        <input
                          type="file"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadEvidence(q.code, f);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <button type="button" onClick={saveAnswers} disabled={busy}>
            Zapisz odpowiedzi
          </button>
        </section>
      )}

      {/* Krok 6-9: uruchomienie */}
      {session.status !== "draft" && (
        <section style={{ margin: "16px 0", padding: 12, border: "1px solid #ddd" }}>
          <h2>3. Uruchom obliczenia</h2>
          <button type="button" onClick={run} disabled={busy}>
            Uruchom (Calc → Rec → Opt → Roadmap)
          </button>
        </section>
      )}

      {/* Krok 10: raport */}
      {report && (
        <section style={{ margin: "16px 0", padding: 12, border: "1px solid #ddd" }}>
          <h2>4. Raport</h2>
          <p style={{ fontSize: 20 }}>
            <strong>SRI: {report.calculation.total_score_percent}%</strong> — klasa{" "}
            <strong>{report.calculation.class.label}</strong>
          </p>

          <h3>Rekomendacje ({report.recommendations.length})</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={cell}>Usługa</th>
                <th style={cell}>Poziom → cel</th>
                <th style={cell}>Priorytet</th>
                <th style={cell}>Zysk</th>
              </tr>
            </thead>
            <tbody>
              {report.recommendations.slice(0, 30).map((r) => (
                <tr key={r.code}>
                  <td style={cell}>
                    {r.code} — {r.namePl}
                  </td>
                  <td style={cell}>
                    {r.currentLevel} → {r.targetLevel}
                  </td>
                  <td style={cell}>{r.priority}</td>
                  <td style={cell}>{r.expectedGainPercent.toFixed(3)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Roadmap</h3>
          {report.roadmap.map((stage) => (
            <div key={stage.stageId} style={{ marginBottom: 12 }}>
              <h4>
                Etap {stage.stageId}: {stage.name} ({stage.actions.length})
              </h4>
              <ul>
                {stage.actions.map((a) => (
                  <li key={a.code}>
                    {a.code} — {a.namePl} ({a.domainPl}) · {a.priority}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
