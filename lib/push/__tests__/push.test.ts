import { describe, expect, it } from "vitest";
import { buildTestPushPayload, validatePushPayload } from "@/lib/push/payload";
import { checkPushTestRateLimit, resetPushTestRateLimitForTests } from "@/lib/push/rate-limit";
import { validateSubscriptionInput } from "@/lib/push/subscription-repository";
import { sanitizeInternalPushUrl } from "@/lib/push/url";
import { urlBase64ToBuffer, urlBase64ToUint8Array } from "@/lib/push/vapid";
import { PUSH_BODY_MAX_LENGTH, PUSH_TITLE_MAX_LENGTH } from "@/lib/push/types";

describe("push vapid", () => {
  it("converts url-safe base64 public key to Uint8Array", () => {
    const sample = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
    const bytes = urlBase64ToUint8Array(sample);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);

    const buffer = urlBase64ToBuffer(sample);
    expect(buffer.length).toBe(bytes.length);
  });
});

describe("push payload validation", () => {
  it("accepts valid payload", () => {
    const payload = validatePushPayload({
      title: "Nowe zadanie",
      body: "Przypisano Ci zadanie w module Moja praca.",
      url: "/moja-praca/zadania",
      tag: "work-item",
    });

    expect(payload.title).toBe("Nowe zadanie");
    expect(payload.url).toBe("/moja-praca/zadania");
  });

  it("rejects empty title and body", () => {
    expect(() => validatePushPayload({ title: "", body: "x" })).toThrow();
    expect(() => validatePushPayload({ title: "x", body: "" })).toThrow();
  });

  it("rejects too long title and body", () => {
    expect(() =>
      validatePushPayload({ title: "x".repeat(PUSH_TITLE_MAX_LENGTH + 1), body: "ok" }),
    ).toThrow();
    expect(() =>
      validatePushPayload({ title: "ok", body: "x".repeat(PUSH_BODY_MAX_LENGTH + 1) }),
    ).toThrow();
  });

  it("builds fixed test payload", () => {
    const payload = buildTestPushPayload();
    expect(payload.title).toContain("Test");
    expect(payload.url).toBe("/moja-praca/powiadomienia");
  });
});

describe("push url sanitization", () => {
  it("allows internal paths", () => {
    expect(sanitizeInternalPushUrl("/moja-praca/zadania")).toBe("/moja-praca/zadania");
    expect(sanitizeInternalPushUrl("/")).toBe("/");
  });

  it("blocks external and dangerous urls", () => {
    expect(() => sanitizeInternalPushUrl("https://evil.example")).toThrow();
    expect(() => sanitizeInternalPushUrl("//evil.example")).toThrow();
    expect(() => sanitizeInternalPushUrl("javascript:alert(1)")).toThrow();
    expect(() => sanitizeInternalPushUrl("relative-without-slash")).toThrow();
  });
});

describe("push subscription validation", () => {
  it("accepts valid subscription input", () => {
    const input = validateSubscriptionInput({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "key", auth: "secret" },
      deviceName: "Laptop",
    });

    expect(input.endpoint).toContain("https://");
    expect(input.keys.p256dh).toBe("key");
  });

  it("rejects subscription without keys", () => {
    expect(() =>
      validateSubscriptionInput({
        endpoint: "https://push.example/sub",
        keys: { p256dh: "", auth: "" },
      }),
    ).toThrow();
  });

  it("rejects invalid endpoint", () => {
    expect(() =>
      validateSubscriptionInput({
        endpoint: "not-https",
        keys: { p256dh: "a", auth: "b" },
      }),
    ).toThrow();
  });
});

describe("push test rate limit", () => {
  it("limits repeated test sends per user", () => {
    resetPushTestRateLimitForTests();
    checkPushTestRateLimit("user-1");
    expect(() => checkPushTestRateLimit("user-1")).toThrow(/Poczekaj/);
  });
});
