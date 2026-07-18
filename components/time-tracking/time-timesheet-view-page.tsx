"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { TimePeriodEmployeeSummaryTable } from "@/components/time-tracking/time-period-employee-summary-table";
import { TimeEmployeeProjectBreakdown } from "@/components/time-tracking/time-employee-project-breakdown";
import { TimePeriodReport } from "@/components/time-tracking/time-period-report";
import { TimePeriodBalanceCard } from "@/components/time-tracking/time-period-balance-card";
import { TimeTeamPeriodMatrix } from "@/components/time-tracking/time-team-period-matrix";
import { TimeTimesheetApprovalPanel } from "@/components/time-tracking/time-timesheet-approval-panel";
import { TimeTimesheetPanel } from "@/components/time-tracking/time-timesheet-panel";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import {
  formatTimesheetPeriodLabel,
  resolveTimesheetPeriod,
  shiftTimesheetPeriod,
} from "@/lib/time-tracking/timesheet-period";
import { TIMESHEET_PERIOD_LABELS, type TimesheetPeriodType } from "@/lib/time-tracking/types";
import { fetchTeamProfiles, profileToOptionLabel } from "@/lib/supabase/profile-repository";
import { useAuthStore } from "@/store/auth-store";
import { useCanViewTeamTimeEntries, useTimeTrackingStore } from "@/store/time-tracking-store";
import type { UserProfile } from "@/lib/auth/types";

