"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "👏"];

export function ChatEmojiPicker({
  onSelect,
  className,
  align = "left",
}: {
  onSelect: (emoji: string) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
        onClick={() => setOpen((value) => !value)}
        title="Emoji"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute bottom-full z-50 mb-2 flex gap-1 rounded-xl border border-border bg-surface-elevated p-2 shadow-card",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded-lg p-1.5 text-lg transition hover:bg-surface-muted"
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
