"use client";

import { PageHeader } from "@/components/page-header";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function ChatPage() {
  return (
    <>
      <PageHeader eyebrow="Komunikacja" title="Czat" description="Rozmowy projektowe, z klientami i serwisem — w jednym miejscu." />
      <ChatPanel />
    </>
  );
}
