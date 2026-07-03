"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, UserRound } from "lucide-react";
import { AgreementCollaborationPanel } from "@/components/dashboard/agreement-collaboration-panel";
import { CollapsibleSection } from "@/components/dashboard/agreement-collapsible-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import {
  AGREEMENT_WORKFLOW_PHASE_LABELS,
  getAgreementWorkflowPhase,
  type AgreementCollaborationBundle,
} from "@/lib/dashboard/agreement-collaboration-types";
import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  PROJECT_AGREEMENT_STATUS_LABELS,
  formatAgreementCost,
} from "@/lib/dashboard/agreement-types";
import { cn } from "@/lib/utils";

export default function PublicAgreementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = String(params.token ?? "");
  const focus = searchParams.get("focus");
  const [bundle, setBundle] = useState<AgreementCollaborationBundle | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [roleTouched, setRoleTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/ustalenie/${encodeURIComponent(token)}`);
    const payload = (await response.json()) as AgreementCollaborationBundle & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Nie udało się załadować ustalenia.");
    }
    setBundle(payload);
  }, [token]);

  useEffect(() => {
    if (!token || token === "undefined") {
      setError("Nieprawidłowy link.");
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh, token]);

  useEffect(() => {
    if (!bundle || !focus) {
      return;
    }
    const targetId = focus === "discussion" ? "agreement-discussion" : "agreement-acceptance";
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [bundle, focus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <p className="text-sm text-muted">Ładowanie ustalenia…</p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card>
          <CardContent className="py-8 text-sm text-rose-200">
            {error ?? "Nie znaleziono ustalenia."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const agreement = bundle.activeVersion ?? bundle.agreement;
  const phase = getAgreementWorkflowPhase(bundle.agreement);
  const costLabel = formatAgreementCost(agreement);
  const selectedRole = bundle.roles.find((role) => role.id === selectedRoleId);
  const identityIncomplete = !authorName.trim() || !selectedRoleId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Ustalenie projektowe
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{agreement.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {PROJECT_AGREEMENT_CATEGORY_LABELS[agreement.category]} ·{" "}
          {AGREEMENT_WORKFLOW_PHASE_LABELS[phase]}
        </p>

        <Card className="mt-5">
          <CardContent className="grid gap-3 py-6">
            <CollapsibleSection
              title="Treść ustalenia"
              defaultExpanded
              summary={
                agreement.body
                  ? agreement.body.slice(0, 120) + (agreement.body.length > 120 ? "…" : "")
                  : "Brak opisu"
              }
            >
              {agreement.body ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{agreement.body}</p>
              ) : (
                <p className="text-sm text-muted">Brak opisu w tej wersji.</p>
              )}
              {costLabel ? (
                <p className="text-sm font-medium text-foreground">Koszt: {costLabel}</p>
              ) : null}
              {(bundle.activeVersion?.costNote ?? bundle.agreement.costNote)?.trim() ? (
                <p className="text-sm text-muted">
                  Notatka do kosztów:{" "}
                  {(bundle.activeVersion?.costNote ?? bundle.agreement.costNote)?.trim()}
                </p>
              ) : null}
              <p className="text-xs text-muted">
                Status: {PROJECT_AGREEMENT_STATUS_LABELS[bundle.agreement.status]}
              </p>
            </CollapsibleSection>

            <CollapsibleSection
              title="Twoja tożsamość w procesie"
              defaultExpanded
              summary={
                identityIncomplete
                  ? "Wymagane: imię i rola"
                  : `${authorName.trim()} · ${selectedRole?.label ?? "Rola wybrana"}`
              }
            >
            <div
              className={cn(
                "rounded-2xl border-2 p-4 sm:p-5",
                identityIncomplete
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-emerald-500/40 bg-emerald-500/8",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    identityIncomplete
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                      : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
                  )}
                >
                  {identityIncomplete ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <UserRound className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {identityIncomplete
                      ? "Wymagane: imię i rola w procesie"
                      : "Tożsamość potwierdzona"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Zanim zaakceptujesz ustalenie lub dodasz komentarz, wpisz swoje imię lub firmę
                    i wybierz rolę, którą reprezentujesz w tym procesie. Rola nie jest
                    wybierana automatycznie — upewnij się, że wskazujesz właściwą.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <Field
                  label="1. Twoje imię lub firma"
                  error={nameTouched && !authorName.trim() ? "Imię lub firma jest wymagane." : undefined}
                >
                  <Input
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    onBlur={() => setNameTouched(true)}
                    placeholder="np. Jan Kowalski / Firma XYZ"
                    required
                    className={cn(
                      nameTouched && !authorName.trim() && "border-rose-500/50 focus:border-rose-500/50",
                    )}
                  />
                </Field>

                {bundle.roles.length > 0 ? (
                  <div className="grid gap-1.5">
                    <Field
                      label="2. Twoja rola w procesie"
                      error={
                        roleTouched && !selectedRoleId
                          ? "Wybierz rolę, którą reprezentujesz."
                          : undefined
                      }
                    >
                      <Select
                        value={selectedRoleId}
                        onChange={(event) => {
                          setSelectedRoleId(event.target.value);
                          setRoleTouched(true);
                        }}
                        onBlur={() => setRoleTouched(true)}
                        className={cn(
                          !selectedRoleId && "text-muted",
                          roleTouched && !selectedRoleId && "border-rose-500/50",
                        )}
                      >
                        <option value="" disabled>
                          — Wybierz swoją rolę —
                        </option>
                        {bundle.roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {selectedRole ? (
                      <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
                        <span className="font-medium">{authorName.trim() || "…"}</span>
                        <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wide text-accent">
                          Rola w procesie: {selectedRole.label}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-amber-200/90">
                        Lista ról pochodzi z procesu akceptacji tego ustalenia — wybierz tę, która
                        dotyczy Ciebie.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Proces akceptacji i komentarze"
              defaultExpanded
              summary={AGREEMENT_WORKFLOW_PHASE_LABELS[phase]}
            >
            <div id="agreement-acceptance" />
            <div id="agreement-discussion" />
            <AgreementCollaborationPanel
              agreementId={bundle.agreement.id}
              mode="external"
              authorName={authorName}
              publicToken={token}
              selectedRoleId={selectedRoleId}
              onSelectedRoleIdChange={setSelectedRoleId}
              onIdentityValidation={() => {
                setNameTouched(true);
                setRoleTouched(true);
              }}
              onChanged={refresh}
              syncRevision={`${bundle.agreement.status}:${bundle.agreement.updatedAt}:${bundle.agreement.activeVersionId ?? ""}`}
            />
            </CollapsibleSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
