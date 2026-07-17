"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type { WorkPeriodBalance } from "@/lib/time-tracking/period-balance";
import type { TimesheetPeriodType } from "@/lib/time-tracking/types";

function formatSignedMinutes(minutes: number): string {
  if (minutes === 0) {
    return formatDurationMinutes(0);
  }
  const prefix = minutes > 0 ? "+" : "−";
  return `${prefix}${formatDurationMinutes(Math.abs(minutes))}`;
}

export function TimePeriodBalanceCard({
  balance,
  periodType,
}: {
  balance: WorkPeriodBalance | null;
  periodType: TimesheetPeriodType;
}) {
  if (!balance) {
    return null;
  }

  const periodLabel = periodType === "month" ? "miesiąca" : "tygodnia";
  const normLabel = `${balance.workingDays} dni rob. × ${formatDurationMinutes(balance.dailyMinutesNorm)}`;

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Saldo czasu pracy</p>
          <p className="text-xs text-muted">
            Norma {periodLabel}: {normLabel} = {formatDurationMinutes(balance.expectedWorkMinutes)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Przepracowano</p>
            <p className="font-semibold text-foreground">
              {formatDurationMinutes(balance.actualWorkMinutes)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Norma okresu</p>
            <p className="font-semibold text-foreground">
              {formatDurationMinutes(balance.expectedWorkMinutes)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Nieobecności</p>
            <p className="font-semibold text-foreground">
              {formatDurationMinutes(balance.absenceMinutes)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Saldo (praca − norma)</p>
            <p
              className={
                balance.balanceMinutes >= 0
                  ? "font-semibold text-emerald-600 dark:text-emerald-400"
                  : "font-semibold text-rose-600 dark:text-rose-400"
              }
            >
              {formatSignedMinutes(balance.balanceMinutes)}
            </p>
          </div>
        </div>

        {balance.overtimeEntryMinutes > 0 || balance.overtimeBalanceMinutes > 0 ? (
          <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
            {balance.overtimeEntryMinutes > 0 ? (
              <p>
                Wpisy „Nadgodziny”:{" "}
                <span className="font-medium text-foreground">
                  {formatDurationMinutes(balance.overtimeEntryMinutes)}
                </span>
              </p>
            ) : null}
            {balance.overtimeBalanceMinutes > 0 ? (
              <p>
                Przekroczenie normy:{" "}
                <span className="font-medium text-foreground">
                  {formatDurationMinutes(balance.overtimeBalanceMinutes)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
