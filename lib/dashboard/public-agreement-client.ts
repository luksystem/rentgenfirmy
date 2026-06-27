import type { ProjectAgreementInput, ProjectClientAgreement } from "@/lib/dashboard/agreement-types";

async function parseJson<T>(response: Response): Promise<T> {
  let payload: T & { error?: string };
  try {
    payload = (await response.json()) as T & { error?: string };
  } catch {
    throw new Error("Nie udało się odczytać odpowiedzi serwera.");
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "Operacja nie powiodła się.");
  }

  return payload;
}

export async function createPublicClientAgreement(
  token: string,
  projectId: string,
  input: ProjectAgreementInput,
  authorName: string,
): Promise<{ agreement: ProjectClientAgreement; publicUrl: string | null }> {
  const search = new URLSearchParams({ projectId });
  const response = await fetch(
    `/api/przestrzen/${encodeURIComponent(token)}/agreements?${search.toString()}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, authorName, enablePublicLink: true }),
    },
  );

  return parseJson(response);
}
