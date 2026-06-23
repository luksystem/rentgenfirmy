import type {
  AgreementActionPendingCounts,
  AgreementHubEntry,
  AgreementHubSnapshot,
} from "@/lib/dashboard/agreement-hub-types";
import { EMPTY_AGREEMENT_ACTION_PENDING_COUNTS } from "@/lib/dashboard/agreement-hub-types";
import type { ProjectAgreementStatus } from "@/lib/dashboard/agreement-types";
import { isTeamApproverRole } from "@/lib/dashboard/agreement-collaboration-types";
import { rowToAgreement } from "@/lib/supabase/project-agreement-collaboration-repository";
import { getSupabase } from "@/lib/supabase/client";

type AgreementRow = Parameters<typeof rowToAgreement>[0];

type AgreementWithProjectRow = AgreementRow & {
  projects: { id: string; name: string; client_id: string | null } | null;
};

const EMPTY_COUNTS: Record<ProjectAgreementStatus, number> = {
  draft: 0,
  pending_client: 0,
  accepted: 0,
  rejected: 0,
  cancelled: 0,
};

let cachedSnapshot: AgreementHubSnapshot | null = null;
let snapshotLoadPromise: Promise<AgreementHubSnapshot> | null = null;
let cachedPendingCounts: AgreementActionPendingCounts | null = null;
let pendingCountsLoadPromise: Promise<AgreementActionPendingCounts> | null = null;

export function invalidateAgreementHubCache() {
  cachedSnapshot = null;
  snapshotLoadPromise = null;
  cachedPendingCounts = null;
  pendingCountsLoadPromise = null;
}

async function loadAgreementHubSnapshotFromDb(): Promise<AgreementHubSnapshot> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .select(
      `
      *,
      projects:project_id (
        id,
        name,
        client_id
      )
    `,
    )
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AgreementWithProjectRow[];
  const clientIds = [
    ...new Set(
      rows
        .map((row) => row.projects?.client_id)
        .filter((clientId): clientId is string => Boolean(clientId)),
    ),
  ];

  const clientNames = new Map<string, string>();
  if (clientIds.length) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, full_name")
      .in("id", clientIds);

    if (clientsError) {
      throw new Error(clientsError.message);
    }

    for (const client of clients ?? []) {
      clientNames.set(client.id as string, (client.full_name as string)?.trim() || "Klient");
    }
  }

  const countsByStatus: Record<ProjectAgreementStatus, number> = { ...EMPTY_COUNTS };
  const entries: AgreementHubEntry[] = rows.map((row) => {
    const agreement = rowToAgreement(row);
    countsByStatus[agreement.status] += 1;
    const project = row.projects;
    const clientId = project?.client_id ?? null;

    return {
      agreement,
      projectId: project?.id ?? agreement.projectId,
      projectName: project?.name?.trim() || "Projekt",
      clientId,
      clientName: clientId ? (clientNames.get(clientId) ?? "Klient") : "Bez klienta",
    };
  });

  return { entries, countsByStatus };
}

export async function fetchAgreementHubSnapshot(options?: { force?: boolean }) {
  const force = options?.force ?? false;

  if (cachedSnapshot && !force) {
    return cachedSnapshot;
  }

  if (snapshotLoadPromise && !force) {
    return snapshotLoadPromise;
  }

  if (force) {
    invalidateAgreementHubCache();
  }

  snapshotLoadPromise = loadAgreementHubSnapshotFromDb()
    .then((snapshot) => {
      cachedSnapshot = snapshot;
      return snapshot;
    })
    .finally(() => {
      snapshotLoadPromise = null;
    });

  return snapshotLoadPromise;
}

type PendingAgreementRow = {
  id: string;
  active_version_id: string;
};

type ApproverRoleRow = {
  id: string;
  agreement_id: string;
  is_required: boolean;
  is_client_role: boolean;
  is_team_role: boolean;
  label: string;
};

type ApprovalRow = {
  version_id: string;
  role_id: string;
  status: string;
};

