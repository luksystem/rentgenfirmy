import type { WorkItemPriority } from "@/lib/my-work/types";

export type WorkTaskAiSuggestion = {
  title: string;
  description: string;
  expectedResult: string;
  priority: WorkItemPriority;
  reason: string;
  dueDate?: string | null;
};

export type WorkTaskAiSuggestionsResponse = {
  suggestions: WorkTaskAiSuggestion[];
  summary: string;
  source: "ai" | "rules";
};

export type WorkDaySummaryAiResponse = {
  draft: string;
  highlights: string[];
  openItems: string[];
  source: "ai" | "rules";
};

export type WorkRiskAnalysisResponse = {
  riskNotes: string;
  risks: Array<{ title: string; severity: "low" | "medium" | "high"; detail: string }>;
  recommendations: string[];
  source: "ai" | "rules";
};
