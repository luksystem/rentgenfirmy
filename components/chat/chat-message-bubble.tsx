"use client";

import { useEffect, useState } from "react";
import { CheckCheck, File as FileIcon, MoreHorizontal, Pencil, Pin, Reply, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachment, ChatMessageWithExtras } from "@/lib/chat/types";
import { ChatEmojiPicker } from "@/components/chat/chat-emoji-picker";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function ChatAttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (attachment.kind !== "image") return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/chat/attachments/${attachment.id}/signed-url`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.url) setUrl(data.url);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.id, attachment.kind]);

  async function handleOpen() {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/attachments/${attachment.id}/signed-url`, { credentials: "include" });
      const data = await res.json();
      if (data?.url) {
        setUrl(data.url);
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setLoading(false);
    }
  }

  if (attachment.kind === "image") {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="block max-w-[240px] overflow-hidden rounded-xl border border-border/60 bg-surface-muted"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={attachment.fileName} className="max-h-60 w-full object-cover" />
        ) : (
          <span className="flex h-32 items-center justify-center text-xs text-muted">
            {loading ? "Ładowanie…" : attachment.fileName}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="flex max-w-[260px] items-center gap-2 rounded-xl border border-border/60 bg-surface-muted px-3 py-2 text-left text-xs text-foreground/85 transition hover:bg-surface"
    >
      <FileIcon className="h-4 w-4 shrink-0 text-muted" />
      <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
    </button>
  );
}

type ChatMessageBubbleProps = {
  message: ChatMessageWithExtras;
  isOwn: boolean;
  canModerate: boolean;
  currentProfileId: string;
  onReply: (message: ChatMessageWithExtras) => void;
  onEdit: (message: ChatMessageWithExtras) => void;
  onDelete: (message: ChatMessageWithExtras) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onTogglePin: (messageId: string) => void;
  isPinned: boolean;
};

export function ChatMessageBubble({
  message,
  isOwn,
  canModerate,
  currentProfileId,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onTogglePin,
  isPinned,
}: ChatMessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (message.isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-muted">{message.body}</span>
      </div>
    );
  }

  const reactionGroups = message.reactions.reduce<Record<string, { count: number; own: boolean }>>((acc, reaction) => {
    const entry = acc[reaction.emoji] ?? { count: 0, own: false };
    entry.count += 1;
    if (reaction.profileId === currentProfileId) entry.own = true;
    acc[reaction.emoji] = entry;
    return acc;
  }, {});

  return (
    <div className={cn("group flex gap-2 px-4 py-1.5", isOwn && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          isOwn ? "bg-accent/20 text-accent" : "bg-surface-muted text-foreground/70",
        )}
      >
        {initials(message.authorName)}
      </div>

      <div className={cn("flex min-w-0 max-w-[75%] flex-col", isOwn && "items-end")}>
        <div className="flex items-baseline gap-2">
          {!isOwn ? <span className="text-xs font-medium text-foreground/80">{message.authorName ?? "Ktoś"}</span> : null}
          <span className="text-[11px] text-muted">{formatTime(message.createdAt)}</span>
          {message.isEdited ? <span className="text-[11px] text-muted">(edytowano)</span> : null}
          {isPinned ? <Pin className="h-3 w-3 text-accent" /> : null}
          {message.isImportant ? <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> : null}
        </div>

        {message.replyTo ? (
          <div className="mt-1 rounded-lg border-l-2 border-accent/50 bg-surface-muted/60 px-2 py-1 text-xs text-muted">
            {message.replyTo.isDeleted ? "Wiadomość usunięta" : message.replyTo.body.slice(0, 120)}
          </div>
        ) : null}

        <div
          className={cn(
            "relative mt-1 rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isOwn ? "bg-accent text-accent-foreground" : "bg-surface-muted text-foreground",
          )}
        >
          {message.isDeleted ? (
            <span className="italic opacity-70">Wiadomość usunięta</span>
          ) : (
            <span className="whitespace-pre-wrap break-words">{message.body}</span>
          )}
        </div>

        {message.attachments.length > 0 && !message.isDeleted ? (
          <div className="mt-1 flex flex-col gap-1.5">
            {message.attachments.map((attachment) => (
              <ChatAttachmentCard key={attachment.id} attachment={attachment} />
            ))}
          </div>
        ) : null}

        {Object.keys(reactionGroups).length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(reactionGroups).map(([emoji, info]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction(message.id, emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs",
                  info.own ? "border-accent/50 bg-accent/10 text-accent" : "border-border/60 bg-surface text-foreground/70",
                )}
              >
                <span>{emoji}</span>
                <span>{info.count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {isOwn && message.readByProfileIds.length > 0 ? (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
            <CheckCheck className="h-3 w-3" />
            <span>Przeczytane</span>
          </div>
        ) : null}
      </div>

      {!message.isDeleted ? (
        <div
          className={cn(
            "flex shrink-0 items-start gap-0.5 opacity-0 transition group-hover:opacity-100",
            isOwn && "flex-row-reverse",
          )}
        >
          <ChatEmojiPicker onSelect={(emoji) => onToggleReaction(message.id, emoji)} align={isOwn ? "right" : "left"} />
          <button
            type="button"
            onClick={() => onReply(message)}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
            title="Odpowiedz"
          >
            <Reply className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className={cn(
                    "absolute top-full z-50 mt-1 w-48 rounded-xl border border-border bg-surface-elevated p-1 text-sm shadow-card",
                    isOwn ? "right-0" : "left-0",
                  )}
                >
                  {isOwn ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-muted"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(message);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edytuj
                    </button>
                  ) : null}
                  {canModerate ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-muted"
                      onClick={() => {
                        setMenuOpen(false);
                        onTogglePin(message.id);
                      }}
                    >
                      <Pin className="h-3.5 w-3.5" /> {isPinned ? "Odepnij" : "Przypnij"}
                    </button>
                  ) : null}
                  {isOwn || canModerate ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-rose-400 hover:bg-rose-500/10"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(message);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Usuń
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
