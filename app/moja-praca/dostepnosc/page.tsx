"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateLeaveRequestDialog } from "@/components/leave/create-leave-request-dialog";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { formatDate } from "@/lib/utils";
import { countLeaveDays, countLeaveWorkingDays } from "@/lib/leave/types";
import { fetchLeaveCardLink } from "@/lib/supabase/leave-request-repository";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useLeaveStore } from "@/store/leave-store";

export default function AvailabilityPage() {
  const ensureMyRequests = useLeaveStore((state) => state.ensureMyRequests);
  const myRequests = useLeaveStore((state) => state.myRequests);
  const myRequestsHydrated = useLeaveStore((state) => state.myRequestsHydrated);
  const myRequestsLoading = useLeaveStore((state) => state.myRequestsLoading);
  const cancelRequest = useLeaveStore((state) => state.cancelRequest);
  const ensureDictionary = useDictionaryStore((state) => state.ensure);
  const dictionaryItemLabel = useDictionaryStore((state) => state.itemLabel);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    void ensureMyRequests();
    void ensureDictionary();
  }, [ensureMyRequests, ensureDictionary]);

  const sortedRequests = useMemo(
    () => [...myRequests].sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    [myRequests],
  );

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelRequest(id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się usunąć wniosku.");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const { url } = await fetchLeaveCardLink(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się pobrać karty urlopowej.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Moja praca"
        title="Dostępność"
        description="Zgłaszaj urlopy i inne rodzaje dostępności — wniosek trafi do przełożonego i administratorów."
        action={<CreateLeaveRequestDialog />}
      />

      {myRequestsLoading && !myRequestsHydrated ? (
        <p className="text-sm text-muted">Wczytywanie historii dostępności…</p>
      ) : sortedRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Nie masz jeszcze żadnych wniosków. Kliknij „Nowy wniosek”, aby zgłosić urlop lub inną
            nieobecność.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sortedRequests.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {dictionaryItemLabel(item.leaveTypeItemId)}
                    </p>
                    <LeaveStatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(item.startDate)} — {formatDate(item.endDate)} ·{" "}
                    {countLeaveWorkingDays(item.startDate, item.endDate)}{" "}
                    {countLeaveWorkingDays(item.startDate, item.endDate) === 1 ? "dzień roboczy" : "dni roboczych"}{" "}
                    ({countLeaveDays(item.startDate, item.endDate)} kalendarzowych)
                  </p>
                  {item.note ? <p className="mt-1 text-xs text-muted">„{item.note}”</p> : null}
                  {item.status === "rejected" && item.decisionNote ? (
                    <p className="mt-1 text-xs text-rose-300">Powód odrzucenia: {item.decisionNote}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.status === "approved" && item.generatedPdfPath ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={downloadingId === item.id}
                      onClick={() => void handleDownload(item.id)}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Karta urlopowa
                    </Button>
                  ) : null}
                  {item.status === "pending" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cancellingId === item.id}
                      onClick={() => void handleCancel(item.id)}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Wycofaj
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
