"use client";

import { useCallback, useEffect, useState } from "react";
import type { RaportFirmyPayload } from "@/lib/report-kpi/types";

type State = {
  data: RaportFirmyPayload | null;
  isLoading: boolean;
  error: string | null;
};

export function useRaportFirmyData() {
  const [state, setState] = useState<State>({ data: null, isLoading: true, error: null });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/raport-firmy", { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Nie udało się wczytać raportu firmowego.");
      }
      setState({ data: payload as RaportFirmyPayload, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Nie udało się wczytać raportu firmowego.",
      });
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...state, refetch };
}
