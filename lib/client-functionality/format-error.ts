export function formatFunctionalitySurveyError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("schema cache")) {
    return "Supabase nie odświeżył jeszcze cache API po migracji. W dashboardzie Supabase wybierz Settings → API → Reload schema, potem odśwież tę stronę.";
  }

  if (
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("pgrst205")
  ) {
    return "Brak tabel ankiety w bazie albo cache API jest nieaktualny. Uruchom w SQL Editor migrację 117, następnie 118 (reload cache), albo ręcznie: NOTIFY pgrst, 'reload schema';";
  }

  if (lower.includes("supabase_service_role_key")) {
    return "Brak klucza SUPABASE_SERVICE_ROLE_KEY na serwerze (Vercel → Environment Variables). Ankieta wymaga go do zapisu odpowiedzi.";
  }

  return message;
}
