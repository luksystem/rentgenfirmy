import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import {
  listProjectIntegrationsForViz,
  listVizDashboardAccess,
  listVizDashboardProjects,
  listVizProjectSystemStatuses,
  listVizVariableMappings,
  upsertVizDashboardAccess,
  upsertVizDashboardProjects,
  upsertVizProjectSystemStatus,
  upsertVizVariableMapping,
  deleteVizDashboardAccess,
  deleteVizVariableMapping,
} from "@/lib/supabase/viz-server";
import {
  VIZ_ACCESS_ROLES,
  VIZ_SERVICE_CONTRACT_STATUSES,
  VIZ_SYSTEM_INTEGRATION_STATUSES,
  type VizDashboardAccessInput,
  type VizDashboardProjectInput,
  type VizProjectSystemStatusInput,
  type VizVariableMappingInput,
} from "@/lib/viz/types";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const url = new URL(request.url);
    const section = url.searchParams.get("section") ?? "projects";
    const projectId = url.searchParams.get("projectId")?.trim() || undefined;

    switch (section) {
      case "projects": {
        const projects = await listVizDashboardProjects(dashboardId);
        const { integrations, variables } = await listProjectIntegrationsForViz(
          projects.map((p) => p.projectId),
        );
        return NextResponse.json({ projects, integrations, variables });
      }
      case "mappings": {
        const mappings = await listVizVariableMappings(dashboardId, projectId);
        return NextResponse.json({ mappings });
      }
      case "systems": {
        const statuses = await listVizProjectSystemStatuses(dashboardId, projectId);
        return NextResponse.json({ statuses });
      }
      case "access": {
        const access = await listVizDashboardAccess(dashboardId);
        return NextResponse.json({ access });
      }
      default:
        return NextResponse.json({ error: "Nieznana sekcja." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania danych." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const body = (await request.json()) as {
      section: "projects" | "mapping" | "system" | "access";
      projects?: VizDashboardProjectInput[];
      mapping?: VizVariableMappingInput;
      system?: VizProjectSystemStatusInput;
      access?: VizDashboardAccessInput;
    };

    switch (body.section) {
      case "projects": {
        if (!body.projects?.length) {
          return NextResponse.json({ error: "Lista projektów jest wymagana." }, { status: 400 });
        }
        for (const project of body.projects) {
          if (
            project.serviceContractStatus &&
            !VIZ_SERVICE_CONTRACT_STATUSES.includes(project.serviceContractStatus)
          ) {
            return NextResponse.json({ error: "Nieprawidłowy status umowy." }, { status: 400 });
          }
        }
        const projects = await upsertVizDashboardProjects(dashboardId, body.projects);
        return NextResponse.json({ projects });
      }
      case "mapping": {
        if (!body.mapping) {
          return NextResponse.json({ error: "Mapowanie jest wymagane." }, { status: 400 });
        }
        const mapping = await upsertVizVariableMapping(dashboardId, body.mapping);
        return NextResponse.json({ mapping });
      }
      case "system": {
        if (!body.system) {
          return NextResponse.json({ error: "Status systemu jest wymagany." }, { status: 400 });
        }
        if (!VIZ_SYSTEM_INTEGRATION_STATUSES.includes(body.system.status)) {
          return NextResponse.json({ error: "Nieprawidłowy status integracji." }, { status: 400 });
        }
        const status = await upsertVizProjectSystemStatus(dashboardId, body.system);
        return NextResponse.json({ status });
      }
      case "access": {
        if (!body.access) {
          return NextResponse.json({ error: "Dostęp jest wymagany." }, { status: 400 });
        }
        if (!VIZ_ACCESS_ROLES.includes(body.access.accessRole)) {
          return NextResponse.json({ error: "Nieprawidłowa rola dostępu." }, { status: 400 });
        }
        const access = await upsertVizDashboardAccess(dashboardId, body.access);
        return NextResponse.json({ access });
      }
      default:
        return NextResponse.json({ error: "Nieznana sekcja." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const section = url.searchParams.get("section");
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora." }, { status: 400 });
    }

    if (section === "mapping") {
      await deleteVizVariableMapping(id);
    } else if (section === "access") {
      await deleteVizDashboardAccess(id);
    } else {
      return NextResponse.json({ error: "Nieznana sekcja." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania." },
      { status: 500 },
    );
  }
}
