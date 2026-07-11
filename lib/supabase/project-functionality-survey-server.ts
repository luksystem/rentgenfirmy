import type {
  ClientFunctionalityTemplateItem,
  FunctionalityAiSuggestion,
  FunctionalityResponse,
  FunctionalitySurvey,
  FunctionalitySurveyBundle,
  FunctionalitySurveyStatus,
  FunctionalityTask,
  FunctionalityTaskPriority,
  FunctionalityTaskSource,
  FunctionalityTaskStatus,
} from "@/lib/client-functionality/types";
import {
  buildSurveyQuestions,
  generateTasksFromResponses,
  mergeAiTasksIntoSurvey,
} from "@/lib/client-functionality/generator";
import { normalizeCatalogFunctionalityItems } from "@/lib/client-functionality/catalog-seeds";
import { normalizeCatalogAcceptanceItems } from "@/lib/internal-acceptance/catalog-seeds";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import type { SpecificationCatalogItem } from "@/lib/dashboard/specification-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SurveyRow = {
  id: string;
  project_id: string;
  public_token: string;
  status: FunctionalitySurveyStatus;
  ai_suggestions: unknown;
  extra_questions: unknown;
  client_name: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ResponseRow = {
  id: string;
  survey_id: string;
  question_id: string;
  catalog_item_id: string | null;
  selected_option_ids: unknown;
  custom_note: string;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  survey_id: string;
  question_id: string | null;
  option_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: FunctionalityTaskPriority;
  status: FunctionalityTaskStatus;
  source: FunctionalityTaskSource;
  created_at: string;
  updated_at: string;
};

function isMissingTableError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("could not find") ||
    normalized.includes("schema cache")
  );
}

