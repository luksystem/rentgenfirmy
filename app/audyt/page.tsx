"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuditSession } from "@/lib/audit/types";

export default function AuditListPage() {
  const router = useRouter();
  const [items, setItems] = useState<AuditSession[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Błąd");
      return;
    }
    setName("");
    void load();
  }

  async function createFromExample() {
    setError(null);
    setSeeding(true);
    try {
      const res = await fetch("/api/audit/seed-example", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      router.push(`/audyt/${data.id}/udostepnianie`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
      setSeeding(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Audyty SRI</h1>
      <p>
        <Link href="/audyt/przyklad">→ Zobacz referencyjny audyt z raportem (przykład)</Link>
      </p>
      <p>
        <button
          type="button"
          onClick={createFromExample}
          disabled={seeding}
          style={{ padding: "8px 14px", cursor: "pointer" }}
        >
          {seeding ? "Tworzenie…" : "Utwórz audyt z przykładu (do publicznego udostępnienia)"}
        </button>
      </p>

      <form onSubmit={create} style={{ margin: "16px 0" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nazwa audytu"
          style={{ padding: 6, width: 300 }}
        />
        <button type="submit" style={{ padding: "6px 12px", marginLeft: 8 }}>
          Utwórz audyt
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading ? (
        <p>Ładowanie…</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: 6, textAlign: "left" }}>Nazwa</th>
              <th style={{ border: "1px solid #ccc", padding: 6, textAlign: "left" }}>Status</th>
              <th style={{ border: "1px solid #ccc", padding: 6, textAlign: "left" }}>Utworzono</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  <Link href={`/audyt/${s.id}`}>{s.name}</Link>
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.status}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {new Date(s.createdAt).toLocaleString("pl-PL")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} style={{ border: "1px solid #ccc", padding: 6, color: "#777" }}>
                  Brak audytów. Utwórz pierwszy powyżej.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
