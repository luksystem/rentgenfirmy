"use client";

import { useState } from "react";
import { Download, Eraser, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { LeaveDecisionDialog } from "@/components/leave/leave-decision-dialog";
import { formatDate } from "@/lib/utils";
import { countLeaveDays, countLeaveWorkingDays } from "@/lib/leave/types";
import type { LeaveRequest } from "@/lib/leave/types";
import { fetchLeaveCardLink } from "@/lib/supabase/leave-request-repository";
import { useLeaveStore } from "@/store/leave-store";

/** Podgląd urlopu otwierany z pola pracownika w Gantcie Planu Zasobów — bez zamykania
 * modułu planowania. Akcje (akceptuj/odrzuć/cofnij/wyczyść podpis) dostępne tylko dla
 * przełożonego wnioskodawcy lub administratora, zgodnie z `canDecide`/`isAdmin`. */
export function LeavePlanningPreviewDialog({
  item,
  leaveTypeName,
  employeeName,
  isAdmin,
  canDecide,
  open,
  onOpenChange,
}: {
  item: LeaveRequest;
  leaveTypeName: string;
  employeeName: string;
  isAdmin: boolean;
  canDecide: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const revertRequest = useLeaveStore((state) => state.revertRequest);
  const clearSignature = useLeaveStore((state) => state.clearSignature);

  const [decisionMode, setDecisionMode] = useState<"approve" | "reject" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await fetchLeaveCardLink(item.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Nie udało się pobrać karty urlopowej.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevert() {
    if (!window.confirm("Cofnąć zaakceptowany urlop? Wniosek zmieni status na odrzucony.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await revertRequest(item.id);
      onOpenChange(false);
    } catch (revertError) {
      setError(revertError instanceof Error ? revertError.message : "Nie udało się cofnąć urlopu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClearSignature() {
    if (!window.confirm("Wyczyścić podpis? Wniosek wróci do statusu „oczekuje” i będzie mógł zostać ponownie rozpatrzony.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clearSignature(item.id);
      onOpenChange(false);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Nie udało się wyczyścić podpisu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open && !decisionMode} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Urlop pracownika</DialogTitle>
          </DialogHeader>

          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{employeeName}</p>
              <LeaveStatusBadge status={item.status} />
            </div>
            <p className="text-sm text-muted">
              {leaveTypeName} · {formatDate(item.startDate)} — {formatDate(item.endDate)} ·{" "}
              {countLeaveWorkingDays(item.startDate, item.endDate)}{" "}
              {countLeaveWorkingDays(item.startDate, item.endDate) === 1 ? "dzień roboczy" : "dni roboczych"} (
              {countLeaveDays(item.startDate, item.endDate)} kalendarzowych)
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

          {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {item.status === "pending" && canDecide ? (
              <>
                <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => setDecisionMode("reject")}>
                  Odrzuć
                </Button>
                <Button type="button" size="sm" disabled={busy} onClick={() => setDecisionMode("approve")}>
                  Akceptuj
                </Button>
              </>
            ) : null}

            {item.status === "approved" && item.generatedPdfPath ? (
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void handleDownload()}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Karta urlopowa
              </Button>
            ) : null}

            {item.status === "approved" && isAdmin ? (
              <>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleClearSignature()}>
                  <Eraser className="mr-1.5 h-3.5 w-3.5" />
                  Wyczyść podpis
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleRevert()}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Cofnij urlop
                </Button>
              </>
            ) : null}

            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Zamknij
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {decisionMode ? (
        <LeaveDecisionDialog
          item={item}
          mode={decisionMode}
          leaveTypeName={leaveTypeName}
          employeeName={employeeName}
          open={Boolean(decisionMode)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setDecisionMode(null);
              onOpenChange(false);
            }
          }}
        />
      ) : null}
    </>
  );
}