async function loadAgreementActionPendingCountsFromDb(): Promise<AgreementActionPendingCounts> {
  const supabase = getSupabase();
  const { data: agreements, error: agreementsError } = await supabase
    .from("project_client_agreements")
    .select("id, active_version_id")
    .eq("status", "pending_client")
    .not("active_version_id", "is", null);

  if (agreementsError) {
    throw new Error(agreementsError.message);
  }

  const pendingRows = (agreements ?? []) as PendingAgreementRow[];
  if (!pendingRows.length) {
    return { ...EMPTY_AGREEMENT_ACTION_PENDING_COUNTS };
  }

  const agreementIds = pendingRows.map((row) => row.id);
  const versionIds = pendingRows.map((row) => row.active_version_id);

  const [{ data: roles, error: rolesError }, { data: approvals, error: approvalsError }] =
    await Promise.all([
      supabase
        .from("project_agreement_approver_roles")
        .select("id, agreement_id, is_required, is_client_role, is_team_role, label")
        .in("agreement_id", agreementIds),
      supabase
        .from("project_agreement_approvals")
        .select("version_id, role_id, status")
        .in("version_id", versionIds),
    ]);

  if (rolesError) {
    throw new Error(rolesError.message);
  }
  if (approvalsError) {
    throw new Error(approvalsError.message);
  }

  const rolesByAgreement = new Map<string, ApproverRoleRow[]>();
  for (const role of (roles ?? []) as ApproverRoleRow[]) {
    const list = rolesByAgreement.get(role.agreement_id) ?? [];
    list.push(role);
    rolesByAgreement.set(role.agreement_id, list);
  }

  const approvalsByVersion = new Map<string, ApprovalRow[]>();
  for (const approval of (approvals ?? []) as ApprovalRow[]) {
    const list = approvalsByVersion.get(approval.version_id) ?? [];
    list.push(approval);
    approvalsByVersion.set(approval.version_id, list);
  }

  let pendingTeamApproval = 0;
  let pendingClientApproval = 0;
  let pendingOtherApproval = 0;

  for (const agreement of pendingRows) {
    const agreementRoles = rolesByAgreement.get(agreement.id) ?? [];
    const versionApprovals = approvalsByVersion.get(agreement.active_version_id) ?? [];
    const approvalByRoleId = new Map(versionApprovals.map((entry) => [entry.role_id, entry.status]));

    let teamPending = false;
    let clientPending = false;
    let otherPending = false;

    for (const role of agreementRoles) {
      if (!role.is_required) {
        continue;
      }
      const status = approvalByRoleId.get(role.id) ?? "pending";
      if (status !== "pending") {
        continue;
      }

      const roleView = {
        label: role.label,
        isClientRole: role.is_client_role,
        isTeamRole: role.is_team_role,
      };

      if (isTeamApproverRole(roleView)) {
        teamPending = true;
      } else if (role.is_client_role) {
        clientPending = true;
      } else {
        otherPending = true;
      }
    }

    if (teamPending) {
      pendingTeamApproval += 1;
    }
    if (clientPending) {
      pendingClientApproval += 1;
    }
    if (otherPending) {
      pendingOtherApproval += 1;
    }
  }

  return {
    pendingAgreements: pendingRows.length,
    pendingTeamApproval,
    pendingClientApproval,
    pendingOtherApproval,
  };
}

export async function fetchAgreementActionPendingCounts(options?: { force?: boolean }) {
  const force = options?.force ?? false;

  if (cachedPendingCounts && !force) {
    return cachedPendingCounts;
  }

  if (pendingCountsLoadPromise && !force) {
    return pendingCountsLoadPromise;
  }

  if (force) {
    cachedPendingCounts = null;
  }

  pendingCountsLoadPromise = loadAgreementActionPendingCountsFromDb()
    .then((counts) => {
      cachedPendingCounts = counts;
      return counts;
    })
    .finally(() => {
      pendingCountsLoadPromise = null;
    });

  return pendingCountsLoadPromise;
}
