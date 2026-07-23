"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { TeamProfileSelect } from "@/components/process/team-profile-select";
import { getUserDisplayName, isAdministratorRole, type UserProfile } from "@/lib/auth/types";
import {
  canDecideOfferApproval,
  requiresOfferApproval,
  type OfferApprovalState,
  type OfferKind,
} from "@/lib/service/offer-approval";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import type { ServiceRecord } from "@/lib/service/types";

const KIND_LABEL: Record<OfferKind, string> = { estimate: "wyceny", settlement: "rozliczenia" };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? "Nie udało się wykonać operacji.");
  }
  return data as T;
}

export function OfferApprovalPanel({
  serviceId,
  kind,
  approval,
  currentProfile,
  onServiceUpdated,
}: {
  serviceId: string;
  kind: OfferKind;
  approval: OfferApprovalState;
  currentProfile: UserProfile;
  onServiceUpdated: (service: ServiceRecord) => void;
}) {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [assignedAdminId, setAssignedAdminId] = useState(approval.assignedAdminId ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsApproval = requiresOfferApproval(currentProfile);
  const isOwnRequest = approval.requestedBy === currentProfile.id;
  const canDecide = canDecideOfferApproval(approval, currentProfile);

  useEffect(() => {
    if (!needsApproval && !canDecide) {
      return;
    }
    let cancelled = false;
    void fetchTeamProfiles()
      .then((profiles) => {
        if (!cancelled) {
          setAdmins(profiles.filter((profile) => isAdministratorRole(profile.role)));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [needsApproval, canDecide]);

  async function requestApproval() {
    if (!assignedAdminId) {
      setError("Wybierz administratora.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { service } = await postJson<{ service: ServiceRecord }>(
        `/api/services/${serviceId}/offer-approval/${kind}/request`,
        { assignedAdminId },
      );
      onServiceUpdated(service);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się wysłać do akceptacji.");
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(decision: "approve" | "question") {
    if (decision === "question" && !note.trim()) {
      setError("Opisz pytanie do wnioskodawcy.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { service } = await postJson<{ service: ServiceRecord }>(
        `/api/services/${serviceId}/offer-approval/${kind}/decision`,
        { decision, note },
      );
      onServiceUpdated(service);
      setNote("");
    } catch (decideError) {
      setError(decideError instanceof Error ? decideError.message : "Nie udało się zapisać decyzji.");
    } finally {
      setSubmitting(false);
    }
  }

  const adminName = (id: string | null) =>
    id ? getUserDisplayName(admins.find((profile) => profile.id === id) ?? { firstName: "", lastName: "", email: "…" }) : "";

  const showRequestForm =
    needsApproval && (!approval.status || (approval.status === "question" && isOwnRequest));

  if (showRequestForm) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="grid gap-3 py-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Akceptacja {KIND_LABEL[kind]} przed wysyłką
            </h3>
            <p className="mt-1 text-sm text-muted">
              Zanim wyślesz do klienta, wybierz administratora, który to zaakceptuje.
            </p>
          </div>

          {approval.status === "question" ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">Pytanie administratora</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{approval.note}</p>
            </div>
          ) : null}

          <Field label="Administrator do akceptacji">
            <TeamProfileSelect
              value={assignedAdminId}
              onChange={(id) => setAssignedAdminId(id)}
              teamProfiles={admins}
              roles={["administrator"]}
              disabled={submitting}
            />
          </Field>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div>
            <Button type="button" onClick={() => void requestApproval()} disabled={submitting}>
              {submitting
                ? "Wysyłanie…"
                : approval.status === "question"
                  ? "Popraw i wyślij ponownie do akceptacji"
                  : "Wyślij do akceptacji"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsApproval && approval.status === "pending") {
    return (
      <Card className="border-border/80 bg-surface-muted/30">
        <CardContent className="py-5 text-sm text-muted">
          Oczekuje na akceptację administratora{approval.assignedAdminId ? ` (${adminName(approval.assignedAdminId)})` : ""}.
        </CardContent>
      </Card>
    );
  }

  if (needsApproval && approval.status === "approved" && isOwnRequest) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/10">
        <CardContent className="py-4 text-sm text-emerald-800 dark:text-emerald-300">
          Administrator zaakceptował — możesz teraz wysłać do klienta.
        </CardContent>
      </Card>
    );
  }

  if (canDecide) {
    return (
      <Card className="border-sky-500/30 bg-sky-500/5">
        <CardContent className="grid gap-3 py-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Prośba o akceptację {KIND_LABEL[kind]}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Możesz od razu wysłać do klienta przyciskiem poniżej, zaakceptować (wróci do
              wnioskodawcy, który wyśle sam) albo zadać pytanie.
            </p>
          </div>

          <Field label="Pytanie (wymagane tylko dla „Zadaj pytanie”)">
            <Textarea
              value={note}
              disabled={submitting}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Np. Popraw stawkę na pozycji X…"
            />
          </Field>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void decide("approve")} disabled={submitting}>
              Akceptuj
            </Button>
            <Button type="button" variant="secondary" onClick={() => void decide("question")} disabled={submitting}>
              Zadaj pytanie
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
