"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { createXpRedemptionAdmin, fetchXpSettings } from "@/lib/supabase/xp-repository";
import type { XpRedemption } from "@/lib/xp/types";

export function XpRedemptionForm({
  employeeId,
  totalPoints,
  onCreated,
}: {
  employeeId: string;
  totalPoints: number;
  onCreated: (redemption: XpRedemption) => void;
}) {
  const [pointWeightPln, setPointWeightPln] = useState(0.5);
  const [suggestedMaxAmountPln, setSuggestedMaxAmountPln] = useState(500);
  const [suggestedFrequencyLabel, setSuggestedFrequencyLabel] = useState("");
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [amount, setAmount] = useState(0);
  const [amountTouched, setAmountTouched] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchXpSettings().then((settings) => {
      setPointWeightPln(settings.pointWeightPln);
      setSuggestedMaxAmountPln(settings.suggestedMaxAmountPln);
      setSuggestedFrequencyLabel(settings.suggestedFrequencyLabel);
    });
  }, []);

  useEffect(() => {
    if (!amountTouched) {
      setAmount(Math.round(pointsRedeemed * pointWeightPln * 100) / 100);
    }
  }, [pointsRedeemed, pointWeightPln, amountTouched]);

  const exceedsMax = amount > suggestedMaxAmountPln;

  async function handleSubmit() {
    if (pointsRedeemed <= 0) {
      setError("Podaj liczbę punktów do wymiany.");
      return;
    }
    if (pointsRedeemed > totalPoints) {
      setError("Pracownik nie ma tylu punktów na koncie.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const redemption = await createXpRedemptionAdmin(employeeId, { pointsRedeemed, amount, note: note.trim() });
      onCreated(redemption);
      setPointsRedeemed(0);
      setAmount(0);
      setAmountTouched(false);
      setNote("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się utworzyć wymiany.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <p className="text-sm font-semibold text-foreground">Nowa wymiana punktów na premię</p>
        <p className="text-xs text-muted">
          Saldo pracownika: {totalPoints} pkt. Sugerowana częstotliwość: {suggestedFrequencyLabel || "—"}.
          Sugerowana maks. kwota: {suggestedMaxAmountPln} zł (waga: {pointWeightPln} zł/pkt).
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Punkty do wymiany">
            <NumericInput value={pointsRedeemed} onChange={setPointsRedeemed} decimals={false} placeholder="0" />
          </Field>
          <Field label="Kwota (zł)">
            <NumericInput
              value={amount}
              onChange={(value) => {
                setAmount(value);
                setAmountTouched(true);
              }}
              placeholder="0"
            />
          </Field>
        </div>

        {exceedsMax ? (
          <p className="text-xs text-amber-400">
            Kwota przekracza sugerowaną maks. wartość ({suggestedMaxAmountPln} zł) — nadal można zapisać,
            to tylko wskazówka.
          </p>
        ) : null}

        <Field label="Notatka (z rozmowy z pracownikiem)">
          <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Button type="button" disabled={saving} onClick={() => void handleSubmit()} className="w-fit">
          {saving ? "Zapisywanie…" : "Zapisz wymianę"}
        </Button>
      </CardContent>
    </Card>
  );
}
