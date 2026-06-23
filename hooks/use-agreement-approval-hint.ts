"use client";

import { useEffect, useState } from "react";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { getAgreementAcceptanceHint } from "@/lib/dashboard/agreement-types";
import { fetchAgreementApprovalProgressHint } from "@/lib/supabase/project-agreement-collaboration-repository";

export function useAgreementApprovalHint(agreement: ProjectClientAgreement): string | null {
  const fallbackHint = getAgreementAcceptanceHint(agreement);
  const [hint, setHint] = useState<string | null>(fallbackHint);

  useEffect(() => {
    if (agreement.status !== "pending_client" || !agreement.activeVersionId) {
      setHint(null);
      return;
    }

    let cancelled = false;
    setHint(fallbackHint);

    void fetchAgreementApprovalProgressHint(agreement.id)
      .then((nextHint) => {
        if (!cancelled) {
          setHint(nextHint ?? fallbackHint);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHint(fallbackHint);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    agreement.activeVersionId,
    agreement.id,
    agreement.status,
    agreement.updatedAt,
    fallbackHint,
  ]);

  return hint;
}
