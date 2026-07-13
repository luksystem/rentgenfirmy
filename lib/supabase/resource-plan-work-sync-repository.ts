async function parseOk(response: Response, fallbackError: string) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? fallbackError);
  }
}

/** Synchronizuje status przydziału planu zasobów do powiązanych zadań w Moja praca. */
export async function syncResourcePlanItemToWorkItems(planItemId: string) {
  const response = await fetch(`/api/my-work/resource-plan-items/${planItemId}/sync`, {
    method: "POST",
    credentials: "include",
  });
  await parseOk(response, "Nie udało się zsynchronizować przydziału z zadaniami.");
}
