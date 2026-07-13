import { PUSH_BODY_MAX_LENGTH, PUSH_TITLE_MAX_LENGTH, type PushPayload } from "@/lib/push/types";

export function validatePushPayload(payload: unknown): PushPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Nieprawidłowy payload powiadomienia.");
  }

  const input = payload as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";

  if (!title) {
    throw new Error("Tytuł powiadomienia jest wymagany.");
  }
  if (title.length > PUSH_TITLE_MAX_LENGTH) {
    throw new Error(`Tytuł może mieć maksymalnie ${PUSH_TITLE_MAX_LENGTH} znaków.`);
  }
  if (!body) {
    throw new Error("Treść powiadomienia jest wymagana.");
  }
  if (body.length > PUSH_BODY_MAX_LENGTH) {
    throw new Error(`Treść może mieć maksymalnie ${PUSH_BODY_MAX_LENGTH} znaków.`);
  }

  const result: PushPayload = { title, body };

  if (typeof input.url === "string" && input.url.trim()) {
    result.url = input.url.trim();
  }
  if (typeof input.tag === "string" && input.tag.trim()) {
    result.tag = input.tag.trim().slice(0, 64);
  }
  if (typeof input.icon === "string" && input.icon.trim()) {
    result.icon = input.icon.trim();
  }
  if (typeof input.badge === "string" && input.badge.trim()) {
    result.badge = input.badge.trim();
  }
  if (typeof input.notificationId === "string" && input.notificationId.trim()) {
    result.notificationId = input.notificationId.trim().slice(0, 64);
  }

  return result;
}

export function buildTestPushPayload(): PushPayload {
  return {
    title: "Test powiadomienia push",
    body: "Powiadomienia Web Push działają poprawnie na tym urządzeniu.",
    url: "/moja-praca/powiadomienia",
    tag: "push-test",
  };
}
