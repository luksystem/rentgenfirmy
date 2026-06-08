export const ADMIN_SETUP_ERROR_CODE = "ADMIN_SERVICE_ROLE_MISSING";

export function getAdminSetupErrorMessage() {
  return "Brak klucza SUPABASE_SERVICE_ROLE_KEY po stronie serwera.";
}

export const ADMIN_SETUP_STEPS = [
  "Supabase → Settings → API → skopiuj klucz service_role (secret, nie anon).",
  "Lokalnie: dodaj SUPABASE_SERVICE_ROLE_KEY=... do pliku .env.local.",
  "Na Vercel: Settings → Environment Variables → dodaj SUPABASE_SERVICE_ROLE_KEY (bez prefiksu NEXT_PUBLIC_).",
  "Po zmianie na Vercel kliknij Redeploy — zmienne serwerowe wczytują się przy buildzie.",
  "Opcjonalnie uruchom lokalnie: npm run seed:admin (tworzy konto biuro@luksystem.pl).",
] as const;
