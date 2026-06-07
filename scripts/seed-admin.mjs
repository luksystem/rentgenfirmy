/**
 * Tworzy domyślnego administratora aplikacji.
 * Uruchom: npm run seed:admin
 *
 * Wymaga w .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "biuro@luksystem.pl";
const ADMIN_PASSWORD = "Luksystem1234";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw error;
  }
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function main() {
  let user = await findUserByEmail(ADMIN_EMAIL);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: "Admin",
        last_name: "Luksystem",
        role: "administrator",
      },
    });

    if (error || !data.user) {
      throw error ?? new Error("Nie udało się utworzyć administratora.");
    }

    user = data.user;
    console.log("Utworzono konto administratora:", ADMIN_EMAIL);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      ban_duration: "none",
      user_metadata: {
        first_name: "Admin",
        last_name: "Luksystem",
        role: "administrator",
      },
    });

    if (error) {
      throw error;
    }

    console.log("Zaktualizowano konto administratora:", ADMIN_EMAIL);
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: ADMIN_EMAIL,
      first_name: "Admin",
      last_name: "Luksystem",
      phone: "",
      role: "administrator",
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  console.log("Profil administratora gotowy.");
  console.log(`E-mail: ${ADMIN_EMAIL}`);
  console.log(`Hasło: ${ADMIN_PASSWORD}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
