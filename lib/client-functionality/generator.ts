import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import type { SpecificationCatalogItem } from "@/lib/dashboard/specification-types";
import {
  GLOBAL_AUTOMATION_FUNCTIONALITY_SEEDS,
  seedCatalogFunctionalityItems,
  withFunctionalityItemPositions,
} from "@/lib/client-functionality/catalog-seeds";
import type {
  ClientFunctionalityTemplateItem,
  FunctionalityResponse,
  FunctionalitySurveyQuestion,
  FunctionalityTask,
  FunctionalityTaskPriority,
} from "@/lib/client-functionality/types";

function resolveCatalogEntry(
  spec: ProjectSpecificationItem,
  catalog: SpecificationCatalogItem[],
  catalogById: Map<string, SpecificationCatalogItem>,
): SpecificationCatalogItem | null {
  if (spec.catalogItemId) {
    const byId = catalogById.get(spec.catalogItemId);
    if (byId) {
      return byId;
    }
  }

  const normalizedTitle = spec.title.trim().toLowerCase();
  return (
    catalog.find((entry) => entry.name.trim().toLowerCase() === normalizedTitle) ??
    catalog.find((entry) => normalizedTitle.includes(entry.name.trim().toLowerCase())) ??
    null
  );
}

export function buildSurveyQuestions(
  specItems: ProjectSpecificationItem[],
  catalog: SpecificationCatalogItem[],
  extraQuestions: ClientFunctionalityTemplateItem[] = [],
): FunctionalitySurveyQuestion[] {
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
  const questions: FunctionalitySurveyQuestion[] = [];
  const seenQuestionIds = new Set<string>();
  const linkedCatalogIds = new Set<string>();

  for (const spec of specItems) {
    const catalogEntry = resolveCatalogEntry(spec, catalog, catalogById);
    if (!catalogEntry) {
      continue;
    }
    linkedCatalogIds.add(catalogEntry.id);

    const templateItems = seedCatalogFunctionalityItems(
      catalogEntry.name,
      catalogEntry.clientFunctionalityItems ?? [],
    );

    for (const item of templateItems) {
      const questionId = `${catalogEntry.id}:${item.id}`;
      if (seenQuestionIds.has(questionId)) {
        continue;
      }
      seenQuestionIds.add(questionId);
      questions.push({
        ...item,
        id: questionId,
        catalogItemId: catalogEntry.id,
        catalogItemName: catalogEntry.name,
        sectionKey: catalogEntry.id,
      });
    }
  }

  if (linkedCatalogIds.size >= 2) {
    for (const item of withFunctionalityItemPositions(GLOBAL_AUTOMATION_FUNCTIONALITY_SEEDS)) {
      const questionId = `global:${item.id}`;
      if (seenQuestionIds.has(questionId)) {
        continue;
      }
      seenQuestionIds.add(questionId);
      questions.push({
        ...item,
        id: questionId,
        catalogItemId: null,
        catalogItemName: "Automatyzacje",
        sectionKey: "global-automation",
      });
    }
  }

  for (const item of extraQuestions) {
    const questionId = `extra:${item.id}`;
    if (seenQuestionIds.has(questionId)) {
      continue;
    }
    seenQuestionIds.add(questionId);
    questions.push({
      ...item,
      id: questionId,
      catalogItemId: null,
      catalogItemName: item.category,
      sectionKey: "extra",
    });
  }

  return questions.sort((a, b) => {
    const sectionCompare = a.sectionKey.localeCompare(b.sectionKey, "pl");
    if (sectionCompare !== 0) {
      return sectionCompare;
    }
    return a.position - b.position;
  });
}

export function groupSurveyQuestions(questions: FunctionalitySurveyQuestion[]) {
  const sections = new Map<string, { title: string; questions: FunctionalitySurveyQuestion[] }>();

  for (const question of questions) {
    const key = question.sectionKey;
    const title =
      question.sectionKey === "global-automation"
        ? "Automatyzacje łączone"
        : question.sectionKey === "extra"
          ? "Dodatkowe scenariusze"
          : question.catalogItemName;
    const bucket = sections.get(key) ?? { title, questions: [] };
    bucket.questions.push(question);
    sections.set(key, bucket);
  }

  return [...sections.entries()].map(([key, value]) => ({ key, ...value }));
}

export function generateTasksFromResponses(
  questions: FunctionalitySurveyQuestion[],
  responses: FunctionalityResponse[],
  surveyId: string,
): Omit<FunctionalityTask, "id" | "createdAt" | "updatedAt">[] {
  const questionById = new Map(questions.map((entry) => [entry.id, entry]));
  const tasks: Omit<FunctionalityTask, "id" | "createdAt" | "updatedAt">[] = [];
  const taskKeys = new Set<string>();

  for (const response of responses) {
    const question = questionById.get(response.questionId);
    if (!question) {
      continue;
    }

    for (const optionId of response.selectedOptionIds) {
      const option = question.options.find((entry) => entry.id === optionId);
      if (!option?.generatesTask || !option.taskTitle) {
        continue;
      }

      const key = `${option.taskTitle}:${optionId}`;
      if (taskKeys.has(key)) {
        continue;
      }
      taskKeys.add(key);

      tasks.push({
        surveyId,
        questionId: question.id,
        optionId,
        title: option.taskTitle,
        description: option.taskDescription ?? "",
        category: question.category,
        priority: (option.taskPriority ?? "standard") as FunctionalityTaskPriority,
        status: "todo",
        source: "template",
      });
    }
  }

  return tasks.sort((a, b) => {
    const priorityOrder: Record<FunctionalityTaskPriority, number> = {
      must: 0,
      standard: 1,
      optional: 2,
    };
    const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (diff !== 0) {
      return diff;
    }
    return a.title.localeCompare(b.title, "pl");
  });
}

export function mergeAiTasksIntoSurvey(
  acceptedSuggestions: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: FunctionalityTaskPriority;
  }>,
  surveyId: string,
): Omit<FunctionalityTask, "id" | "createdAt" | "updatedAt">[] {
  return acceptedSuggestions.map((entry) => ({
    surveyId,
    questionId: null,
    optionId: entry.id,
    title: entry.title,
    description: entry.description,
    category: entry.category,
    priority: entry.priority,
    status: "todo" as const,
    source: "ai" as const,
  }));
}
