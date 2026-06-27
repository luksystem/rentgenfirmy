"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

type RichTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
};

export function RichTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
  disabled = false,
}: RichTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const applyCommand = useCallback(
    (command: string, commandValue?: string) => {
      if (disabled) {
        return;
      }
      editorRef.current?.focus();
      document.execCommand(command, false, commandValue);
      onChange(editorRef.current?.innerHTML ?? "");
    },
    [disabled, onChange],
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-surface-muted/20 p-1">
        <button
          type="button"
          disabled={disabled}
          title="Pogrubienie"
          className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-50"
          onClick={() => applyCommand("bold")}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          title="Kursywa"
          className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-50"
          onClick={() => applyCommand("italic")}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          title="Podkreślenie"
          className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-50"
          onClick={() => applyCommand("underline")}
        >
          <Underline className="h-4 w-4" />
        </button>
        <select
          disabled={disabled}
          className="rounded-lg border border-border/60 bg-surface px-2 py-1 text-xs text-foreground"
          defaultValue=""
          onChange={(event) => {
            const size = event.target.value;
            if (size) {
              applyCommand("fontSize", size);
            }
            event.currentTarget.value = "";
          }}
        >
          <option value="">Rozmiar</option>
          <option value="2">Mały</option>
          <option value="3">Normalny</option>
          <option value="4">Duży</option>
          <option value="5">Bardzo duży</option>
        </select>
        <input
          type="color"
          disabled={disabled}
          title="Kolor tekstu"
          className="h-8 w-8 cursor-pointer rounded-lg border border-border/60 bg-surface p-0.5"
          onChange={(event) => applyCommand("foreColor", event.target.value)}
        />
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          "min-h-[calc(1.5rem*var(--rows))] rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-accent/40",
          "empty:before:text-muted empty:before:content-[attr(data-placeholder)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
        style={{ ["--rows" as string]: String(rows) }}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}
