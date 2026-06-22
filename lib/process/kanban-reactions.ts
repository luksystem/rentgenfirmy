import type { KanbanAuthorSide, KanbanTaskReaction } from "@/lib/process/kanban-types";

export const KANBAN_REACTION_EMOJIS = ["👍", "❤️", "✅"] as const;
export type KanbanReactionEmoji = (typeof KANBAN_REACTION_EMOJIS)[number];

export type KanbanReactionSummary = {
  emoji: KanbanReactionEmoji;
  count: number;
  reactedByMe: boolean;
};

function normalizeAuthor(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}

export function isKanbanReactionEmoji(value: string): value is KanbanReactionEmoji {
  return (KANBAN_REACTION_EMOJIS as readonly string[]).includes(value);
}

export function summarizeKanbanTaskReactions(
  reactions: KanbanTaskReaction[],
  taskId: string,
  authorName: string,
  authorSide: KanbanAuthorSide,
): KanbanReactionSummary[] {
  const taskReactions = reactions.filter((entry) => entry.taskId === taskId);
  const normalizedAuthor = normalizeAuthor(authorName);

  return KANBAN_REACTION_EMOJIS.map((emoji) => {
    const matches = taskReactions.filter((entry) => entry.emoji === emoji);
    return {
      emoji,
      count: matches.length,
      reactedByMe: matches.some(
        (entry) =>
          entry.authorSide === authorSide &&
          normalizeAuthor(entry.authorName) === normalizedAuthor,
      ),
    };
  });
}

export function formatKanbanReactionPreview(
  summaries: KanbanReactionSummary[],
) {
  return summaries
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.emoji}${entry.count > 1 ? ` ${entry.count}` : ""}`)
    .join("  ");
}
