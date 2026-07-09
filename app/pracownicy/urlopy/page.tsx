"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eraser, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { LeaveDecisionDialog } from "@/components/leave/leave-decision-dialog";
import { formatDate } from "@/lib/utils";
import { getUserDisplayName, isAdministratorRole } from "@/lib/auth/types";
import { countLeaveDays, LEAVE_REQUEST_STATUSES, LEAVE_REQUEST_STATUS_LABELS } from "@/lib/leave/types";
import type { LeaveRequest, LeaveRequestStatus } from "@/lib/leave/types";
import { fetchLeaveCardLink } from "@/lib/supabase/leave-request-repository";
import { useAuthStore } from "@/store/auth-store";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useLeaveStore } from "@/store/leave-store";

export default function EmployeeLeavesPage() {
  const profile = useAuthStore((state) => state.profile);
  const ensureAllRequests = useLeaveStore((state) => state.ensureAllRequests);
  const allRequests = useLeaveStore((state) => state.allRequests);
  const allRequestsHydrated = useLeaveStore((state) => state.allRequestsHydrated);
  const allRequestsLoading = useLeaveStore((state) => state.allRequestsLoading);
  const teamProfiles = useLeaveStore((state) => state.teamProfiles);
  const getEmployeeName = useLeaveStore((state) => state.getEmployeeName);
  const revertRequest = useLeaveStore((state) => state.revertRequest);
  const clearSignature = useLeaveStore((state) => state.clearSignature);
  const ensureDictionary = useDictionaryStore((state) => state.ensure);
  const dictionaryItemLabel = useDictionaryStore((state) => state.itemLabel);

  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | "">("");
  const [decision, setDecision] = useState<{ item: LeaveRequest; mode: "approve" | "reject" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void ensureAllRequests();
    void ensureDictionary();
  }, [ensureAllRequests, ensureDictionary]);

  const isAdmin = profile ? isAdministratorRole(profile.role) : false;

  const filteredRequests = useMemo(() => {
    return [...allRequests]
      .filter((item) => !employeeFilter || item.profileId === employeeFilter)
      .filter((item) => !statusFilter || item.status === statusFilter)
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [allRequests, employeeFilter, statusFilter]);

  function canDecide(item: LeaveRequest) {
    return Boolean(profile) && (isAdmin || item.supervisorId === profile?.id);
  }

  async function handleDownload(id: string) {
    setBusyId(id);
    try {
      const { url } = await fetchLeaveCardLink(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się pobrać karty urlopowej.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevert(id: string) {
    if (!window.confirm("Cofnąć zaakceptowany urlop? Wniosek zmieni status na odrzucony.")) {
      return;
    }
    setBusyId(id);
    try {
      await revertRequest(id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się cofnąć urlopu.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleClearSignature(id: string) {
    if (!window.confirm("Wyczyścić podpis? Wniosek wróci do statusu „oczekuje” i będzie mógł zostać ponownie rozpatrzony.")) {
      return;
    }
    setBusyId(id);
    try {
      await clearSignature(id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się wyczyścić podpisu.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Pracownicy"
        title="Urlopy"
        description="Wszystkie wnioski urlopowe — akceptacje, odrzucenia i karty urlopowe. Filtruj po pracowniku i statusie."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 sm:max-w-md">
        <Select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
          <option value="">Wszyscy pracownicy</option>
          {teamProfiles.map((member) => (
            <option key={member.id} value={member.id}>
              {getUserDisplayName(member)}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as LeaveRequestStatus | "")}
        >
          <option value="">Wszystkie statusy</option>
          {LEAVE_REQUEST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LEAVE_REQUEST_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>

      {allRequestsLoading && !allRequestsHydrated ? (
        <p className="text-sm text-muted">Wczytywanie urlopów…</p>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Brak wniosków spełniających wybrane kryteria.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredRequests.map((item) => {
            const leaveTypeName = dictionaryItemLabel(item.leaveTypeItemId);
            const employeeName = getEmployeeName(item.profileId);
            const busy = busyId === item.id;

            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{employeeName}</p>
                      <LeaveStatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {leaveTypeName} · {formatDate(item.startDate)} — {formatDate(item.endDate)} ·{" "}
                      {countLeaveDays(item.startDate, item.endDate)}{" "}
                      {countLeaveDays(item.startDate, item.endDate) === 1 ? "dzień" : "dni"}
                    </p>
                    {item.note ? <p className="mt-1 text-xs text-muted">„{item.note}”</p> : null}
                    {item.status === "rejected" && item.decisionNote ? (
                      <p className="mt-1 text-xs text-rose-300">Powód: {item.decisionNote}</p>
                    ) : null}
                    {item.status === "approved" && item.signature ? (
                      <p className="mt-1 text-xs text-muted">
                        Zaakceptował: {item.signature.signerName} · {formatDate(item.decidedAt ?? undefined)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {item.status === "pending" && canDecide(item) ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setDecision({ item, mode: "approve" })}
                        >
                          Akceptuj
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setDecision({ item, mode: "reject" })}
                        >
                          Odrzuć
                        </Button>
                      </>
                    ) : null}

                    {item.status === "approved" && item.generatedPdfPath ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleDownload(item.id)}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Karta
                      </Button>
                    ) : null}

                    {item.status === "approved" && isAdmin ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleClearSignature(item.id)}
                        >
                          <Eraser className="mr-1.5 h-3.5 w-3.5" />
                          Wyczyść podpis
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleRevert(item.id)}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Cofnij urlop
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {decision ? (
        <LeaveDecisionDialog
          item={decision.item}
          mode={decision.mode}
          leaveTypeName={dictionaryItemLabel(decision.item.leaveTypeItemId)}
          employeeName={getEmployeeName(decision.item.profileId)}
          open={Boolean(decision)}
          onOpenChange={(open) => {
            if (!open) {
              setDecision(null);
            }
          }}
        />
      ) : null}
    </>
  );
}
