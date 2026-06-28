"use client";

import { useEffect, useState } from "react";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { AgreementCollaborationBundle } from "@/lib/dashboard/agreement-collaboration-types";
import type { AgreementApprovalStatus } from "@/lib/dashboard/agreement-collaboration-types";
import { fetchAgreementCollaboration } from "@/lib/supabase/project-agreement-collaboration-repository";

export type AgreementApprovalResponseView = {
  roleLabel: string;
  status: AgreementApprovalStatus | "—";
  respondedByName: string | null;
  respondedAt: string | null;
  responseNote: string | null;
};

function mapLegacyClientResponse(
  agreement: Pick<
    ProjectClientAgreement,
    "clientResponseNote" | "clientResponseName" | "clientRespondedAt"
  >,
): AgreementApprovalResponseView[] {
  if (!agreement.clientResponseNote?.trim()) {
    return [];
  }

  return [
    {
      roleLabel: "Klient",
      status: "accepted",
      respondedByName: agreement.clientResponseName,
      respondedAt: agreement.clientRespondedAt,
      responseNote: agreement.clientResponseNote,
    },
  ];
}

function mapCollaborationResponses(
  roles: AgreementCollaborationBundle["roles"],
  approvals: AgreementCollaborationBundle["approvals"],
  phase: "awaiting_approvals" | "other",
  options?: { includePending?: boolean },
): AgreementApprovalResponseView[] {
  const mapped: AgreementApprovalResponseView[] = roles.map((role) => {
    const approval = approvals.find((entry) => entry.roleId === role.id);
    const status = approval?.status ?? (phase === "awaiting_approvals" ? "pending" : "—");

    return {
      roleLabel: role.label,
      status,
      respondedByName: approval?.respondedByName ?? null,
      respondedAt: approval?.respondedAt ?? null,
      responseNote: approval?.responseNote ?? null,
    };
  });

  if (options?.includePending) {
    return mapped;
  }

  return mapped.filter(
    (entry) =>
      entry.responseNote?.trim() ||
      entry.status === "accepted" ||
      entry.status === "rejected",
  );
}

export function buildAgreementApprovalResponsesFromBundle(
  bundle: AgreementCollaborationBundle,
  options?: { includePending?: boolean },
): AgreementApprovalResponseView[] {
  const phase = bundle.agreement.status === "pending_client" ? "awaiting_approvals" : "other";
  return mapCollaborationResponses(bundle.roles, bundle.approvals, phase, options);
}

function mapCollaborationResponsesFromFetch(
  roles: Awaited<ReturnType<typeof fetchAgreementCollaboration>>["roles"],
  approvals: Awaited<ReturnType<typeof fetchAgreementCollaboration>>["approvals"],
  phase: "awaiting_approvals" | "other",
): AgreementApprovalResponseView[] {
  return mapCollaborationResponses(roles, approvals, phase);
}

export function useAgreementApprovalResponses(
  agreement: Pick<
    ProjectClientAgreement,
    | "id"
    | "activeVersionId"
    | "status"
    | "updatedAt"
    | "clientResponseNote"
    | "clientResponseName"
    | "clientRespondedAt"
  >,
) {
  const [responses, setResponses] = useState<AgreementApprovalResponseView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agreement.activeVersionId) {
      setResponses(mapLegacyClientResponse(agreement));
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchAgreementCollaboration(agreement.id)
      .then((bundle) => {
        if (cancelled) {
          return;
        }

        const phase = bundle.agreement.status === "pending_client" ? "awaiting_approvals" : "other";
        setResponses(mapCollaborationResponsesFromFetch(bundle.roles, bundle.approvals, phase));
      })
      .catch(() => {
        if (!cancelled) {
          setResponses(mapLegacyClientResponse(agreement));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    agreement.activeVersionId,
    agreement.clientRespondedAt,
    agreement.clientResponseName,
    agreement.clientResponseNote,
    agreement.id,
    agreement.status,
    agreement.updatedAt,
  ]);

  return { responses, loading };
}
