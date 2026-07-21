"use client";

import type { ChecklistSection } from "@/lib/process/types";
import { checklistSectionSummary } from "@/lib/process/item-payload";
import {
  BoardCategoryMobileNav,
  type BoardNavCategory,
} from "@/components/process/board-category-mobile-nav";

function sectionToNavCategory(section: ChecklistSection): BoardNavCategory {
  const summary = checklistSectionSummary(section);
  let subtitle: string | undefined;
  if (summary.tone === "failed") {
    subtitle = `${summary.failed} problemów`;
  } else if (summary.tone === "complete") {
    subtitle = "ukończone";
  } else if (summary.tone === "progress") {
    subtitle = "w toku";
  }

  return {
    id: section.id,
    name: section.name,
    tone: summary.tone,
    subtitle,
  };
}

export function ChecklistMobileNav({
  sections,
  activeSectionId,
  onSelect,
  raisedForBackButton = false,
}: {
  sections: ChecklistSection[];
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
  raisedForBackButton?: boolean;
}) {
  const categories = sections.map(sectionToNavCategory);
  return (
    <BoardCategoryMobileNav
      categories={categories}
      activeCategoryId={activeSectionId}
      onSelect={onSelect}
      raisedForBackButton={raisedForBackButton}
    />
  );
}
