export const CHAT_ROOM_KINDS = ["main", "client", "custom"] as const;
export type ChatRoomKind = (typeof CHAT_ROOM_KINDS)[number];

export const CHAT_ATTACHMENT_KINDS = ["image", "video", "pdf", "office", "cad", "other"] as const;
export type ChatAttachmentKind = (typeof CHAT_ATTACHMENT_KINDS)[number];

export type ChatRoom = {
  id: string;
  projectId: string;
  clientId: string | null;
  serviceIntakeRequestId: string | null;
  kind: ChatRoomKind;
  name: string;
  slug: string;
  isDefault: boolean;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatRoomMember = {
  id: string;
  roomId: string;
  profileId: string;
  roleInRoom: "owner" | "member";
  muted: boolean;
  pinnedRoom: boolean;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  addedBy: string | null;
  createdAt: string;
};

export type ChatMessageSystemPayload = {
  entity?: string;
  id?: string;
  href?: string;
  [key: string]: unknown;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  authorId: string | null;
  isSystem: boolean;
  systemEventKind: string | null;
  systemEventPayload: ChatMessageSystemPayload | null;
  body: string;
  replyToId: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  isImportant: boolean;
  createdAt: string;
};

export type ChatAttachment = {
  id: string;
  messageId: string;
  projectDocumentId: string | null;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string;
  kind: ChatAttachmentKind;
  createdAt: string;
};

export type ChatReaction = {
  id: string;
  messageId: string;
  profileId: string;
  emoji: string;
  createdAt: string;
};

export type ChatRead = {
  id: string;
  messageId: string;
  profileId: string;
  readAt: string;
};

export type ChatMention = {
  id: string;
  messageId: string;
  mentionedProfileId: string | null;
  isAll: boolean;
  createdAt: string;
};

export type ChatPin = {
  id: string;
  roomId: string;
  messageId: string;
  pinnedBy: string | null;
  createdAt: string;
};

export type ChatClientMember = {
  id: string;
  clientId: string;
  profileId: string;
  isPrimary: boolean;
  createdAt: string;
};

/** Wiadomość z rozszerzonymi danymi dla UI (autor, reakcje, przeczytania, załączniki). */
export type ChatMessageWithExtras = ChatMessage & {
  authorName: string | null;
  authorAvatarUrl: string | null;
  reactions: ChatReaction[];
  attachments: ChatAttachment[];
  readByProfileIds: string[];
  replyTo: Pick<ChatMessage, "id" | "body" | "authorId" | "isDeleted"> | null;
};

export const CHAT_ROOM_DEFAULT_SLUGS = {
  main: "general",
  client: "client",
} as const;

export const CHAT_ROOM_DEFAULT_NAMES = {
  main: "Główny",
  client: "Klient",
} as const;

const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;

function stripDiacritics(value: string) {
  let result = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < COMBINING_MARK_START || code > COMBINING_MARK_END) {
      result += char;
    }
  }
  return result;
}

export function slugifyRoomName(name: string) {
  const base = stripDiacritics(name.trim().toLowerCase().normalize("NFD"))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return base || "pokoj";
}
