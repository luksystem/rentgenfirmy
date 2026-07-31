"use client";

import { useCallback, useEffect, useState } from "react";
import type { RaportFirmyPayload } from "@/lib/report-kpi/types";

type State = {
  data: RaportFirmyPayload | null;
  isLoading: boolean;
  error: string | null;
};

let cachedData: RaportFirmyPayload | null = null;
let inFlightPromise: Promise<RaportFirmyPayload> | null = null;

async function loadRaportFirmyData(): Promise<RaportFirmyPayload> {
  if (inFlightPromise) {
    return inFlightPromise;
  }
  inFlightPromise = (async () => {
    try {
      const response = await fetch("/api/raport-firmy", { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Nie udało się wczytać raportu firmowego.");
      }
      cachedData = payload as RaportFirmyPayload;
      return cachedData;
    } finally {
      inFlightPromise = null;
    }
  })();
  return inFlightPromise;
}

/** Kilka widżetów strony głównej może montować się naraz — dane są cache'owane i współdzielone,
 * żeby jeden wybór kilku kafelków nie odpalał kilku identycznych zapytań do /api/raport-firmy. */
export function useRaportFirmyData() {
  const [state, setState] = useState<State>({
    data: cachedData,
    isLoading: !cachedData,
    error: null,
  });

  const load = useCallback(async (force: boolean) => {
    if (!force && cachedData) {
      setState({ data: cachedData, isLoading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await loadRaportFirmyData();
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Nie udało się wczytać raportu firmowego.",
      });
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  return { ...state, refetch: () => load(true) };
}
