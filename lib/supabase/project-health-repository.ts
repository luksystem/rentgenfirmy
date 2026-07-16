import { getSupabase } from "@/lib/supabase/client";
import {
  rowToGoal,
  rowToGoalComment,
  rowToGoalDeferral,
  rowToGoalInitiative,
  rowToGoalUpdate,
} from "@/lib/supabase/goal-mappers";
import { rowToMeetingNote } from "@/lib/supabase/project-meeting-note-repository";
import {
  buildProjectHealthThread,
  computeProjectHealthScore,
  normalizeProjectHealthSignals,
  type ProjectHealthBand,
  type ProjectHealthBundle,
  type ProjectHealthKanbanComment,
  type ProjectHealthKanbanTask,
  type ProjectHealthOverviewItem,
  type ProjectHealthSentiment,
  type ProjectHealthSignals,
  type ProjectHealthSnapshot,
} from "@/lib/projects/project-health";
import type { ProjectChangeRequest, ProjectChangeRequestStatus } from "@/lib/dashboard/change-request-types";
import type { GoalDeferralRow, GoalInitiativeRow } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";

type SnapshotRow = {
  id: string;
  project_id: string;
  score: number;
  band: string;
  sentiment: string;
  summary_md: string;
  signals: unknown;
  stage_title: string | null;
  created_by: string | null;
  created_at: string;
};

type ChangeRequestRow = Database["public"]["Tables"]["project_change_requests"]["Row"];

