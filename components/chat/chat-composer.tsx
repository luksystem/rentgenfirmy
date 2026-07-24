"use client";

import { useMemo, useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChatEmojiPicker } from "@/components/chat/chat-emoji-picker";
import { buildAllMentionToken, buildMentionToken } from "@/lib/chat/mentions";
import { validateChatAttachmentFile } from "@/lib/chat/attachments";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessageWithExtras } from "@/lib/chat/types";

type MemberOption = { profileId: string; firstName: string; lastName: string };

type ChatComposerProps = {
  roomId: string;
  members: MemberOption[];
  replyTo: ChatMessageWithExtras | null;
  onCancelReply: () => void;
  onSent: () => void;
  onTyping: () => void;
};

export function ChatComposer({ roomId, members, replyTo, onCancelReply, onSent, onTyping }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sendTextMessage = useChatStore((state) => state.sendTextMessage);

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    const options = members.map((member) => ({ member, token: buildMentionToken(member).slice(1).toLowerCase() }));
    return options.filter(({ token }) => token.startsWith(query)).slice(0, 6);
  }, [mentionQuery, members]);

  function handleTextChange(value: string) {
    setText(value);
    onTyping();
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const uptoCaret = value.slice(0, caret);
    const match = uptoCaret.match(/@([a-zA-Z0-9]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(token: string) {
    const caret = textareaRef.current?.selectionStart ?? text.length;
    const uptoCaret = text.slice(0, caret);
    const replaced = uptoCaret.replace(/@([a-zA-Z0-9]*)$/, `${token} `);
    const nextText = replaced + text.slice(caret);
    setText(nextText);
    setMentionQuery(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleFileSelect(selected: File | null) {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    try {
      validateChatAttachmentFile(selected);
      setFile(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieprawidłowy plik.");
    }
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    setSending(true);
    setError(null);
    try {
      if (file) {
        const formData = new FormData();
        formData.append("roomId", roomId);
        formData.append("body", trimmed);
        formData.append("file", file);
        if (replyTo) formData.append("replyToId", replyTo.id);
        const response = await fetch("/api/chat/attachments", { method: "POST", credentials: "include", body: formData });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Nie udało się wysłać załącznika.");
        }
      } else {
        await sendTextMessage(roomId, trimmed, replyTo?.id ?? null);
      }
      setText("");
      setFile(null);
      onCancelReply();
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wysłać wiadomości.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={cn("border-t border-border/70 p-3", dragOver && "bg-accent/5")}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) handleFileSelect(dropped);
      }}
    >
      {replyTo ? (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-1.5 text-xs text-muted">
          <span className="truncate">Odpowiedź na: {replyTo.body.slice(0, 80)}</span>
          <button type="button" onClick={onCancelReply} className="shrink-0 rounded p-0.5 hover:bg-surface">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {file ? (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-1.5 text-xs text-foreground/80">
          <span className="truncate">📎 {file.name}</span>
          <button type="button" onClick={() => handleFileSelect(null)} className="shrink-0 rounded p-0.5 hover:bg-surface">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {error ? <p className="mb-2 text-xs text-rose-400">{error}</p> : null}

      <div className="relative flex items-end gap-2">
        {mentionCandidates.length > 0 ? (
          <div className="absolute bottom-full left-0 mb-1 w-56 rounded-xl border border-border bg-surface-elevated p-1 text-sm shadow-card">
            <button
              type="button"
              className="flex w-full items-center rounded-lg px-2 py-1.5 text-left hover:bg-surface-muted"
              onClick={() => insertMention(buildAllMentionToken())}
            >
              @wszyscy
            </button>
            {mentionCandidates.map(({ member, token }) => (
              <button
                key={member.profileId}
                type="button"
                className="flex w-full items-center rounded-lg px-2 py-1.5 text-left hover:bg-surface-muted"
                onClick={() => insertMention(`@${token}`)}
              >
                {member.firstName} {member.lastName}
              </button>
            ))}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mb-1 shrink-0 rounded-lg p-2 text-muted transition hover:bg-surface-muted hover:text-foreground"
          title="Dodaj załącznik"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Napisz wiadomość… (@ dla wzmianki)"
          rows={1}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40"
        />

        <ChatEmojiPicker className="mb-1" onSelect={(emoji) => setText((value) => `${value}${emoji}`)} align="right" />

        <Button type="button" size="sm" className="mb-0.5 h-9" disabled={sending || (!text.trim() && !file)} onClick={() => void handleSend()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
