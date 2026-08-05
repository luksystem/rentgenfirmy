export type ProjectAcHistoryKind = "task" | "subtask" | "comment";

export type ProjectAcHistoryItem = {
  id: string;
  projectId: string;
  kind: ProjectAcHistoryKind;
  acId: number;
  acTaskId: number | null;
  title: string;
  body: string;
  authorName: string;
  isCompleted: boolean;
  attachmentNames: string[];
  acCreatedOn: string | null;
  acCompletedOn: string | null;
};

export type ProjectAcLink = {
  projectId: string;
  acProjectId: number;
  acZip: string;
  acProjectName: string;
  matchScore: number | null;
  importedAt: string | null;
};

/** Jedno zadanie z AC wraz z podpiętymi podzadaniami i komentarzami — do wyświetlenia jako jedna karta. */
export type ProjectAcHistoryGroup = {
  task: ProjectAcHistoryItem | null;
  subtasks: ProjectAcHistoryItem[];
  comments: ProjectAcHistoryItem[];
};

function timeOf(item: ProjectAcHistoryItem) {
  const value = item.acCreatedOn ? new Date(item.acCreatedOn).getTime() : NaN;
  return Number.isFinite(value) ? value : 0;
}

/** Grupuje płaską listę wpisów historii AC po zadaniu nadrzędnym (ac_task_id), chronologicznie. */
export function groupAcHistoryItems(items: ProjectAcHistoryItem[]): ProjectAcHistoryGroup[] {
  const tasks = items.filter((item) => item.kind === "task");
  const byAcId = new Map(tasks.map((task) => [task.acId, task]));

  const groups = new Map<number | "orphan", ProjectAcHistoryGroup>();
  for (const task of tasks) {
    groups.set(task.acId, { task, subtasks: [], comments: [] });
  }

  for (const item of items) {
    if (item.kind === "task") continue;
    const key = item.acTaskId !== null && byAcId.has(item.acTaskId) ? item.acTaskId : "orphan";
    if (!groups.has(key)) {
      groups.set(key, { task: key === "orphan" ? null : (byAcId.get(key) ?? null), subtasks: [], comments: [] });
    }
    const group = groups.get(key)!;
    if (item.kind === "subtask") group.subtasks.push(item);
    else group.comments.push(item);
  }

  for (const group of groups.values()) {
    group.subtasks.sort((a, b) => timeOf(a) - timeOf(b));
    group.comments.sort((a, b) => timeOf(a) - timeOf(b));
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aTime = a.task ? timeOf(a.task) : Math.min(...a.comments.concat(a.subtasks).map(timeOf), Infinity);
    const bTime = b.task ? timeOf(b.task) : Math.min(...b.comments.concat(b.subtasks).map(timeOf), Infinity);
    return aTime - bTime;
  });
}

/** Usuwa znaczniki HTML z treści zadania/komentarza AC (są to stare, niezaufane dane — pokazujemy jako czysty tekst). */
export function stripAcHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
