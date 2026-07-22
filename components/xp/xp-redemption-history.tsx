"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { markXpRedemptionPaidAdmin } from "@/lib/supabase/xp-repository";
import type { XpRedemption } from "@/lib/xp/types";

export function XpRedemptionHistory({
  employeeId,
  redemptions,
  onChange,
}: {
  employeeId: string;
  redemptions: XpRedemption[];
  onChange: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleMarkPaid(redemptionId: string) {
    setBusyId(redemptionId);
    try {
      await markXpRedemptionPaidAdmin(employeeId, redemptionId);
      onChange();
    } catch {
      // Nie udało się — admin może spróbować ponownie.
    } finally {
      setBusyId(null);
    }
  }

  const totalPaid = redemptions.filter((r) => r.isPaid).reduce((sum, r) => sum + r.amount, 0);
  const totalPending = redemptions.filter((r) => !r.isPaid).reduce((sum, r) => sum + r.amount, 0);

  return (
    <Card>
      <CardContent className="grid gap-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Historia wymian</p>
          <p className="text-xs text-muted">
            Wypłacone: {totalPaid.toFixed(2)} zł · Do wypłaty: {totalPending.toFixed(2)} zł
          </p>
        </div>

        {redemptions.length === 0 ? (
          <p className="text-sm text-muted">Brak wymian.</p>
        ) : (
          <ul className="grid gap-2">
            {redemptions.map((redemption) => (
              <li
                key={redemption.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-foreground/90">
                    {redemption.pointsRedeemed} pkt → {redemption.amount.toFixed(2)} zł
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(redemption.createdAt)}
                    {redemption.note ? ` · ${redemption.note}` : ""}
                  </p>
                </div>
                {redemption.isPaid ? (
                  <Badge tone="active">Wypłacone</Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === redemption.id}
                    onClick={() => void handleMarkPaid(redemption.id)}
                  >
                    Oznacz jako wypłacone
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
