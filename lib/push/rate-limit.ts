import { PUSH_TEST_RATE_LIMIT_MS } from "@/lib/push/types";

const lastTestByUser = new Map<string, number>();

export function checkPushTestRateLimit(userId: string) {
  const now = Date.now();
  const last = lastTestByUser.get(userId);

  if (last && now - last < PUSH_TEST_RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((PUSH_TEST_RATE_LIMIT_MS - (now - last)) / 1000);
    throw new Error(`Poczekaj ${waitSeconds} s przed kolejnym testem.`);
  }

  lastTestByUser.set(userId, now);
}

/** Tylko do testów jednostkowych. */
export function resetPushTestRateLimitForTests() {
  lastTestByUser.clear();
}
