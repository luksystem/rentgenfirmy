import { formatPartyName } from "@/lib/party/display-name";
import type { TradeCompanyWithProjects } from "@/lib/trades/company-types";
import { mergeTradeCompaniesWithProjects, projectTradeToCompanyItem } from "@/lib/trades/company-pool";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ProjectTradeRow = {
  name: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  project_id: string;
};

type ProjectRow = {
  id: string;
  name: string;
  client_id: string | null;
};

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export async function listTradeCompaniesFromProjects(): Promise<TradeCompanyWithProjects[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_trades")
    .select("name, company, contact_name, email, phone, description, project_id")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ProjectTradeRow[];
  if (!rows.length) {
    return [];
  }

  const projectIds = [...new Set(rows.map((row) => row.project_id))];
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .in("id", projectIds);

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const projectRows = (projects ?? []) as ProjectRow[];
  const projectMap = new Map(projectRows.map((project) => [project.id, project]));

  const clientIds = [
    ...new Set(projectRows.map((project) => project.client_id).filter((id): id is string => Boolean(id))),
  ];

  const clientMap = new Map<string, string>();
  if (clientIds.length) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);

    if (clientsError) {
      throw new Error(clientsError.message);
    }

    for (const client of (clients ?? []) as ClientRow[]) {
      clientMap.set(
        client.id,
        formatPartyName({
          firstName: client.first_name?.trim() ?? "",
          lastName: client.last_name?.trim() ?? "",
        }) || "Klient",
      );
    }
  }

  const pool: TradeCompanyWithProjects[] = [];

  for (const row of rows) {
    const item = projectTradeToCompanyItem({
      name: String(row.name),
      company: String(row.company ?? ""),
      contactName: row.contact_name ? String(row.contact_name) : undefined,
      email: row.email ? String(row.email) : undefined,
      phone: row.phone ? String(row.phone) : undefined,
      description: row.description ? String(row.description) : undefined,
    });
    if (!item) {
      continue;
    }

    const project = projectMap.get(row.project_id);
    const clientId = project?.client_id ?? "";
    pool.push({
      ...item,
      projects: [
        {
          projectId: row.project_id,
          projectName: project?.name?.trim() || "Projekt",
          clientId,
          clientName: clientId ? clientMap.get(clientId) ?? "Klient" : "Klient",
          contactName: row.contact_name?.trim() || undefined,
          email: row.email?.trim() || undefined,
          phone: row.phone?.trim() || undefined,
        },
      ],
    });
  }

  return mergeTradeCompaniesWithProjects(pool);
}
