"use client";

import { use } from "react";
import { PageHeader } from "@/components/page-header";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);

  return (
    <>
      <PageHeader eyebrow="Komunikacja" title="Czat" description="Rozmowy projektowe, z klientami i serwisem — w jednym miejscu." />
      <ChatPanel initialRoomId={roomId} />
    </>
  );
}
