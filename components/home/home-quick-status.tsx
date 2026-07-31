"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
import { useProcessStore } from "@/store/process-store";

/** Dwa najważniejsze operacyjne liczniki, wspólne dla lekkich stron głównych Admina i Managera. */
export function HomeQuickStatus() {
  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const agreementPendingCounts = useAgreementHubStore((state) => state.pendingCounts);
  const refreshAgreementPendingCounts = useAgreementHubStore((state) => state.refreshPendingCounts);
  const ensureAgreementSnapshot = useAgreementHubStore((state) => state.ensureSnapshot);
  const [pendingAgreementsTotal, setPendingAgreementsTotal] = useState(0);

  useEffect(() => {
    void refreshKanbanOverdueTaskCount();
    void refreshAgreementPendingCounts({ force: false });
    void ensureAgreementSnapshot().then((snapshot) => {
      setPendingAgreementsTotal(snapshot.countsByStatus.pending_client);
    });
  }, [ensureAgreementSnapshot, refreshAgreementPendingCounts, refreshKanbanOverdueTaskCount]);

  const unacceptedAgreements =
    agreementPendingCounts.pendingAgreements > 0
      ? agreementPendingCounts.pendingAgreements
      : pendingAgreementsTotal;

  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-4">
      <MetricCard
        label="Wdrożenia po terminie"
        value={kanbanOverdueTaskCount}
        tone="red"
        size="hero"
        href="/tablice-wdrozen/zbiorcza"
      />
      <MetricCard
        label="Ustalenia do akceptacji"
        value={unacceptedAgreements}
        tone="amber"
        size="hero"
        href="/tablice-wdrozen/ustalenia"
      />
    </section>
  );
}
