"use client";

import { Select } from "@/components/ui/input";
import {
  STAFF_ROLES,
  USER_ROLE_LABELS,
  getUserDisplayName,
  type UserProfile,
  type UserRole,
} from "@/lib/auth/types";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";

export function teamProfileOptionLabel(profile: UserProfile) {
  return `${profileToOptionLabel(profile)} · ${USER_ROLE_LABELS[profile.role]}`;
}

export function TeamProfileSelect({
  value,
  onChange,
  teamProfiles,
  disabled,
  placeholder = "— wybierz osobę —",
  roles = STAFF_ROLES,
}: {
  value: string;
  onChange: (profileId: string, profile: UserProfile | null) => void;
  teamProfiles: UserProfile[];
  disabled?: boolean;
  placeholder?: string;
  /** Ogranicza wybór do wskazanych ról (domyślnie wszystkie role wewnętrzne). */
  roles?: readonly UserRole[];
}) {
  const grouped = roles.map((role) => ({
    role,
    profiles: teamProfiles.filter((profile) => profile.role === role),
  })).filter((group) => group.profiles.length > 0);

  return (
    <Select
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const profileId = event.target.value;
        const profile = teamProfiles.find((entry) => entry.id === profileId) ?? null;
        onChange(profileId, profile);
      }}
    >
      <option value="">{placeholder}</option>
      {grouped.map(({ role, profiles }) => (
        <optgroup key={role} label={USER_ROLE_LABELS[role]}>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {getUserDisplayName(profile)}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
