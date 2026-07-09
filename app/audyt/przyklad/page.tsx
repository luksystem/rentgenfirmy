import Link from "next/link";
import { buildReferenceAssessment } from "@/lib/sri/reference";
import { compute } from "@/lib/sri/engine";
import { buildRecommendations } from "@/lib/sri/recommendation";
import { buildRoadmap } from "@/lib/sri/optimization";
import { getDomainsPl, getCriteria } from "@/lib/sri/artifacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRITERION_PL: Record<string, string> = {
  energy_efficiency: "Efektywność energetyczna",
  maintenance_and_fault_prediction: "Utrzymanie i predykcja awarii",
  comfort: "Komfort",
  convenience: "Wygoda",
  health_wellbeing_accessibility: "Zdrowie i dostępność",
  information_to_occupants: "Informacja dla użytkowników",
  energy_flexibility_and_storage: "Elastyczność energetyczna",
};

const cell: React.CSSProperties = { border: "1px solid #ccc", padding: "4px 8px", textAlign: "left" };

export default function ReferenceAuditPage() {
  const input = buildReferenceAssessment();
  const calc = compute(input);
  const recommendations = buildRecommendations(input);
  const roadmap = buildRoadmap(recommendations);
  const domainsPl = getDomainsPl();
  const criteria = getCriteria();

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <p>
        <Link href="/audyt">← Lista audytów</Link>
      </p>
      <h1>Referencyjny audyt SRI (przykład)</h1>
      <p style={{ color: "#555" }}>
        Metodologia: {input.methodology_version_id} · Budynek: {input.building_type} · Strefa:{" "}
        {input.climate_zone}. Scenariusz deterministyczny (podgląd całego przepływu: obliczenia →
        rekomendacje → optymalizacja → roadmapa).
      </p>

      <h2>Wynik</h2>
      <p style={{ fontSize: 22 }}>
        <strong>SRI: {calc.total_score_percent}%</strong> — klasa{" "}
        <strong>{calc.class.label}</strong> (nr {calc.class.number})
      </p>

      <h2>Wynik per kryterium (SR)</h2>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cell}>Kryterium</th>
            <th style={cell}>SR</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((ic) => (
            <tr key={ic}>
              <td style={cell}>{CRITERION_PL[ic] ?? ic}</td>
              <td style={cell}>{((calc.per_criterion[ic] ?? 0) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Wynik per domena (achieved / max)</h2>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cell}>Domena</th>
            <th style={cell}>Suma achieved</th>
            <th style={cell}>Suma max</th>
            <th style={cell}>%</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(calc.per_domain).map(([domain, byIc]) => {
            const achieved = Object.values(byIc).reduce((a, v) => a + v.achieved, 0);
            const max = Object.values(byIc).reduce((a, v) => a + v.maxposs, 0);
            return (
              <tr key={domain}>
                <td style={cell}>{domainsPl[domain] ?? domain}</td>
                <td style={cell}>{achieved}</td>
                <td style={cell}>{max}</td>
                <td style={cell}>{max > 0 ? ((achieved / max) * 100).toFixed(0) : "—"}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Rekomendacje ({recommendations.length})</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={cell}>Usługa</th>
            <th style={cell}>Domena</th>
            <th style={cell}>Poziom → cel</th>
            <th style={cell}>Priorytet</th>
            <th style={cell}>Oczekiwany zysk</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.slice(0, 25).map((r) => (
            <tr key={r.code}>
              <td style={cell}>
                {r.code} — {r.namePl}
              </td>
              <td style={cell}>{r.domainPl}</td>
              <td style={cell}>
                {r.currentLevel} → {r.targetLevel}
              </td>
              <td style={cell}>{r.priority}</td>
              <td style={cell}>{r.expectedGainPercent.toFixed(3)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {recommendations.length > 25 && (
        <p style={{ color: "#777" }}>…oraz {recommendations.length - 25} kolejnych.</p>
      )}

      <h2>Roadmap modernizacji</h2>
      {roadmap.map((stage) => (
        <div key={stage.stageId} style={{ marginBottom: 16 }}>
          <h3>
            Etap {stage.stageId}: {stage.name} ({stage.actions.length} działań)
          </h3>
          <p style={{ color: "#555", margin: "4px 0" }}>{stage.description}</p>
          <ul>
            {stage.actions.map((a) => (
              <li key={a.code}>
                {a.code} — {a.namePl} ({a.domainPl}) · priorytet {a.priority}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
