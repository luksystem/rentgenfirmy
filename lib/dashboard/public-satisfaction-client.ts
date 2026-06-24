import type {
  AgreementFulfillment,
  AgreementFulfillmentInput,
  ProjectSatisfactionBundle,
  ProjectSatisfactionOverview,
  ProjectSatisfactionOverviewInput,
  SpecificationFulfillment,
  SpecificationFulfillmentInput,
  StageSatisfaction,
  StageSatisfactionInput,
} from "@/lib/dashboard/satisfaction-types";

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

function satisfactionUrl(token: string, projectId: string) {
  const search = new URLSearchParams({ projectId });
  return `/api/przestrzen/${encodeURIComponent(token)}/satisfaction?${search.toString()}`;
}

export async function fetchPublicSatisfactionBundle(
  token: string,
  projectId: string,
): Promise<ProjectSatisfactionBundle> {
  const response = await fetch(satisfactionUrl(token, projectId), { credentials: "include" });
  const payload = await parseJson<{ bundle: ProjectSatisfactionBundle }>(response);
  return payload.bundle;
}

type SaveResponse =
  | { kind: "agreement"; entry: AgreementFulfillment }
  | { kind: "specification"; entry: SpecificationFulfillment }
  | { kind: "stage"; entry: StageSatisfaction }
  | { kind: "overview"; entry: ProjectSatisfactionOverview };

async function savePublicSatisfaction(
  token: string,
  projectId: string,
  body: Record<string, unknown>,
): Promise<SaveResponse> {
  const response = await fetch(satisfactionUrl(token, projectId), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<SaveResponse>(response);
}

export async function savePublicAgreementFulfillment(
  token: string,
  projectId: string,
  input: AgreementFulfillmentInput,
): Promise<AgreementFulfillment> {
  const response = await savePublicSatisfaction(token, projectId, { action: "agreement", input });
  if (response.kind !== "agreement") {
    throw new Error("Nieprawidłowa odpowiedź serwera.");
  }
  return response.entry;
}

export async function savePublicSpecificationFulfillment(
  token: string,
  projectId: string,
  input: SpecificationFulfillmentInput,
): Promise<SpecificationFulfillment> {
  const response = await savePublicSatisfaction(token, projectId, { action: "specification", input });
  if (response.kind !== "specification") {
    throw new Error("Nieprawidłowa odpowiedź serwera.");
  }
  return response.entry;
}

export async function savePublicStageSatisfaction(
  token: string,
  projectId: string,
  input: StageSatisfactionInput,
): Promise<StageSatisfaction> {
  const response = await savePublicSatisfaction(token, projectId, { action: "stage", input });
  if (response.kind !== "stage") {
    throw new Error("Nieprawidłowa odpowiedź serwera.");
  }
  return response.entry;
}

export async function savePublicSatisfactionOverview(
  token: string,
  projectId: string,
  input: ProjectSatisfactionOverviewInput,
): Promise<ProjectSatisfactionOverview> {
  const response = await savePublicSatisfaction(token, projectId, { action: "overview", input });
  if (response.kind !== "overview") {
    throw new Error("Nieprawidłowa odpowiedź serwera.");
  }
  return response.entry;
}
