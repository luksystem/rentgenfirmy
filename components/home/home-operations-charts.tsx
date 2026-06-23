"use client";

import { useEffect, useMemo, useState } from "react";
import { BarPanel, PiePanel } from "@/components/charts";
import { AGREEMENT_KANBAN_COLUMNS } from "@/lib/dashboard/agreement-hub-types";
import { countOpenKanbanTasks } from "@/lib/supabase/kanban-repository";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
import { useProcessStore } from "@/store/process-store";

export function HomeOperationsCharts() {
  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const kanbanNewTaskCount = useProcessStore((state) => state.kanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const agreementSnapshot = useAgreementHubStore((state) => state.snapshot);
  const ensureAgreementSnapshot = useAgreementHubStore((state) => state.ensureSnapshot);
  const [openKanbanTasks, setOpenKanbanTasks] = useState(0);

  useEffect(() => {
    void refreshKanbanOverdueTaskCount();
    void refreshKanbanNewTaskCount();
    void ensureAgreementSnapshot();
    void countOpenKanbanTasks()
      .then(setOpenKanbanTasks)
      .catch(() => setOpenKanbanTasks(0));
  }, [ensureAgreementSnapshot, refreshKanbanNewTaskCount, refreshKanbanOverdueTaskCount]);

  const kanbanChartData = useMemo(() => {
    const onTimeOpen = Math.max(openKanbanTasks - kanbanOverdueTaskCount, 0);
    return [
      { name: "Po terminie", value: kanbanOverdueTaskCount },
      { name: "Nowe od klienta", value: kanbanNewTaskCount },
      { name: "Otwarte w terminie", value: onTimeOpen },
    ].filter((entry) => entry.value > 0);
  }, [kanbanNewTaskCount, kanbanOverdueTaskCount, openKanbanTasks]);

  const agreementChartData = useMemo(() => {
    const counts = agreementSnapshot?.countsByStatus;
    if (!counts) {
      return [];
    }

    return AGREEMENT_KANBAN_COLUMNS.map((column) => {
      const value = column.statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
      return { name: column.label, value };
    }).filter((entry) => entry.value > 0);
  }, [agreementSnapshot?.countsByStatus]);

  return (
    <section className="mt-4 grid gap-4 sm:mt-6 xl:grid-cols-2">
      <BarPanel title="Taski wdrożeniowe (Kanban)" data={kanbanChartData} />
      <PiePanel title="Ustalenia wg statusu" data={agreementChartData} />
    </section>
  );
}