function rowToSnapshot(row: SnapshotRow): ProjectHealthSnapshot {
  return {
    id: row.id,
    projectId: row.project_id,
    score: Number(row.score),
    band: row.band as ProjectHealthBand,
    sentiment: row.sentiment as ProjectHealthSentiment,
    summaryMd: row.summary_md,
    signals: normalizeProjectHealthSignals(row.signals),
    stageTitle: row.stage_title,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function rowToChangeRequestLite(row: ChangeRequestRow): ProjectChangeRequest {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    status: row.status as ProjectChangeRequestStatus,
    proposedCostNet: row.proposed_cost_net != null ? Number(row.proposed_cost_net) : null,
    proposedCostGross: row.proposed_cost_gross != null ? Number(row.proposed_cost_gross) : null,
    proposedCostVatRate: row.proposed_cost_vat_rate != null ? Number(row.proposed_cost_vat_rate) : null,
    costNote: row.cost_note,
    createdByName: row.created_by_name,
    createdBySide: row.created_by_side === "client" ? "client" : "team",
    submittedAt: row.submitted_at,
    clientRespondedAt: row.client_responded_at,
    clientResponseName: row.client_response_name,
    clientResponseNote: row.client_response_note,
    position: row.position,
    acceptanceDeadlineStageId: row.acceptance_deadline_stage_id,
    blocksNextStage: Boolean(row.blocks_next_stage),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingRelationError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("does not exist") || lower.includes("could not find");
}

async function fetchKanbanHealthForProject(projectId: string): Promise<{
  tasks: ProjectHealthKanbanTask[];
  comments: ProjectHealthKanbanComment[];
}> {
  const supabase = getSupabase();

  const { data: processItems, error: itemsError } = await supabase
    .from("project_process_items")
    .select("id, template_item_id, status")
    .eq("project_id", projectId)
    .eq("kind", "kanban");

  if (itemsError) {
    if (isMissingRelationError(itemsError.message)) return { tasks: [], comments: [] };
    throw new Error(itemsError.message);
  }

  const items = processItems ?? [];
  if (!items.length) return { tasks: [], comments: [] };

  const templateItemIds = [...new Set(items.map((item) => item.template_item_id as string))];
  const { data: templateItems } = await supabase
    .from("process_items")
    .select("id, title")
    .in("id", templateItemIds);

  const templateTitleById = new Map(
    (templateItems ?? []).map((row) => [row.id as string, (row.title as string).trim()]),
  );

  const itemLabelById = new Map(
    items.map((item) => {
      const title = templateTitleById.get(item.template_item_id as string);
      const status = (item.status as string)?.trim();
      const label = title
        ? status
          ? `${title} (${status})`
          : title
        : status
          ? `Wdrożenie (${status})`
          : "Wdrożenie";
      return [item.id as string, label];
    }),
  );

  const itemIds = items.map((item) => item.id as string);
  const { data: boards, error: boardsError } = await supabase
    .from("process_kanban_boards")
    .select("id, project_process_item_id")
    .in("project_process_item_id", itemIds);

  if (boardsError) {
    if (isMissingRelationError(boardsError.message)) return { tasks: [], comments: [] };
    throw new Error(boardsError.message);
  }

  const boardRows = boards ?? [];
  if (!boardRows.length) return { tasks: [], comments: [] };

  const boardIds = boardRows.map((row) => row.id as string);
  const boardLabelById = new Map(
    boardRows.map((row) => [
      row.id as string,
      itemLabelById.get(row.project_process_item_id as string) ?? "Wdrożenie",
    ]),
  );

  const { data: columns, error: columnsError } = await supabase
    .from("process_kanban_columns")
    .select("id, board_id, title")
    .in("board_id", boardIds);

  if (columnsError) throw new Error(columnsError.message);
  const columnRows = columns ?? [];
  if (!columnRows.length) return { tasks: [], comments: [] };

  const columnMetaById = new Map(
    columnRows.map((row) => [
      row.id as string,
      {
        title: (row.title as string).trim() || "Kolumna",
        boardLabel: boardLabelById.get(row.board_id as string) ?? "Wdrożenie",
      },
    ]),
  );

  const columnIds = columnRows.map((row) => row.id as string);
  const { data: taskRows, error: tasksError } = await supabase
    .from("process_kanban_tasks")
    .select("id, column_id, title, closed_at, created_at")
    .in("column_id", columnIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (tasksError) throw new Error(tasksError.message);

  const tasks: ProjectHealthKanbanTask[] = (taskRows ?? []).map((row) => {
    const meta = columnMetaById.get(row.column_id as string);
    return {
      id: row.id as string,
      title: ((row.title as string) ?? "").trim() || "Zadanie",
      closedAt: (row.closed_at as string | null) ?? null,
      createdAt: row.created_at as string,
      boardLabel: meta?.boardLabel ?? "Wdrożenie",
      columnTitle: meta?.title ?? "Kolumna",
    };
  });

  const taskIds = tasks.map((t) => t.id);
  if (!taskIds.length) return { tasks, comments: [] };

  const titleByTaskId = new Map(tasks.map((t) => [t.id, t.title] as const));
  const { data: commentRows, error: commentsError } = await supabase
    .from("process_kanban_comments")
    .select("id, task_id, author_name, author_side, body, created_at")
    .in("task_id", taskIds)
    .order("created_at", { ascending: false })
    .limit(120);

  if (commentsError) {
    if (isMissingRelationError(commentsError.message)) return { tasks, comments: [] };
    throw new Error(commentsError.message);
  }

  const comments: ProjectHealthKanbanComment[] = (commentRows ?? []).map((row) => ({
    id: row.id as string,
    taskId: row.task_id as string,
    taskTitle: titleByTaskId.get(row.task_id as string) ?? "Zadanie wdrożeniowe",
    authorName: ((row.author_name as string) ?? "").trim() || "Autor",
    authorSide: row.author_side === "client" ? "client" : "team",
    body: ((row.body as string) ?? "").trim(),
    createdAt: row.created_at as string,
  }));

  return { tasks, comments };
}

async function fetchKanbanHealthBatch(projectIds: string[]): Promise<
  Map<string, { tasks: ProjectHealthKanbanTask[]; comments: ProjectHealthKanbanComment[] }>
> {
  const result = new Map<string, { tasks: ProjectHealthKanbanTask[]; comments: ProjectHealthKanbanComment[] }>();
  for (const id of projectIds) {
    result.set(id, { tasks: [], comments: [] });
  }
  if (!projectIds.length) return result;

  const supabase = getSupabase();
  const { data: processItems, error: itemsError } = await supabase
    .from("project_process_items")
    .select("id, project_id, template_item_id, status")
    .in("project_id", projectIds)
    .eq("kind", "kanban");

  if (itemsError) {
    if (isMissingRelationError(itemsError.message)) return result;
    throw new Error(itemsError.message);
  }

  const items = processItems ?? [];
  if (!items.length) return result;

  const projectByItemId = new Map(items.map((item) => [item.id as string, item.project_id as string]));
  const templateItemIds = [...new Set(items.map((item) => item.template_item_id as string))];
  const { data: templateItems } = await supabase
    .from("process_items")
    .select("id, title")
    .in("id", templateItemIds);
  const templateTitleById = new Map(
    (templateItems ?? []).map((row) => [row.id as string, (row.title as string).trim()]),
  );

  const itemLabelById = new Map(
    items.map((item) => {
      const title = templateTitleById.get(item.template_item_id as string);
      return [item.id as string, title || "Wdrożenie"];
    }),
  );

  const itemIds = items.map((item) => item.id as string);
  const { data: boards, error: boardsError } = await supabase
    .from("process_kanban_boards")
    .select("id, project_process_item_id")
    .in("project_process_item_id", itemIds);

  if (boardsError) {
    if (isMissingRelationError(boardsError.message)) return result;
    throw new Error(boardsError.message);
  }

  const boardRows = boards ?? [];
  if (!boardRows.length) return result;

  const boardIds = boardRows.map((row) => row.id as string);
  const projectByBoardId = new Map(
    boardRows.map((row) => [
      row.id as string,
      projectByItemId.get(row.project_process_item_id as string) ?? "",
    ]),
  );
  const boardLabelById = new Map(
    boardRows.map((row) => [
      row.id as string,
      itemLabelById.get(row.project_process_item_id as string) ?? "Wdrożenie",
    ]),
  );

  const { data: columns, error: columnsError } = await supabase
    .from("process_kanban_columns")
    .select("id, board_id, title")
    .in("board_id", boardIds);

  if (columnsError) throw new Error(columnsError.message);
  const columnRows = columns ?? [];
  if (!columnRows.length) return result;

  const columnMetaById = new Map(
    columnRows.map((row) => [
      row.id as string,
      {
        title: (row.title as string).trim() || "Kolumna",
        boardLabel: boardLabelById.get(row.board_id as string) ?? "Wdrożenie",
        projectId: projectByBoardId.get(row.board_id as string) ?? "",
      },
    ]),
  );

  const columnIds = columnRows.map((row) => row.id as string);
  const { data: taskRows, error: tasksError } = await supabase
    .from("process_kanban_tasks")
    .select("id, column_id, title, closed_at, created_at")
    .in("column_id", columnIds)
    .limit(800);

  if (tasksError) throw new Error(tasksError.message);

  const tasksByProject = new Map<string, ProjectHealthKanbanTask[]>();
  for (const row of taskRows ?? []) {
    const meta = columnMetaById.get(row.column_id as string);
    const projectId = meta?.projectId;
    if (!projectId) continue;
    const task: ProjectHealthKanbanTask = {
      id: row.id as string,
      title: ((row.title as string) ?? "").trim() || "Zadanie",
      closedAt: (row.closed_at as string | null) ?? null,
      createdAt: row.created_at as string,
      boardLabel: meta?.boardLabel ?? "Wdrożenie",
      columnTitle: meta?.title ?? "Kolumna",
    };
    const list = tasksByProject.get(projectId) ?? [];
    list.push(task);
    tasksByProject.set(projectId, list);
  }

  const allTaskIds = [...tasksByProject.values()].flat().map((t) => t.id);
  const titleByTaskId = new Map(
    [...tasksByProject.values()].flat().map((t) => [t.id, t.title] as const),
  );
  const projectByTaskId = new Map<string, string>();
  for (const [projectId, tasks] of tasksByProject) {
    for (const task of tasks) projectByTaskId.set(task.id, projectId);
  }

  let commentRows: Array<Record<string, unknown>> = [];
  if (allTaskIds.length) {
    // Supabase .in() has practical limits — chunk
    const chunkSize = 80;
    for (let i = 0; i < allTaskIds.length; i += chunkSize) {
      const chunk = allTaskIds.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from("process_kanban_comments")
        .select("id, task_id, author_name, author_side, body, created_at")
        .in("task_id", chunk)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        if (isMissingRelationError(error.message)) break;
        throw new Error(error.message);
      }
      commentRows = commentRows.concat((data ?? []) as Array<Record<string, unknown>>);
    }
  }

  const commentsByProject = new Map<string, ProjectHealthKanbanComment[]>();
  for (const row of commentRows) {
    const taskId = row.task_id as string;
    const projectId = projectByTaskId.get(taskId);
    if (!projectId) continue;
    const comment: ProjectHealthKanbanComment = {
      id: row.id as string,
      taskId,
      taskTitle: titleByTaskId.get(taskId) ?? "Zadanie wdrożeniowe",
      authorName: ((row.author_name as string) ?? "").trim() || "Autor",
      authorSide: row.author_side === "client" ? "client" : "team",
      body: ((row.body as string) ?? "").trim(),
      createdAt: row.created_at as string,
    };
    const list = commentsByProject.get(projectId) ?? [];
    list.push(comment);
    commentsByProject.set(projectId, list);
  }

  for (const projectId of projectIds) {
    result.set(projectId, {
      tasks: tasksByProject.get(projectId) ?? [],
      comments: commentsByProject.get(projectId) ?? [],
    });
  }

  return result;
}

export async function fetchProjectHealthBundle(input: {
  projectId: string;
  projectName: string;
  stageTitle?: string | null;
  processProgressPercent?: number | null;
}): Promise<ProjectHealthBundle> {
  const supabase = getSupabase();
  const { data: goalRows, error: goalsError } = await supabase
    .from("goals")
    .select("*")
    .eq("project_id", input.projectId)
    .order("updated_at", { ascending: false });

  if (goalsError) throw new Error(goalsError.message);

  const goals = (goalRows ?? []).map(rowToGoal);
  const goalIds = goals.map((g) => g.id);

  const snapshotPromise = supabase
    .from("project_health_snapshots")
    .select("*")
    .eq("project_id", input.projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const notesPromise = supabase
    .from("project_meeting_notes")
    .select("*")
    .eq("project_id", input.projectId)
    .order("created_at", { ascending: false })
    .limit(40);

  const changesPromise = supabase
    .from("project_change_requests")
    .select("*")
    .eq("project_id", input.projectId)
    .order("updated_at", { ascending: false })
    .limit(80);

  const kanbanPromise = fetchKanbanHealthForProject(input.projectId);

  const [commentsRes, updatesRes, deferralsRes, initiativesRes, snapshotRes, notesRes, changesRes, kanban] =
    goalIds.length
      ? await Promise.all([
          supabase
            .from("goal_comments")
            .select("*")
            .in("goal_id", goalIds)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("goal_updates")
            .select("*")
            .in("goal_id", goalIds)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("goal_deferrals")
            .select("*")
            .in("goal_id", goalIds)
            .order("created_at", { ascending: false }),
          supabase.from("goal_initiatives").select("*").in("goal_id", goalIds).eq("kind", "task"),
          snapshotPromise,
          notesPromise,
          changesPromise,
          kanbanPromise,
        ])
      : [
          { data: [] as never[], error: null },
          { data: [] as never[], error: null },
          { data: [] as never[], error: null },
          { data: [] as never[], error: null },
          await snapshotPromise,
          await notesPromise,
          await changesPromise,
          await kanbanPromise,
        ];

  for (const res of [commentsRes, updatesRes, deferralsRes, initiativesRes]) {
    if (res.error) throw new Error(res.error.message);
  }
  if (snapshotRes.error) throw new Error(snapshotRes.error.message);

  let meetingNotes = [] as ReturnType<typeof rowToMeetingNote>[];
  if (notesRes.error) {
    if (!isMissingRelationError(notesRes.error.message)) throw new Error(notesRes.error.message);
  } else {
    meetingNotes = (notesRes.data ?? []).map((row) =>
      rowToMeetingNote(
        row as Parameters<typeof rowToMeetingNote>[0],
      ),
    );
  }

  let changeRequests: ProjectChangeRequest[] = [];
  if (changesRes.error) {
    if (!isMissingRelationError(changesRes.error.message)) throw new Error(changesRes.error.message);
  } else {
    changeRequests = (changesRes.data ?? []).map((row) =>
      rowToChangeRequestLite(row as ChangeRequestRow),
    );
  }

  const comments = (commentsRes.data ?? []).map(rowToGoalComment);
  const updates = (updatesRes.data ?? []).map(rowToGoalUpdate);
  const deferrals = ((deferralsRes.data ?? []) as GoalDeferralRow[]).map(rowToGoalDeferral);
  const initiatives = ((initiativesRes.data ?? []) as GoalInitiativeRow[]).map(rowToGoalInitiative);

  const scored = computeProjectHealthScore({
    goals,
    initiatives,
    deferrals,
    comments,
    updates,
    meetingNotes,
    changeRequests,
    kanbanTasks: kanban.tasks,
    kanbanComments: kanban.comments,
  });

  const thread = buildProjectHealthThread({
    goals,
    comments,
    updates,
    deferrals,
    initiatives,
    meetingNotes,
    changeRequests,
    kanbanTasks: kanban.tasks,
    kanbanComments: kanban.comments,
  });

  return {
    projectId: input.projectId,
    projectName: input.projectName,
    stageTitle: input.stageTitle ?? null,
    processProgressPercent: input.processProgressPercent ?? null,
    score: scored.score,
    band: scored.band,
    sentiment: scored.sentiment,
    signals: scored.signals,
    thread,
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      progressPercent: g.progressPercent,
      periodEnd: g.periodEnd,
      needsRevisit: g.needsRevisit,
      deferralCount: g.deferralCount,
      lastDeferralReason: g.lastDeferralReason,
    })),
    latestSnapshot: snapshotRes.data ? rowToSnapshot(snapshotRes.data as SnapshotRow) : null,
  };
}

