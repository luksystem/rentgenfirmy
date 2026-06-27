import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  parseDashboardSessionValue,
  DASHBOARD_PUBLIC_SESSION_COOKIE,
} from "@/lib/dashboard/dashboard-session";
import type { ProjectAgreementInput } from "@/lib/dashboard/agreement-types";
import { normalizeProjectAgreementInput } from "@/lib/dashboard/agreement-types";
import { getAgreementPublicUrl } from "@/lib/dashboard/agreement-collaboration-types";
import {
  fetchDashboardPublicMeta,
  fetchPublicDashboardPayload,
} from "@/lib/supabase/public-dashboard-server";
import {
  createDefaultClientRole,
  rowToAgreement,
  setAgreementPublicEnabled,
} from "@/lib/supabase/project-agreement-collaboration-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";

async function assertPublicDashboardAccess(token: string) {
  const meta = await fetchDashboardPublicMeta(token);
  if (!meta) {
    return { ok: false as const, status: 404, error: "Nie znaleziono dashboardu klienta." };
  }

  if (meta.access.authRequired) {
    const cookieStore = await cookies();
    const session = parseDashboardSessionValue(
      cookieStore.get(DASHBOARD_PUBLIC_SESSION_COOKIE)?.value,
    );
    if (!session || session.token !== token) {
      return { ok: false as const, status: 401, error: "Brak dostępu do dashboardu." };
    }
  }

  return { ok: true as const };
}

async function resolveProjectId(token: string, projectId: string | null) {
  if (!projectId) {
    return null;
  }
  const payload = await fetchPublicDashboardPayload(token, projectId);
  if (!payload || payload.initialProjectId !== projectId) {
    return null;
  }
  return payload.initialProjectId;
}

async function notifyTeamAboutClientAgreement(projectId: string, title: string, clientName: string) {
  const teamProfiles = await fetchTeamProfilesServer().catch(() => []);
  if (!teamProfiles.length) {
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("client_id, name")
    .eq("id", projectId)
    .maybeSingle();

  const clientId = projectRow?.client_id as string | null;
  const projectName = (projectRow?.name as string | undefined) ?? "Projekt";
  const linkUrl = clientId
    ? `/przestrzenie/klient/${clientId}?projectId=${encodeURIComponent(projectId)}&tab=agreements`
    : "/tablice-wdrozen/ustalenia";
  const now = new Date().toISOString();
  const sourceId = `agreement_client_created:${projectId}:${now.slice(0, 19)}`;

  const rows = teamProfiles.map((profile) => ({
    id: crypto.randomUUID(),
    profile_id: profile.id,
    kind: "agreement_client_created",
    title: `Nowe ustalenie od klienta: ${title}`,
    body: `${clientName} dodał ustalenie w projekcie „${projectName}".`,
    link_url: linkUrl,
    source_id: sourceId,
    created_at: now,
  }));

  await supabase.from("user_notifications").insert(rows);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const access = await assertPublicDashboardAccess(token);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    const resolvedProjectId = await resolveProjectId(token, projectId);
    if (!resolvedProjectId) {
      return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
    }

    const body = (await request.json()) as {
      input?: ProjectAgreementInput;
      authorName?: string;
      enablePublicLink?: boolean;
    };

    const normalized = normalizeProjectAgreementInput({
      title: "",
      body: "",
      category: "other",
      ...(body.input ?? {}),
    });
    if (!normalized.title.trim()) {
      return NextResponse.json({ error: "Tytuł ustalenia jest wymagany." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const authorName = body.authorName?.trim() || "Klient";

    const { data: lastRow } = await supabase
      .from("project_client_agreements")
      .select("position")
      .eq("project_id", resolvedProjectId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const position = ((lastRow as { position?: number } | null)?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from("project_client_agreements")
      .insert({
        id: crypto.randomUUID(),
        project_id: resolvedProjectId,
        title: normalized.title,
        body: normalized.body,
        category: normalized.category,
        status: "draft",
        proposed_cost_net: normalized.proposedCostNet ?? null,
        proposed_cost_gross: normalized.proposedCostGross ?? null,
        proposed_cost_vat_rate: normalized.proposedCostVatRate ?? null,
        cost_note: normalized.costNote?.trim() || null,
        proposed_warranty_end_date: normalized.proposedWarrantyEndDate,
        created_by_name: authorName,
        created_by_side: "client",
        position,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const agreement = rowToAgreement(data as Parameters<typeof rowToAgreement>[0]);
    await createDefaultClientRole(agreement.id);

    if (body.enablePublicLink !== false) {
      await setAgreementPublicEnabled(agreement.id, true);
    }

    const { data: refreshed } = await supabase
      .from("project_client_agreements")
      .select("*")
      .eq("id", agreement.id)
      .single();

    const saved = rowToAgreement(refreshed as Parameters<typeof rowToAgreement>[0]);
    await notifyTeamAboutClientAgreement(resolvedProjectId, saved.title, authorName).catch(
      () => undefined,
    );

    return NextResponse.json({
      agreement: saved,
      publicUrl: saved.publicToken ? getAgreementPublicUrl(saved.publicToken) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd tworzenia ustalenia." },
      { status: 500 },
    );
  }
}
