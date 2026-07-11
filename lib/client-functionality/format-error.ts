function withDetails(friendly: string, raw: string) {
  if (raw === friendly || raw.length > 180) {
    return friendly;
  }
  return `${friendly} (${raw})`;
}

export function formatFunctionalitySurveyError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("supabase_service_role_key") || lower.includes("admin setup")) {
    return "Brak klucza SUPABASE_SERVICE_ROLE_KEY na serwerze (Vercel → Environment Variables). Ankieta wymaga go do zapisu odpowiedzi.";
  }

  if (lower.includes("client_functionality_items")) {
    return withDetails(
      "Brak kolumny client_functionality_items w katalogu specyfikacji. Uruchom migrację 117 w SQL Editor.",
      message,
    );
  }

  if (
    lower.includes("project_functionality") &&
    (lower.includes("schema cache") || lower.includes("pgrst205") || lower.includes("could not find"))
  ) {
    return withDetails(
      "Supabase nie odświeżył jeszcze cache API po migracji. W SQL Editor uruchom: NOTIFY pgrst, 'reload schema'; albo Settings → API → Reload schema.",
      message,
    );
  }

  if (lower.includes("schema cache") || lower.includes("pgrst205")) {
    return withDetails(
      "Cache API Supabase jest nieaktualny. Uruchom w SQL Editor: NOTIFY pgrst, 'reload schema';",
      message,
    );
  }

  if (lower.includes("does not exist") || lower.includes("could not find")) {
    return withDetails(
      "Błąd odczytu z bazy. Jeśli migracja 117 przesłała poprawnie, odśwież cache API (NOTIFY pgrst, 'reload schema';) i sprawdź czy Vercel ma ten sam NEXT_PUBLIC_SUPABASE_URL co lokalnie.",
      message,
    );
  }

  return message;
}