/** Zbiorczy przegląd zdrowia dla listy projektów (widok Klientów). */
export async function fetchProjectsHealthOverview(
  projects: Array<{ id: string; name: string; clientId: string; clientName: string }>,
): Promise<ProjectHealthOverviewItem[]> {
  if (!projects.length) return [];

  const supabase = getSupabase();
  const projectIds = projects.map((p) => p.id);
  const metaById = new Map(projects.map((p) => [p.id, p] as const));

  const [goalsRes, notesRes, changesRes, snapshotsRes, kanbanByProject] = await Promise.all([
    supabase.from("goals").select("*").in("project_id", projectIds),
    supabase
      .from("project_meeting_notes")
      .select("*")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false }),
    supabase.from("project_change_requests").select("*").in("project_id", projectIds),
    supabase
      .from("project_health_snapshots")
      .select("*")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false }),
    fetchKanbanHealthBatch(projectIds),
  ]);

  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (notesRes.error && !isMissingRelationError(notesRes.error.message)) {
    throw new Error(notesRes.error.message);
  }
  if (changesRes.error && !isMissingRelationError(changesRes.error.message)) {
    throw new Error(changesRes.error.message);
  }
  if (snapshotsRes.error && !isMissingRelationError(snapshotsRes.error.message)) {
    throw new Error(snapshotsRes.error.message);
  }

  const goals = (goalsRes.data ?? []).map(rowToGoal);
  const goalsByProject = new Map<string, typeof goals>();
  for (const goal of goals) {
    if (!goal.projectId) continue;
    const list = goalsByProject.get(goal.projectId) ?? [];
    list.push(goal);
    goalsByProject.set(goal.projectId, list);
  }

  const goalIds = goals.map((g) => g.id);
  let comments: ReturnType<typeof rowToGoalComment>[] = [];
  let updates: ReturnType<typeof rowToGoalUpdate>[] = [];
  let deferrals: ReturnType<typeof rowToGoalDeferral>[] = [];
  let initiatives: ReturnType<typeof rowToGoalInitiative>[] = [];

  if (goalIds.length) {
    const chunkSize = 80;
    for (let i = 0; i < goalIds.length; i += chunkSize) {
      const chunk = goalIds.slice(i, i + chunkSize);
      const [cRes, uRes, dRes, iRes] = await Promise.all([
        supabase
          .from("goal_comments")
          .select("*")
          .in("goal_id", chunk)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("goal_updates")
          .select("*")
          .in("goal_id", chunk)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase.from("goal_deferrals").select("*").in("goal_id", chunk),
        supabase.from("goal_initiatives").select("*").in("goal_id", chunk).eq("kind", "task"),
      ]);
      if (cRes.error) throw new Error(cRes.error.message);
      if (uRes.error) throw new Error(uRes.error.message);
      if (dRes.error) throw new Error(dRes.error.message);
      if (iRes.error) throw new Error(iRes.error.message);
      comments = comments.concat((cRes.data ?? []).map(rowToGoalComment));
      updates = updates.concat((uRes.data ?? []).map(rowToGoalUpdate));
      deferrals = deferrals.concat(((dRes.data ?? []) as GoalDeferralRow[]).map(rowToGoalDeferral));
      initiatives = initiatives.concat(
        ((iRes.data ?? []) as GoalInitiativeRow[]).map(rowToGoalInitiative),
      );
    }
  }

  const notesByProject = new Map<string, ReturnType<typeof rowToMeetingNote>[]>();
  for (const row of notesRes.data ?? []) {
    const note = rowToMeetingNote(row as Parameters<typeof rowToMeetingNote>[0]);
    const list = notesByProject.get(note.projectId) ?? [];
    list.push(note);
    notesByProject.set(note.projectId, list);
  }

  const changesByProject = new Map<string, ProjectChangeRequest[]>();
  for (const row of changesRes.data ?? []) {
    const change = rowToChangeRequestLite(row as ChangeRequestRow);
    const list = changesByProject.get(change.projectId) ?? [];
    list.push(change);
    changesByProject.set(change.projectId, list);
  }

  const latestSnapshotByProject = new Map<string, ProjectHealthSnapshot>();
  for (const row of snapshotsRes.data ?? []) {
    const snap = rowToSnapshot(row as SnapshotRow);
    if (!latestSnapshotByProject.has(snap.projectId)) {
      latestSnapshotByProject.set(snap.projectId, snap);
    }
  }

  const commentsByGoal = new Map<string, typeof comments>();
  for (const comment of comments) {
    const list = commentsByGoal.get(comment.goalId) ?? [];
    list.push(comment);
    commentsByGoal.set(comment.goalId, list);
  }
  const updatesByGoal = new Map<string, typeof updates>();
  for (const update of updates) {
    const list = updatesByGoal.get(update.goalId) ?? [];
    list.push(update);
    updatesByGoal.set(update.goalId, list);
  }
  const deferralsByGoal = new Map<string, typeof deferrals>();
  for (const deferral of deferrals) {
    const list = deferralsByGoal.get(deferral.goalId) ?? [];
    list.push(deferral);
    deferralsByGoal.set(deferral.goalId, list);
  }
  const initiativesByGoal = new Map<string, typeof initiatives>();
  for (const initiative of initiatives) {
    const list = initiativesByGoal.get(initiative.goalId) ?? [];
    list.push(initiative);
    initiativesByGoal.set(initiative.goalId, list);
  }

  return projects.map((project) => {
    const projectGoals = goalsByProject.get(project.id) ?? [];
    const goalIdSet = new Set(projectGoals.map((g) => g.id));
    const projectComments = [...goalIdSet].flatMap((id) => commentsByGoal.get(id) ?? []);
    const projectUpdates = [...goalIdSet].flatMap((id) => updatesByGoal.get(id) ?? []);
    const projectDeferrals = [...goalIdSet].flatMap((id) => deferralsByGoal.get(id) ?? []);
    const projectInitiatives = [...goalIdSet].flatMap((id) => initiativesByGoal.get(id) ?? []);
    const kanban = kanbanByProject.get(project.id) ?? { tasks: [], comments: [] };

    const scored = computeProjectHealthScore({
      goals: projectGoals,
      initiatives: projectInitiatives,
      deferrals: projectDeferrals,
      comments: projectComments,
      updates: projectUpdates,
      meetingNotes: notesByProject.get(project.id) ?? [],
      changeRequests: changesByProject.get(project.id) ?? [],
      kanbanTasks: kanban.tasks,
      kanbanComments: kanban.comments,
    });

    const snapshot = latestSnapshotByProject.get(project.id);
    const meta = metaById.get(project.id)!;

    return {
      projectId: project.id,
      projectName: meta.name,
      clientId: meta.clientId,
      clientName: meta.clientName,
      score: scored.score,
      band: scored.band,
      sentiment: scored.sentiment,
      signals: scored.signals,
      summaryMd: snapshot?.summaryMd ?? null,
      snapshotAt: snapshot?.createdAt ?? null,
    } satisfies ProjectHealthOverviewItem;
  });
}

export async function saveProjectHealthSnapshot(input: {
  projectId: string;
  score: number;
  band: ProjectHealthBand;
  sentiment: ProjectHealthSentiment;
  summaryMd: string;
  signals: ProjectHealthSignals;
  stageTitle?: string | null;
  createdBy?: string | null;
}): Promise<ProjectHealthSnapshot> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_health_snapshots")
    .insert({
      project_id: input.projectId,
      score: input.score,
      band: input.band,
      sentiment: input.sentiment,
      summary_md: input.summaryMd,
      signals: input.signals,
      stage_title: input.stageTitle ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSnapshot(data as SnapshotRow);
}
