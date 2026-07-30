"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PhoneOutgoing } from "lucide-react";
import { useProjectEdit } from "@/components/project-edit-provider";
import { PageHeader } from "@/components/page-header";
import { MobileField, MobileListCard } from "@/components/mobile-list-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  SILENCE_STATE_LABELS,
  daysSinceOurContact,
  resolveSilenceState,
  type ProjectActivityAxes,
  type SilenceState,
} from "@/lib/communication/types";
import { isClosedFlowStatus } from "@/lib/field-options";
import { DEFAULT_POLICY_THRESHOLDS, type PolicyThresholds } from "@/lib/policy-thresholds/types";
import { logOutgoingContact } from "@/lib/supabase/communication-repository";
import { fetchPolicyThresholds } from "@/lib/supabase/policy-thresholds-repository";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

const SILENCE_TONES: Record<SilenceState, "active" | "waiting" | "critical"> = {
  zdrowo: "active",
  klient_milczy: "waiting",
  my_nie_reagujemy: "critical",
  obie_ciche: "critical",
};

function axesOf(project: Project): ProjectActivityAxes {
  return {
    lastInternalActivityAt: project.lastInternalActivityAt ?? null,
    lastClientActivityAt: project.lastClientActivityAt ?? null,
  };
}

function todayInputValue() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Faza 9A punkt (d) — wersja zbiorcza. Opiekun po piątku z pięcioma rozmowami klika pięć razy na
 * jednej liście, nie wchodzi w pięć projektów. Wspólna data dla całej serii (najczęstszy przypadek:
 * „to były rozmowy z piątku"), z możliwością zmiany przed klikaniem.
 */
export default function NoContactPage() {
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const { openProjectEdit } = useProjectEdit();
  const profile = useAuthStore((state) => state.profile);

  const [thresholds, setThresholds] = useState<PolicyThresholds>(DEFAULT_POLICY_THRESHOLDS);
  const [eventDate, setEventDate] = useState(todayInputValue);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [justLogged, setJustLogged] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPolicyThresholds()
      .then(setThresholds)
      .catch(() => undefined);
  }, []);

  /**
   * Jedna definicja ciszy, wzięta z ustawień globalnych (żądanie właściciela — wcześniej ta strona
   * miała zaszyte 14 dni, a specyfikacja mówi 25 ostrzeżenie / 30 bezpiecznik; dwie sprzeczne
   * definicje ciszy w jednym systemie to gwarantowany spór o to, która jest prawdziwa).
   */
  const warningDays = thresholds.silenceWarningDays;

  const staleProjects = useMemo(
    () =>
      projects
        .filter((project) => !isClosedFlowStatus(project.flowStatus, fieldOptions))
        .map((project) => ({
          project,
          state: resolveSilenceState(axesOf(project), warningDays),
          ourAge: daysSinceOurContact(axesOf(project)),
        }))
        .filter((row) => row.state !== "zdrowo")
        // Najgorszy wizerunkowo na górze: my nie reagujemy > obie ciche > klient milczy.
        .sort((a, b) => {
          const rank: Record<SilenceState, number> = {
            my_nie_reagujemy: 0,
            obie_ciche: 1,
            klient_milczy: 2,
            zdrowo: 3,
          };
          const byState = rank[a.state] - rank[b.state];
          if (byState !== 0) return byState;
          return (b.ourAge ?? Number.MAX_SAFE_INTEGER) - (a.ourAge ?? Number.MAX_SAFE_INTEGER);
        }),
    [projects, fieldOptions, warningDays],
  );

  const handleLog = useCallback(
    async (project: Project) => {
      setPendingId(project.id);
      setError(null);
      try {
        await logOutgoingContact({
          projectId: project.id,
          eventAt: new Date(`${eventDate}T12:00:00`).toISOString(),
          actorId: profile?.id ?? null,
          actorName: profile ? getUserDisplayName(profile) : "Zespół",
        });
        // Wiersz ZOSTAJE na liście z potwierdzeniem "Zapisano" — świadomie, zamiast znikać.
        // Znikający wiersz przy klikaniu serii przesuwa pozostałe pod kursorem i prowadzi do
        // kliknięcia niewłaściwego projektu. Lista przebuduje się przy następnym wejściu na stronę
        // (cache osi jest już zaktualizowany atomowo w bazie, migracja 259).
        setJustLogged((current) => new Set(current).add(project.id));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Nie udało się zapisać kontaktu.");
      } finally {
        setPendingId(null);
      }
    },
    [eventDate, profile],
  );

  function ageLabel(ourAge: number | null) {
    if (ourAge === null) return "nigdy";
    return `${ourAge} dni`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Otwarte pętle"
        title="Cisza w projektach"
        description={`Projekty, w których któraś ze stron milczy dłużej niż ${warningDays} dni. „My nie reagujemy" jest na górze — to najgorszy przypadek wizerunkowo.`}
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="grid gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted" htmlFor="contact-date">
            Data kontaktu dla całej serii
          </label>
          <Input
            id="contact-date"
            type="date"
            className="w-auto"
            value={eventDate}
            max={todayInputValue()}
            onChange={(event) => setEventDate(event.target.value)}
          />
        </div>
        <p className="max-w-xl text-xs text-muted">
          Ustaw datę raz, potem klikaj „Odezwaliśmy się” na kolejnych projektach. Zapisujemy tylko
          fakt kontaktu — bez treści rozmowy. Data wsteczna jest w porządku, przyszłej nie przyjmiemy.
        </p>
      </Card>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {staleProjects.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          Żaden otwarty projekt nie jest cichy dłużej niż {warningDays} dni.
        </Card>
      ) : null}

      <div className="grid gap-3 md:hidden">
        {staleProjects.map(({ project, state, ourAge }) => (
          <MobileListCard
            key={project.id}
            title={project.name}
            onClick={() => openProjectEdit(project)}
          >
            <MobileField label="Stan" value={SILENCE_STATE_LABELS[state]} />
            <MobileField label="Od naszego kontaktu" value={ageLabel(ourAge)} />
            <MobileField
              label="Ostatnia odpowiedź klienta"
              value={
                project.lastClientActivityAt ? formatDate(project.lastClientActivityAt) : "brak"
              }
            />
            <Button
              type="button"
              size="sm"
              className="mt-2 w-full"
              disabled={pendingId === project.id || justLogged.has(project.id)}
              onClick={(event) => {
                event.stopPropagation();
                void handleLog(project);
              }}
            >
              <PhoneOutgoing className="mr-1.5 h-4 w-4" />
              {justLogged.has(project.id) ? "Zapisano" : "Odezwaliśmy się"}
            </Button>
          </MobileListCard>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Projekt</th>
              <th className="px-4 py-3">Stan</th>
              <th className="px-4 py-3">Od naszego kontaktu</th>
              <th className="px-4 py-3">Ostatnia odpowiedź klienta</th>
              <th className="px-4 py-3">Właściciel kroku</th>
              <th className="px-4 py-3 text-right">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staleProjects.map(({ project, state, ourAge }) => (
              <tr key={project.id}>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-medium text-foreground hover:underline"
                    onClick={() => openProjectEdit(project)}
                  >
                    {project.name}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={SILENCE_TONES[state]} className="text-[10px]">
                    {SILENCE_STATE_LABELS[state]}
                  </Badge>
                </td>
                <td className="px-4 py-3">{ageLabel(ourAge)}</td>
                <td className="px-4 py-3">
                  {project.lastClientActivityAt ? formatDate(project.lastClientActivityAt) : "brak"}
                </td>
                <td className="px-4 py-3">{project.nextStepOwner}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={justLogged.has(project.id) ? "outline" : "default"}
                    disabled={pendingId === project.id || justLogged.has(project.id)}
                    onClick={() => void handleLog(project)}
                  >
                    <PhoneOutgoing className="mr-1.5 h-3.5 w-3.5" />
                    {pendingId === project.id
                      ? "Zapisywanie…"
                      : justLogged.has(project.id)
                        ? "Zapisano"
                        : "Odezwaliśmy się"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
