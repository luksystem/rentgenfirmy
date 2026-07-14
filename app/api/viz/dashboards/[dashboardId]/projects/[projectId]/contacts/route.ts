import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import type { ProjectContactInput } from "@/lib/viz/project-contact-types";
import {
  createProjectContact,
  deleteProjectContact,
  listContactsForPicker,
  listProjectContacts,
} from "@/lib/viz/viz-project-contacts-server";
import { listVizDashboardProjects } from "@/lib/supabase/viz-server";

type RouteContext = { params: Promise<{ dashboardId: string; projectId: string }> };

async function assertProjectInDashboard(dashboardId: string, projectId: string) {
  const projects = await listVizDashboardProjects(dashboardId);
  if (!projects.some((project) => project.projectId === projectId)) {
    throw new HttpError(404, "Sklep nie należy do tego dashboardu.");
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId, projectId } = await context.params;
    await assertProjectInDashboard(dashboardId, projectId);

    const url = new URL(request.url);
    if (url.searchParams.get("picker") === "1") {
      const contacts = await listContactsForPicker();
      return NextResponse.json({ contacts });
    }

    const items = await listProjectContacts(projectId);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania kontaktów." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId, projectId } = await context.params;
    await assertProjectInDashboard(dashboardId, projectId);

    const body = (await request.json()) as ProjectContactInput;
    if (!body.contactId && !body.displayName?.trim()) {
      return NextResponse.json(
        { error: "Wybierz kontakt z bazy lub podaj nazwę wyświetlaną." },
        { status: 400 },
      );
    }

    const item = await createProjectContact(projectId, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd dodawania kontaktu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId, projectId } = await context.params;
    await assertProjectInDashboard(dashboardId, projectId);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora powiązania." }, { status: 400 });
    }

    await deleteProjectContact(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania kontaktu." },
      { status: 500 },
    );
  }
}
