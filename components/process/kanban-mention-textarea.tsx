"use client";

import { useEffect, useRef, useState } from "react";
import { filterMentionOptions } from "@/lib/notifications/mentions";
import { cn } from "@/lib/utils";

const textareaClassName =
  "min-h-24 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/40 focus:bg-surface-elevated focus:ring-2 focus:ring-accent/20";

export function KanbanMentionTextarea({
  value,
  onChange,
  mentionOptions,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  mentionOptions: string[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const suggestions =
    query === null ? [] : filterMentionOptions(query, mentionOptions).slice(0, 6);

  function updateQueryFromCursor(nextValue: string, cursor: number) {
    const before = nextValue.slice(0, cursor);
    const match = before.match(/@([^\n@]*)$/);
    if (!match) {
      setQuery(null);
      return;
    }
    setQuery(`@${match[1] ?? ""}`);
    setActiveIndex(0);
  }

  function insertMention(name: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const match = before.match(/@([^\n@]*)$/);
    if (!match) {
      return;
    }

    const prefix = before.slice(0, match.index);
    const nextValue = `${prefix}@${name} ${after}`;
    onChange(nextValue);
    setQuery(null);

    requestAnimationFrame(() => {
      const nextCursor = `${prefix}@${name} `.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!suggestions.length || query === null) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertMention(suggestions[activeIndex] ?? suggestions[0]);
    }

    if (event.key === "Escape") {
      setQuery(null);
    }
  }

  useEffect(() => {
    if (activeIndex >= suggestions.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, suggestions.length]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        className={textareaClassName}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          updateQueryFromCursor(event.target.value, event.target.selectionStart ?? event.target.value.length);
        }}
        onClick={(event) =>
          updateQueryFromCursor(
            event.currentTarget.value,
            event.currentTarget.selectionStart ?? event.currentTarget.value.length,
          )
        }
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(() => setQuery(null), 120);
        }}
      />
      {suggestions.length > 0 && query !== null ? (
        <div className="absolute inset-x-0 bottom-full z-20 mb-1 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-card">
          {suggestions.map((name, index) => (
            <button
              key={name}
              type="button"
              className={cn(
                "flex w-full px-3 py-2 text-left text-sm transition",
                index === activeIndex
                  ? "bg-accent/10 text-foreground"
                  : "text-muted hover:bg-surface-muted/40 hover:text-foreground",
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                insertMention(name);
              }}
            >
              @{name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
