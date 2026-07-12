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
import { CreateWorkItemDialog } from "@/components/my-work/manager/create-work-item-dialog";
import { filterWorkItems } from "@/lib/my-work/section-filters";
import { defaultStatusForKanbanColumn, type KanbanColumnGroupId } from "@/lib/my-work/state-machine";
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
  const startItem = useMyWorkStore((state) => state.startItem);
  const verifyItem = useMyWorkStore((state) => state.verifyItem);
  const sendItem = useMyWorkStore((state) => state.sendItem);
  const commentOnItem = useMyWorkStore((state) => state.commentOnItem);
  const moveItemStatus = useMyWorkStore((state) => state.moveItemStatus);
  const loadTeamProfiles = useMyWorkStore((state) => state.loadTeamProfiles);
  const teamProfiles = useMyWorkStore((state) => state.teamProfiles);

  const [detailOpen, setDetailOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [teamView, setTeamView] = useState(false);

  useEffect(() => {
    void ensureMyItems();
    if (canManage) {
      void ensureTeamItems();
      void loadTeamProfiles();
    }
  }, [ensureMyItems, ensureTeamItems, canManage, loadTeamProfiles]);

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

  const loading = myItemsLoading && !myItemsHydrated;

  return (
    <>
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
        <Button variant="secondary" size="sm" onClick={() => void ensureMyItems({ force: true })}>
          Odśwież
        </Button>
      </div>

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
        <MyWorkListView items={filteredItems} onOpenItem={(id) => void openItem(id)} />
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

      {detailLoading ? null : null}
    </>
  );
}