function rowToSurvey(row: SurveyRow): FunctionalitySurvey {
  return {
    id: row.id,
    projectId: row.project_id,
    publicToken: row.public_token,
    status: row.status,
    aiSuggestions: Array.isArray(row.ai_suggestions)
      ? (row.ai_suggestions as FunctionalityAiSuggestion[])
      : [],
    extraQuestions: Array.isArray(row.extra_questions)
      ? (row.extra_questions as ClientFunctionalityTemplateItem[])
      : [],
    clientName: row.client_name,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToResponse(row: ResponseRow): FunctionalityResponse {
  return {
    id: row.id,
    surveyId: row.survey_id,
    questionId: row.question_id,
    catalogItemId: row.catalog_item_id,
    selectedOptionIds: Array.isArray(row.selected_option_ids)
      ? (row.selected_option_ids as string[])
      : [],
    customNote: row.custom_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTask(row: TaskRow): FunctionalityTask {
  return {
    id: row.id,
    surveyId: row.survey_id,
    questionId: row.question_id,
    optionId: row.option_id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchProjectMeta(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client_id, clients(name)")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as { name?: string; clients?: { name?: string } | { name?: string }[] | null } | null;
  const clients = row?.clients;
  const clientName = Array.isArray(clients)
    ? String(clients[0]?.name ?? "")
    : String(clients?.name ?? "");

  return {
    projectName: String(row?.name ?? "Projekt"),
    clientName,
  };
}

async function fetchSpecificationCatalogServer(): Promise<SpecificationCatalogItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("specification_catalog_items")
    .select(
      "id, name, category, description, position, is_active, internal_acceptance_items, client_functionality_items, created_at",
    )
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error?.message?.includes("client_functionality_items")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("specification_catalog_items")
      .select("id, name, category, description, position, is_active, internal_acceptance_items, created_at")
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    return (fallbackData ?? []).map((row) => {
      const catalogRow = row as {
        id: string;
        name: string;
        category: string;
        description: string;
        position: number;
        is_active: boolean;
        internal_acceptance_items?: unknown;
        created_at: string;
      };
      return {
        id: catalogRow.id,
        name: catalogRow.name,
        category: catalogRow.category,
        description: catalogRow.description,
        position: catalogRow.position,
        isActive: catalogRow.is_active,
        internalAcceptanceItems: normalizeCatalogAcceptanceItems(catalogRow.internal_acceptance_items),
        clientFunctionalityItems: [],
        createdAt: catalogRow.created_at,
      };
    });
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const catalogRow = row as {
      id: string;
      name: string;
      category: string;
      description: string;
      position: number;
      is_active: boolean;
      internal_acceptance_items?: unknown;
      client_functionality_items?: unknown;
      created_at: string;
    };
    return {
      id: catalogRow.id,
      name: catalogRow.name,
      category: catalogRow.category,
      description: catalogRow.description,
      position: catalogRow.position,
      isActive: catalogRow.is_active,
      internalAcceptanceItems: normalizeCatalogAcceptanceItems(catalogRow.internal_acceptance_items),
      clientFunctionalityItems: normalizeCatalogFunctionalityItems(catalogRow.client_functionality_items),
      createdAt: catalogRow.created_at,
    };
  });
}

async function fetchProjectSpecificationItemsServer(
  projectId: string,
): Promise<ProjectSpecificationItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_specification_items")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    catalogItemId: row.catalog_item_id,
    title: row.title,
    category: row.category,
    description: row.description,
    notes: row.notes,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function fetchFunctionalitySurveyByProjectId(
  projectId: string,
): Promise<FunctionalitySurvey | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_functionality_surveys")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }

  return data ? rowToSurvey(data as SurveyRow) : null;
}

export async function fetchFunctionalitySurveyByToken(
  token: string,
): Promise<FunctionalitySurvey | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_functionality_surveys")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }

  return data ? rowToSurvey(data as SurveyRow) : null;
}

export async function ensureFunctionalitySurvey(projectId: string): Promise<FunctionalitySurvey> {
  const existing = await fetchFunctionalitySurveyByProjectId(projectId);
  if (existing) {
    return existing;
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_functionality_surveys")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      status: "draft",
      ai_suggestions: [],
      extra_questions: [],
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSurvey(data as SurveyRow);
}

export async function updateFunctionalitySurveyStatus(
  surveyId: string,
  status: FunctionalitySurveyStatus,
  patch?: { clientName?: string; completedAt?: string | null },
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_functionality_surveys")
    .update({
      status,
      client_name: patch?.clientName,
      completed_at: patch?.completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", surveyId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSurvey(data as SurveyRow);
}

export async function updateFunctionalitySurveyAiSuggestions(
  surveyId: string,
  suggestions: FunctionalityAiSuggestion[],
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_functionality_surveys")
    .update({
      ai_suggestions: suggestions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", surveyId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSurvey(data as SurveyRow);
}

export async function updateFunctionalitySurveyExtraQuestions(
  surveyId: string,
  extraQuestions: ClientFunctionalityTemplateItem[],
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_functionality_surveys")
    .update({
      extra_questions: extraQuestions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", surveyId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSurvey(data as SurveyRow);
}

export async function fetchFunctionalitySurveyBundle(
  projectId: string,
): Promise<FunctionalitySurveyBundle> {
  const [survey, specItems, catalog, meta] = await Promise.all([
    fetchFunctionalitySurveyByProjectId(projectId),
    fetchProjectSpecificationItemsServer(projectId),
    fetchSpecificationCatalogServer(),
    fetchProjectMeta(projectId),
  ]);

  if (!survey) {
    return {
      survey: null,
      questions: buildSurveyQuestions(specItems, catalog),
      responses: [],
      tasks: [],
      projectName: meta.projectName,
      clientName: meta.clientName,
    };
  }

  const supabase = getSupabaseAdmin();
  const [{ data: responseRows, error: responseError }, { data: taskRows, error: taskError }] =
    await Promise.all([
      supabase.from("project_functionality_responses").select("*").eq("survey_id", survey.id),
      supabase.from("project_functionality_tasks").select("*").eq("survey_id", survey.id),
    ]);

  if (responseError && !isMissingTableError(responseError.message)) {
    throw new Error(responseError.message);
  }
  if (taskError && !isMissingTableError(taskError.message)) {
    throw new Error(taskError.message);
  }

  const questions = buildSurveyQuestions(specItems, catalog, survey.extraQuestions);

  return {
    survey,
    questions,
    responses: (responseRows ?? []).map((row) => rowToResponse(row as ResponseRow)),
    tasks: (taskRows ?? []).map((row) => rowToTask(row as TaskRow)),
    projectName: meta.projectName,
    clientName: meta.clientName,
  };
}

export async function fetchFunctionalitySurveyBundleByToken(
  token: string,
): Promise<FunctionalitySurveyBundle | null> {
  const survey = await fetchFunctionalitySurveyByToken(token);
  if (!survey) {
    return null;
  }
  return fetchFunctionalitySurveyBundle(survey.projectId);
}

export async function upsertFunctionalityResponse(
  surveyId: string,
  input: {
    questionId: string;
    catalogItemId?: string | null;
    selectedOptionIds: string[];
    customNote?: string;
  },
) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("project_functionality_responses")
    .select("id")
    .eq("survey_id", surveyId)
    .eq("question_id", input.questionId)
    .maybeSingle();

  const payload = {
    survey_id: surveyId,
    question_id: input.questionId,
    catalog_item_id: input.catalogItemId ?? null,
    selected_option_ids: input.selectedOptionIds,
    custom_note: input.customNote?.trim() ?? "",
    updated_at: now,
  };

  const { data, error } = existing?.id
    ? await supabase
        .from("project_functionality_responses")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single()
    : await supabase
        .from("project_functionality_responses")
        .insert({
          id: crypto.randomUUID(),
          ...payload,
          created_at: now,
        })
        .select("*")
        .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToResponse(data as ResponseRow);
}

export async function replaceFunctionalityTasks(
  surveyId: string,
  tasks: Omit<FunctionalityTask, "id" | "createdAt" | "updatedAt">[],
) {
  const supabase = getSupabaseAdmin();
  const { error: deleteError } = await supabase
    .from("project_functionality_tasks")
    .delete()
    .eq("survey_id", surveyId)
    .neq("source", "manual");

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!tasks.length) {
    return [];
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_functionality_tasks")
    .insert(
      tasks.map((task) => ({
        id: crypto.randomUUID(),
        survey_id: task.surveyId,
        question_id: task.questionId,
        option_id: task.optionId,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: task.status,
        source: task.source,
        created_at: now,
        updated_at: now,
      })),
    )
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToTask(row as TaskRow));
}

export async function regenerateFunctionalityTasks(projectId: string) {
  const bundle = await fetchFunctionalitySurveyBundle(projectId);
  if (!bundle.survey) {
    return [];
  }

  const templateTasks = generateTasksFromResponses(
    bundle.questions,
    bundle.responses,
    bundle.survey.id,
  );

  const acceptedAi = bundle.survey.aiSuggestions
    .filter((entry) => entry.status === "accepted")
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      category: entry.category,
      priority: entry.priority,
    }));

  const aiTasks = mergeAiTasksIntoSurvey(acceptedAi, bundle.survey.id);
  const allTasks = [...templateTasks, ...aiTasks];

  return replaceFunctionalityTasks(bundle.survey.id, allTasks);
}

export async function updateFunctionalityTaskStatus(
  taskId: string,
  status: FunctionalityTaskStatus,
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_functionality_tasks")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToTask(data as TaskRow);
}

export async function completeFunctionalitySurvey(
  surveyId: string,
  projectId: string,
  clientName?: string,
) {
  await updateFunctionalitySurveyStatus(surveyId, "completed", {
    clientName,
    completedAt: new Date().toISOString(),
  });
  return regenerateFunctionalityTasks(projectId);
}
