import { getSupabase } from "@/lib/supabase/client";
import {
  slugifyCompanyStandard,
  type CompanyStandard,
  type CompanyStandardInput,
  type CompanyStandardStep,
} from "@/lib/standards/types";

type CompanyStandardRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  context_html: string;
  steps: CompanyStandardStep[];
  tips_html: string;
  status: CompanyStandard["status"];
  source_goal_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToStandard(row: CompanyStandardRow): CompanyStandard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    contextHtml: row.context_html,
    steps: row.steps ?? [],
    tipsHtml: row.tips_html,
    status: row.status,
    sourceGoalId: row.source_goal_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function uniqueSlug(base: string): Promise<string> {
  const supabase = getSupabase();
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const { data, error } = await supabase
      .from("company_standards")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function fetchStandards(): Promise<CompanyStandard[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("company_standards")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToStandard(row as CompanyStandardRow));
}

export async function fetchStandardBySlug(slug: string): Promise<CompanyStandard | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("company_standards")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? rowToStandard(data as CompanyStandardRow) : null;
}

export async function createStandard(
  input: CompanyStandardInput,
  createdBy: string | null,
): Promise<CompanyStandard> {
  if (!input.title.trim()) {
    throw new Error("Podaj tytuł standardu.");
  }
  const slug = await uniqueSlug(slugifyCompanyStandard(input.title));
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("company_standards")
    .insert({
      slug,
      title: input.title.trim(),
      summary: input.summary?.trim() ?? "",
      context_html: input.contextHtml ?? "",
      steps: input.steps ?? [],
      tips_html: input.tipsHtml ?? "",
      status: input.status ?? "draft",
      source_goal_id: input.sourceGoalId ?? null,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return rowToStandard(data as CompanyStandardRow);
}

export async function updateStandard(
  id: string,
  patch: Partial<CompanyStandardInput>,
): Promise<CompanyStandard> {
  const supabase = getSupabase();
  const update: Partial<{
    title: string;
    summary: string;
    context_html: string;
    steps: CompanyStandardStep[];
    tips_html: string;
    status: CompanyStandard["status"];
    source_goal_id: string | null;
    updated_at: string;
  }> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.summary !== undefined) update.summary = patch.summary.trim();
  if (patch.contextHtml !== undefined) update.context_html = patch.contextHtml;
  if (patch.steps !== undefined) update.steps = patch.steps;
  if (patch.tipsHtml !== undefined) update.tips_html = patch.tipsHtml;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.sourceGoalId !== undefined) update.source_goal_id = patch.sourceGoalId;

  const { data, error } = await supabase
    .from("company_standards")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return rowToStandard(data as CompanyStandardRow);
}

export async function deleteStandard(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("company_standards").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
