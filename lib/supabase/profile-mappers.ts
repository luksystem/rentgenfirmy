import type { UserProfile, UserProfileInput, UserRole } from "@/lib/auth/types";
import type { ProfileInsert, ProfileRow, ProfileUpdate } from "@/lib/supabase/database.types";

export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    role: row.role as UserRole,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfileInputToInsert(
  id: string,
  input: UserProfileInput,
): ProfileInsert {
  return {
    id,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    is_active: input.isActive,
  };
}

export function mapProfileInputToUpdate(input: UserProfileInput): ProfileUpdate {
  return {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };
}
