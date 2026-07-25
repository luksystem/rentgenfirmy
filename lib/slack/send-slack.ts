import "server-only";

/**
 * Wysyłka DM na Slacku przez Bot Token (chat.postMessage) — bez OAuth po stronie aplikacji.
 * Wymaga w .env.local: SLACK_BOT_TOKEN (z uprawnieniem chat:write, Bot User zaproszony do
 * workspace'u) oraz `slack_user_id` ustawionego na profilu odbiorcy (np. "U0123ABC456", widoczny
 * w Slacku pod "Copy member ID"). Brak konfiguracji = no-op z ostrzeżeniem w logu, tak jak
 * lib/email/send.ts przy braku RESEND_API_KEY.
 */
export async function sendSlackDirectMessage(input: {
  slackUserId: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; skipped: true } | { ok: false; error: string }> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const slackUserId = input.slackUserId.trim();

  if (!token) {
    console.warn("[slack] SLACK_BOT_TOKEN missing — skipping send to", slackUserId);
    return { ok: false, skipped: true };
  }
  if (!slackUserId) {
    return { ok: false, error: "Brak slack_user_id odbiorcy." };
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: slackUserId, text: input.text }),
  });

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !payload?.ok) {
    return { ok: false, error: payload?.error || `Slack API error ${response.status}` };
  }
  return { ok: true };
}
