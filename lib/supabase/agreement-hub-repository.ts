import type { AgreementHubEntry, AgreementHubSnapshot } from "@/lib/dashboard/agreement-hub-types";
import type { ProjectAgreementStatus } from "@/lib/dashboard/agreement-types";
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

export function invalidateAgreementHubCache() {
  cachedSnapshot = null;
  snapshotLoadPromise = null;
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
