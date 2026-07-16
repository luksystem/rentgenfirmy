import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { generateProjectHealthSummary } from "@/lib/ai/project-health-summary";
import {
  fetchProjectHealthBundle,
  saveProjectHealthSnapshot,
} from "@/lib/supabase/project-health-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  let session: Awaited<ReturnType<typeof requireAuthenticatedProfile>>;
  try {
    session = await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Brak projectId." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id, name, stage")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) throw new Error(projectError.message);
    if (!project) {
      return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
    }

    const { data: processRow } = await admin
      .from("project_processes")
      .select("active_stage_id, template_snapshot")
      .eq("project_id", projectId)
      .maybeSingle();

    let stageTitle: string | null = project.stage ?? null;
    let processProgressPercent: number | null = null;

    if (processRow?.template_snapshot && typeof processRow.template_snapshot === "object") {
      const snapshot = processRow.template_snapshot as {
        stages?: Array<{ id: string; title: string; position?: number }>;
      };
      const stages = snapshot.stages ?? [];
      const active = stages.find((s) => s.id === processRow.active_stage_id);
      if (active?.title) stageTitle = active.title;
      if (stages.length > 0 && active) {
        const ordered = [...stages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const idx = ordered.findIndex((s) => s.id === active.id);
        if (idx >= 0) {
          processProgressPercent = Math.round(((idx + 1) / ordered.length) * 100);
        }
      }
    }

    const bundle = await fetchProjectHealthBundle({
      projectId,
      projectName: project.name,
      stageTitle,
      processProgressPercent,
    });

    const summaryMd = await generateProjectHealthSummary({
      projectName: bundle.projectName,
      stageTitle: bundle.stageTitle,
      processProgressPercent: bundle.processProgressPercent,
      score: bundle.score,
      band: bundle.band,
      sentiment: bundle.sentiment,
      signals: bundle.signals,
      goals: bundle.goals.map((g) => ({
        name: g.name,
        status: g.status,
        progressPercent: g.progressPercent,
        periodEnd: g.periodEnd,
        needsRevisit: g.needsRevisit,
        deferralCount: g.deferralCount,
      })),
      thread: bundle.thread,
    });

    const snapshot = await saveProjectHealthSnapshot({
      projectId,
      score: bundle.score,
      band: bundle.band,
      sentiment: bundle.sentiment,
      summaryMd,
      signals: bundle.signals,
      stageTitle: bundle.stageTitle,
      createdBy: session.profile.id,
    });

    return NextResponse.json({
      summary: summaryMd,
      snapshot,
      bundle: { ...bundle, latestSnapshot: snapshot },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nie udało się wygenerować zdrowia projektu.",
      },
      { status: 500 },
    );
  }
}