export function TimeTimesheetViewPage() {
  const profile = useAuthStore((state) => state.profile);
  const role = profile?.role;
  const canManageTeam = useCanViewTeamTimeEntries(role);

  const timesheetPeriod = useTimeTrackingStore((state) => state.timesheetPeriod);
  const timesheetUserId = useTimeTrackingStore((state) => state.timesheetUserId);
  const summary = useTimeTrackingStore((state) => state.summary);
  const summaryHydrated = useTimeTrackingStore((state) => state.summaryHydrated);
  const summaryLoading = useTimeTrackingStore((state) => state.summaryLoading);
  const teamPeriodDetail = useTimeTrackingStore((state) => state.teamPeriodDetail);
  const teamPeriodDetailLoading = useTimeTrackingStore((state) => state.teamPeriodDetailLoading);
  const ensureMeta = useTimeTrackingStore((state) => state.ensureMeta);
  const ensureTimesheetSummary = useTimeTrackingStore((state) => state.ensureTimesheetSummary);
  const ensureTeamPeriodDetail = useTimeTrackingStore((state) => state.ensureTeamPeriodDetail);
  const setTimesheetPeriod = useTimeTrackingStore((state) => state.setTimesheetPeriod);
  const setTimesheetUserId = useTimeTrackingStore((state) => state.setTimesheetUserId);
  const submitSummaryTimesheet = useTimeTrackingStore((state) => state.submitSummaryTimesheet);
  const approveTimesheetById = useTimeTrackingStore((state) => state.approveTimesheetById);
  const rejectTimesheetById = useTimeTrackingStore((state) => state.rejectTimesheetById);

  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);

  const viewingSelf = !timesheetUserId || timesheetUserId === profile?.id;
  const periodLabel = formatTimesheetPeriodLabel(timesheetPeriod);

  const pendingForSelected = useMemo(() => {
    if (!summary?.timesheet || summary.timesheet.status !== "submitted" || viewingSelf) {
      return [];
    }
    return [summary.timesheet];
  }, [summary?.timesheet, viewingSelf]);

  useEffect(() => {
    void ensureMeta();
    void ensureTimesheetSummary();
    if (canManageTeam) {
      void ensureTeamPeriodDetail();
      void fetchTeamProfiles()
        .then(setTeamProfiles)
        .catch(() => setTeamProfiles([]));
    }
  }, [ensureMeta, ensureTimesheetSummary, ensureTeamPeriodDetail, canManageTeam]);

  useEffect(() => {
    void ensureTimesheetSummary({ force: true, showLoading: false });
    if (canManageTeam) {
      void ensureTeamPeriodDetail({ force: true, showLoading: false });
    }
  }, [
    timesheetPeriod.dateFrom,
    timesheetPeriod.dateTo,
    timesheetPeriod.periodType,
    timesheetUserId,
    ensureTimesheetSummary,
    ensureTeamPeriodDetail,
    canManageTeam,
  ]);

  function setPeriodType(periodType: TimesheetPeriodType) {
    setTimesheetPeriod(resolveTimesheetPeriod(periodType));
  }

  function jumpToCurrentPeriod() {
    setTimesheetPeriod(resolveTimesheetPeriod(timesheetPeriod.periodType));
  }

  const totalMinutes = summary?.report.totalMinutes ?? 0;
  const entryCount = summary?.report.entryCount ?? 0;
  const reportTitle =
    timesheetPeriod.periodType === "month" ? "Raport miesiąca" : "Raport tygodnia";

  return (
    <>
      <PageHeader
        eyebrow="Moja praca"
        title="Arkusz czasu"
        description="Zestawienia czasu pracy per pracownik i okres — tydzień lub miesiąc."
        action={
          <Button variant="outline" asChild>
            <Link href="/moja-praca/czas-pracy">Ewidencja wpisów</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
              <Field label="Okres">
                <Select
                  value={timesheetPeriod.periodType}
                  onChange={(event) => setPeriodType(event.target.value as TimesheetPeriodType)}
                >
                  {Object.entries(TIMESHEET_PERIOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              {canManageTeam ? (
                <Field label="Pracownik">
                  <Select
                    value={timesheetUserId ?? profile?.id ?? ""}
                    onChange={(event) => {
                      const nextUserId = event.target.value;
                      if (nextUserId === profile?.id) {
                        setTimesheetUserId(undefined);
                      } else {
                        setTimesheetUserId(nextUserId);
                      }
                    }}
                  >
                    {teamProfiles.map((member) => (
                      <option key={member.id} value={member.id}>
                        {profileToOptionLabel(member)}
                        {member.id === profile?.id ? " (ja)" : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm font-medium text-foreground">{periodLabel}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTimesheetPeriod(shiftTimesheetPeriod(timesheetPeriod, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={jumpToCurrentPeriod}>
                  Bieżący {TIMESHEET_PERIOD_LABELS[timesheetPeriod.periodType].toLowerCase()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTimesheetPeriod(shiftTimesheetPeriod(timesheetPeriod, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:max-w-xs">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted">Suma okresu</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatDurationMinutes(totalMinutes)}
            </p>
            <p className="mt-1 text-xs text-muted">{entryCount} wpisów</p>
          </CardContent>
        </Card>
      </div>

      {summaryLoading && !summaryHydrated ? (
        <p className="mb-6 text-sm text-muted">Wczytywanie zestawienia…</p>
      ) : (
        <div className="mb-6 grid gap-4">
          {viewingSelf && summary?.timesheet ? (
            <TimeTimesheetPanel
              timesheet={summary.timesheet}
              loading={summaryLoading}
              onSubmit={async (employeeComment) => {
                await submitSummaryTimesheet({ employeeComment });
              }}
            />
          ) : null}

          {!viewingSelf && pendingForSelected.length > 0 ? (
            <TimeTimesheetApprovalPanel
              timesheets={pendingForSelected}
              loading={summaryLoading}
              onApprove={async (id) => {
                await approveTimesheetById(id);
                await ensureTimesheetSummary({ force: true, showLoading: false });
              }}
              onReject={async (id, input) => {
                await rejectTimesheetById(id, input);
                await ensureTimesheetSummary({ force: true, showLoading: false });
              }}
            />
          ) : null}

          <TimePeriodBalanceCard balance={summary?.balance ?? null} periodType={timesheetPeriod.periodType} />
          <TimeEmployeeProjectBreakdown
            entries={summary?.entries ?? []}
            dateFrom={timesheetPeriod.dateFrom}
            dateTo={timesheetPeriod.dateTo}
          />
          <TimePeriodReport
            report={summary?.report ?? null}
            title={reportTitle}
            description={
              timesheetPeriod.periodType === "month"
                ? "Miesięczne podsumowanie wg kategorii i typów wpisów."
                : "Tygodniowe podsumowanie wg kategorii i typów wpisów."
            }
          />
        </div>
      )}

      {canManageTeam ? (
        <div className="grid gap-4">
          <TimeTeamPeriodMatrix
            detail={teamPeriodDetail}
            loading={teamPeriodDetailLoading}
            selectedUserId={timesheetUserId ?? profile?.id}
            onSelectEmployee={(userId) => {
              if (userId === profile?.id) {
                setTimesheetUserId(undefined);
              } else {
                setTimesheetUserId(userId);
              }
            }}
          />
          <TimePeriodEmployeeSummaryTable
            rows={teamPeriodDetail?.employees ?? []}
            periodLabel={periodLabel}
            selectedUserId={timesheetUserId ?? profile?.id}
            onSelectEmployee={(userId) => {
              if (userId === profile?.id) {
                setTimesheetUserId(undefined);
              } else {
                setTimesheetUserId(userId);
              }
            }}
          />
        </div>
      ) : summary ? (
        <TimePeriodEmployeeSummaryTable
          rows={[
            {
              userId: profile?.id ?? "",
              userDisplayName: profile?.firstName
                ? `${profile.firstName} ${profile.lastName}`.trim()
                : "Ja",
              status: summary.timesheet?.status,
              workMinutes: summary.report.workMinutes,
              absenceMinutes: summary.report.absenceMinutes,
              billableMinutes: summary.report.billableMinutes,
              totalMinutes: summary.report.totalMinutes,
              entryCount: summary.report.entryCount,
            },
          ]}
          periodLabel={periodLabel}
          showStatus={Boolean(summary.timesheet)}
        />
      ) : null}
    </>
  );
}
