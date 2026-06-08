import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  ADMIN_SETUP_ERROR_CODE,
  getAdminSetupErrorMessage,
} from "@/lib/auth/admin-setup";

export { ADMIN_SETUP_ERROR_CODE };

export function isSupabaseAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const error = new Error(getAdminSetupErrorMessage()) as Error & { code?: string };
    error.code = ADMIN_SETUP_ERROR_CODE;
    throw error;
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
