"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import {
  hasRemoteClientOfferChanges,
  isWaitingForClientResponse,
  mergeClientOfferFromRemote,
} from "@/lib/service/sync-client-offer-from-remote";
import type { ServiceRecord } from "@/lib/service/types";
import { useServiceStore } from "@/store/service-store";

export function useServiceDetailAutoRefresh(
  service: ServiceRecord,
  setService: Dispatch<SetStateAction<ServiceRecord>>,
) {
  const refresh = useServiceStore((state) => state.refresh);
  const getServiceById = useServiceStore((state) => state.getServiceById);
  const waitingForClient = isWaitingForClientResponse(service);

  const syncFromRemote = useCallback(async () => {
    await refresh();
    const remote = getServiceById(service.id);
    if (!remote) {
      return;
    }

    setService((current) => {
      if (!hasRemoteClientOfferChanges(current, remote)) {
        return current;
      }

      return mergeClientOfferFromRemote(current, remote);
    });
  }, [getServiceById, refresh, service.id, setService]);

  useListAutoRefresh(syncFromRemote, 30_000, waitingForClient);
}
