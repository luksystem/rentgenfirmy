export async function verifyTurnstileToken(token: string | null | undefined, remoteIp?: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!token?.trim()) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });

  if (remoteIp?.trim()) {
    body.set("remoteip", remoteIp.trim());
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as { success?: boolean };
  return payload.success === true;
}
