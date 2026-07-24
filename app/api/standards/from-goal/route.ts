import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PDCA_IMPROVEMENT_BOARD_KIND } from "@/lib/goals/types";
import { slugifyCompanyStandard } from "@/lib/standards/types";

type GoalRow = {
  id: string;
  board_id: string;
  name: string;
  description: string;
  methodology_fields: Record<string, unknown>;
  settlement_status: string | null;
  settlement_what_worked: string | null;
  settlement_conclusions: string | null;
};

function firstString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as { goalId?: string };
    const goalId = body.goalId?.trim();
    if (!goalId) {
      return NextResponse.json({ error: "Brak goalId." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: goalRow, error: goalError } = await admin
      .from("goals")
      .select("id, board_id, name, description, methodology_fields, settlement_status, settlement_what_worked, settlement_conclusions")
      .eq("id", goalId)
      .maybeSingle();
    if (goalError) {
      throw new Error(goalError.message);
    }
    if (!goalRow) {
      throw new HttpError(404, "Nie znaleziono celu.");
    }
    const goal = goalRow as GoalRow;

    if (goal.settlement_status !== "achieved") {
      throw new HttpError(400, "Standard można utworzyć tylko z celu rozliczonego jako osiągnięty.");
    }

    const { data: boardRow, error: boardError } = await admin
      .from("goal_boards")
      .select("kind")
      .eq("id", goal.board_id)
      .maybeSingle();
    if (boardError) {
      throw new Error(boardError.message);
    }
    if (boardRow?.kind !== PDCA_IMPROVEMENT_BOARD_KIND) {
      throw new HttpError(400, "Standard z celu można utworzyć tylko dla tablicy Usprawnienia (PDCA).");
    }

    const fields = goal.methodology_fields ?? {};
    const solutionStatement = firstString(fields.solutionStatement);
    const whatIsNeeded = firstString(fields.whatIsNeeded);

    const contextParts = [goal.description, solutionStatement].filter(Boolean);
    const tipsParts = [goal.settlement_what_worked, goal.settlement_conclusions]
      .map((value) => value ?? "")
      .filter(Boolean);

    const slugBase = slugifyCompanyStandard(goal.name);
    let slug = slugBase;
    let suffix = 2;
    for (;;) {
      const { data: existing } = await admin
        .from("company_standards")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${slugBase}-${suffix}`;
      suffix += 1;
    }

    const { data: standardRow, error: standardError } = await admin
      .from("company_standards")
      .insert({
        slug,
        title: goal.name,
        summary: solutionStatement.slice(0, 200),
        context_html: contextParts.join("\n\n"),
        steps: whatIsNeeded ? [{ title: "Co było potrzebne", bodyHtml: whatIsNeeded }] : [],
        tips_html: tipsParts.join("\n\n"),
        status: "draft",
        source_goal_id: goal.id,
        created_by: profile.id,
      })
      .select("*")
      .single();
    if (standardError) {
      throw new Error(standardError.message);
    }

    await admin.from("goal_links").insert({
      goal_id: goal.id,
      linked_type: "document",
      linked_id: standardRow.id,
    });

    return NextResponse.json({ standard: standardRow });
  } catch (error) {
    return jsonError(error);
  }
}
