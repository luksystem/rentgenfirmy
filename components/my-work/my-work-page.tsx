"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MyWorkListView } from "@/components/my-work/my-work-list-view";
import { MyWorkKanbanView } from "@/components/my-work/my-work-kanban-view";
import { MyWorkFilters } from "@/components/my-work/my-work-filters";
import { MyWorkDetailPanel } from "@/components/my-work/my-work-detail-panel";
import { MyWorkAcceptanceDialog } from "@/components/my-work/my-work-acceptance-dialog";
import { MyWorkCompleteDialog } from "@/components/my-work/my-work-complete-dialog";
import { MyWorkDayRhythm } from "@/components/my-work/my-work-day-rhythm";
import { MyWorkObstacleDialog } from "@/components/my-work/my-work-obstacle-dialog";
import { MyWorkWeekPlanPanel } from "@/components/my-work/my-work-week-plan-panel";
import { MyWorkPlansPoller } from "@/components/my-work/my-work-plans-poller";
import { CreateWorkItemDialog } from "@/components/my-work/manager/create-work-item-dialog";
import { EditWorkItemDialog } from "@/components/my-work/manager/edit-work-item-dialog";
import { filterWorkItems } from "@/lib/my-work/section-filters";
import { defaultStatusForKanbanColumn, type KanbanColumnGroupId } from "@/lib/my-work/state-machine";
import { isTerminalWorkItemStatus } from "@/lib/my-work/types";
import { weekRangeFromMonday } from "@/lib/my-work/week-range";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import { useAuthStore } from "@/store/auth-store";
import { useCanManageWorkItems, useMyWorkStore } from "@/store/my-work-store";

