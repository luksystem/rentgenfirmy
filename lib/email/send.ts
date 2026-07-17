type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendTransactionalEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ?? "Rentgen firmy <noreply@rentgen.luksystem.pl>";
  const replyTo =
    input.replyTo?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim() ||
    "biuro@luksystem.pl";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY missing — skipping send:", input.subject, input.to);
    return { ok: false as const, skipped: true as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: replyTo,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Email API error ${response.status}`);
  }

  return { ok: true as const, skipped: false as const };
}
