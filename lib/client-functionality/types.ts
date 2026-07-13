export const CLIENT_FUNCTIONALITY_QUESTION_TYPES = ["single", "multi", "boolean"] as const;

export type ClientFunctionalityQuestionType = (typeof CLIENT_FUNCTIONALITY_QUESTION_TYPES)[number];

export type ClientFunctionalityOption = {
  id: string;
  label: string;
  generatesTask?: boolean;
  taskTitle?: string;
  taskDescription?: string;
  taskPriority?: FunctionalityTaskPriority;
};

export type ClientFunctionalityTemplateItem = {
  id: string;
  title: string;
  description?: string;
  questionType: ClientFunctionalityQuestionType;
  options: ClientFunctionalityOption[];
  category: string;
  position: number;
  priority: "must_ask" | "nice_to_have";
};

export const FUNCTIONALITY_SURVEY_STATUSES = ["draft", "sent", "in_progress", "completed"] as const;
export type FunctionalitySurveyStatus = (typeof FUNCTIONALITY_SURVEY_STATUSES)[number];

export const FUNCTIONALITY_TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type FunctionalityTaskStatus = (typeof FUNCTIONALITY_TASK_STATUSES)[number];

export const FUNCTIONALITY_TASK_SOURCES = ["template", "ai", "manual"] as const;
export type FunctionalityTaskSource = (typeof FUNCTIONALITY_TASK_SOURCES)[number];

export const FUNCTIONALITY_TASK_PRIORITIES = ["must", "standard", "optional"] as const;
export type FunctionalityTaskPriority = (typeof FUNCTIONALITY_TASK_PRIORITIES)[number];

export type FunctionalityAiSuggestion = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: FunctionalityTaskPriority;
  rationale: string;
  status: "pending" | "accepted" | "rejected";
};

export type FunctionalitySurveyQuestion = ClientFunctionalityTemplateItem & {
  catalogItemId: string | null;
  catalogItemName: string;
  sectionKey: string;
};

export type FunctionalitySurvey = {
  id: string;
  projectId: string;
  publicToken: string;
  status: FunctionalitySurveyStatus;
  aiSuggestions: FunctionalityAiSuggestion[];
  extraQuestions: ClientFunctionalityTemplateItem[];
  clientName: string;
  completedAt: string | null;
  /** Kiedy zespół oznaczył wypełnioną ankietę jako przejrzane — badge znika. */
  teamReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FunctionalityResponse = {
  id: string;
  surveyId: string;
  questionId: string;
  catalogItemId: string | null;
  selectedOptionIds: string[];
  customNote: string;
  createdAt: string;
  updatedAt: string;
};

export type FunctionalityTask = {
  id: string;
  surveyId: string;
  questionId: string | null;
  optionId: string | null;
  title: string;
  description: string;
  category: string;
  priority: FunctionalityTaskPriority;
  status: FunctionalityTaskStatus;
  source: FunctionalityTaskSource;
  createdAt: string;
  updatedAt: string;
};

export type FunctionalitySurveyBundle = {
  survey: FunctionalitySurvey | null;
  questions: FunctionalitySurveyQuestion[];
  responses: FunctionalityResponse[];
  tasks: FunctionalityTask[];
  projectName: string;
  clientName: string;
};