export function MyWorkPage() {
  const searchParams = useSearchParams();
  const profile = useAuthStore((state) => state.profile);
  const canManage = useCanManageWorkItems(profile?.role);

  const myItems = useMyWorkStore((state) => state.myItems);
  const myItemsHydrated = useMyWorkStore((state) => state.myItemsHydrated);
  const myItemsLoading = useMyWorkStore((state) => state.myItemsLoading);
  const teamItems = useMyWorkStore((state) => state.teamItems);
  const filters = useMyWorkStore((state) => state.filters);
  const viewMode = useMyWorkStore((state) => state.viewMode);
  const selectedDetail = useMyWorkStore((state) => state.selectedDetail);
  const detailLoading = useMyWorkStore((state) => state.detailLoading);

  const ensureMyItems = useMyWorkStore((state) => state.ensureMyItems);
  const ensureTeamItems = useMyWorkStore((state) => state.ensureTeamItems);
  const setFilters = useMyWorkStore((state) => state.setFilters);
  const setViewMode = useMyWorkStore((state) => state.setViewMode);
  const selectItem = useMyWorkStore((state) => state.selectItem);
  const acceptItem = useMyWorkStore((state) => state.acceptItem);
  const completeItem = useMyWorkStore((state) => state.completeItem);
  const completeAllocation = useMyWorkStore((state) => state.completeAllocation);
  const startItem = useMyWorkStore((state) => state.startItem);
  const verifyItem = useMyWorkStore((state) => state.verifyItem);
  const sendItem = useMyWorkStore((state) => state.sendItem);
  const commentOnItem = useMyWorkStore((state) => state.commentOnItem);
  const moveItemStatus = useMyWorkStore((state) => state.moveItemStatus);
  const loadTeamProfiles = useMyWorkStore((state) => state.loadTeamProfiles);
  const teamProfiles = useMyWorkStore((state) => state.teamProfiles);

  const dayContext = useMyWorkStore((state) => state.dayContext);
  const dayContextLoading = useMyWorkStore((state) => state.dayContextLoading);
  const ensureDayContext = useMyWorkStore((state) => state.ensureDayContext);
  const startDay = useMyWorkStore((state) => state.startDay);
  const endDay = useMyWorkStore((state) => state.endDay);

  const weekPlan = useMyWorkStore((state) => state.weekPlan);
  const ensureWeekPlan = useMyWorkStore((state) => state.ensureWeekPlan);
  const acknowledgeWeekPlanById = useMyWorkStore((state) => state.acknowledgeWeekPlanById);
  const sendWeekPlanById = useMyWorkStore((state) => state.sendWeekPlanById);
  const copyPreviousWeekPlan = useMyWorkStore((state) => state.copyPreviousWeekPlan);
  const createWeekPlanForUser = useMyWorkStore((state) => state.createWeekPlanForUser);
  const updateWeekPlanById = useMyWorkStore((state) => state.updateWeekPlanById);
  const reportObstacle = useMyWorkStore((state) => state.reportObstacle);
  const requestTakeover = useMyWorkStore((state) => state.requestTakeover);

  const [detailOpen, setDetailOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [obstacleOpen, setObstacleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [teamView, setTeamView] = useState(false);

  useEffect(() => {
    void ensureMyItems();
    void ensureDayContext();
    if (!canManage) {
      void ensureWeekPlan();
    }
    if (canManage) {
      void ensureTeamItems();
      void loadTeamProfiles();
    }
  }, [ensureMyItems, ensureTeamItems, ensureDayContext, ensureWeekPlan, canManage, loadTeamProfiles]);

  useEffect(() => {
    if (!teamView || !canManage) {
      return;
    }
    void ensureTeamItems({
      force: true,
      assignedUserId: filters.assignedUserId ?? undefined,
      showLoading: false,
    });
  }, [teamView, canManage, filters.assignedUserId, ensureTeamItems]);

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId) {
      void selectItem(itemId).then(() => setDetailOpen(true));
    }
  }, [searchParams, selectItem]);

  const sourceItems = teamView && canManage ? teamItems : myItems;

  const filteredItems = useMemo(
    () =>
      filterWorkItems(sourceItems, {
        ...filters,
        currentUserId: profile?.id ?? null,
      }),
    [sourceItems, filters, profile?.id],
  );

  const openItem = useCallback(
    async (id: string) => {
      await selectItem(id);
      setDetailOpen(true);
    },
    [selectItem],
  );

  const teamOptions = useMemo(
    () => teamProfiles.map((entry) => ({ id: entry.id, label: profileToOptionLabel(entry) })),
    [teamProfiles],
  );

  const weekPlanTasks = useMemo(() => {
    const assignedUserId = weekPlan?.assignedUserId;
    if (!assignedUserId) {
      return [];
    }
    return teamItems.filter((item) => item.assignedUserId === assignedUserId);
  }, [teamItems, weekPlan?.assignedUserId]);

  const loadWeekPlanForUser = useCallback(
    async (assignedUserId: string, referenceDate: string) => {
      await ensureWeekPlan({ force: true, assignedUserId, referenceDate });
    },
    [ensureWeekPlan],
  );

  const loading = myItemsLoading && !myItemsHydrated;

  async function handleCreateWeekDraft(assignedUserId: string, referenceDate: string) {
    const { from, to } = weekRangeFromMonday(referenceDate);
    const itemsForUser = (canManage ? teamItems : myItems).filter(
      (item) => item.assignedUserId === assignedUserId && !isTerminalWorkItemStatus(item.status),
    );
    await createWeekPlanForUser({
      assignedUserId,
      dateFrom: from,
      dateTo: to,
      items: itemsForUser.map((item, index) => ({
        workItemId: item.id,
        plannedDate: item.dueDate ?? item.plannedEnd ?? from,
        sortOrder: index * 10,
      })),
      sendImmediately: false,
    });
  }

  return (
    <>
      <MyWorkPlansPoller />
      <PageHeader
        eyebrow="Moja praca"
        title="Zadania"
        description="Twój osobisty pulpit operacyjny — zadania do przyjęcia, realizacji i rozliczenia."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? <CreateWorkItemDialog /> : null}
            {canManage ? (
              <Button
                variant={teamView ? "default" : "secondary"}
                size="sm"
                onClick={() => setTeamView((value) => !value)}
              >
                {teamView ? "Moje zadania" : "Zespół"}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "secondary"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="mr-1.5 h-4 w-4" />
            Lista
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "secondary"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Kanban
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (teamView && canManage) {
              void ensureTeamItems({ force: true, showLoading: false, sync: true });
            } else {
              void ensureMyItems({ force: true, showLoading: false, sync: true });
            }
          }}
        >
          Odśwież
        </Button>
      </div>

      <MyWorkDayRhythm
        context={dayContext}
        loading={dayContextLoading}
        onStartDay={async () => {
          await startDay();
        }}
        onEndDay={async (input) => {
          await endDay({
            employeeComment: input.employeeComment,
            carryOverUnfinished: input.carryOverUnfinished,
            aiDraft: input.aiDraft,
          });
        }}
        onOpenItem={(id) => void openItem(id)}
      />

      <MyWorkWeekPlanPanel
        plan={weekPlan}
        canManage={canManage}
        teamOptions={teamOptions}
        onAcknowledge={async (comment, riskNotes) => {
          if (!weekPlan) return;
          await acknowledgeWeekPlanById(weekPlan.id, { comment, riskNotes });
        }}
        onSend={async (planId) => {
          await sendWeekPlanById(planId);
        }}
        onCopyPrevious={async (assignedUserId, referenceDate) => {
          await copyPreviousWeekPlan(assignedUserId, referenceDate);
        }}
        onCreateDraft={handleCreateWeekDraft}
        onLoadForUser={loadWeekPlanForUser}
        onOpenItem={(id) => void openItem(id)}
        onUpdatePlan={async (planId, input) => {
          await updateWeekPlanById(planId, input);
        }}
        availableTasks={weekPlanTasks}
      />

      <div className="mb-6">
        <MyWorkFilters
          filters={filters}
          onChange={(patch) => setFilters(patch)}
          showTeamFilter={teamView && canManage}
          teamOptions={teamOptions}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Wczytywanie zadań…</p>
      ) : viewMode === "list" ? (
        <MyWorkListView
          items={filteredItems}
          onOpenItem={(id) => void openItem(id)}
          showVerificationSection={canManage}
        />
      ) : (
        <MyWorkKanbanView
          items={filteredItems}
          onOpenItem={(id) => void openItem(id)}
          onMoveItem={async (itemId, columnId) => {
            const status = defaultStatusForKanbanColumn(columnId as KanbanColumnGroupId);
            await moveItemStatus(itemId, status);
          }}
        />
      )}

      <MyWorkDetailPanel
        detail={selectedDetail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAccept={() => setAcceptOpen(true)}
        onComplete={() => setCompleteOpen(true)}
        onStart={async () => {
          if (selectedDetail) await startItem(selectedDetail.item.id);
        }}
        onVerify={async () => {
          if (selectedDetail) await verifyItem(selectedDetail.item.id);
        }}
        onSend={async () => {
          if (selectedDetail) await sendItem(selectedDetail.item.id);
        }}
        onComment={async (body) => {
          if (selectedDetail) await commentOnItem(selectedDetail.item.id, body);
        }}
        onReportObstacle={() => setObstacleOpen(true)}
        onEdit={() => {
          setDetailOpen(false);
          setEditOpen(true);
        }}
        onRequestTakeover={async () => {
          if (!selectedDetail) return;
          const comment = window.prompt("Opcjonalny komentarz do prośby o przejęcie:") ?? "";
          try {
            await requestTakeover(selectedDetail.item.id, comment || undefined);
            window.alert("Prośba o przejęcie została wysłana.");
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "Nie udało się wysłać prośby.");
          }
        }}
        onCompleteAllocation={async () => {
          if (!selectedDetail) return;
          try {
            await completeAllocation(selectedDetail.item.id);
            setDetailOpen(false);
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "Nie udało się zakończyć przydziału.");
          }
        }}
      />

      <MyWorkAcceptanceDialog
        item={selectedDetail?.item ?? null}
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        onSubmit={async (action, comment, withoutReservations) => {
          if (!selectedDetail) return;
          await acceptItem(selectedDetail.item.id, {
            action,
            comment,
            acceptedWithoutReservations: withoutReservations,
          });
          setDetailOpen(true);
        }}
      />

      <MyWorkCompleteDialog
        item={selectedDetail?.item ?? null}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        onSubmit={async (outcome, comment, workDescription) => {
          if (!selectedDetail) return;
          await completeItem(selectedDetail.item.id, {
            outcome,
            comment,
            workDescription,
          });
        }}
      />

      <MyWorkObstacleDialog
        item={selectedDetail?.item ?? null}
        open={obstacleOpen}
        onOpenChange={setObstacleOpen}
        onSubmit={async (obstacleType, description) => {
          if (!selectedDetail) return;
          await reportObstacle({
            workItemId: selectedDetail.item.id,
            projectId: selectedDetail.item.projectId,
            obstacleType,
            description,
          });
        }}
      />

      <EditWorkItemDialog
        item={selectedDetail?.item ?? null}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {detailLoading ? null : null}
    </>
  );
}
