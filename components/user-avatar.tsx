"use client";

import { initialsFromName } from "@/lib/auth/avatar";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

type AvatarSource = Pick<UserProfile, "firstName" | "lastName" | "email" | "avatarUrl">;

const SIZE_CLASS = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-16 w-16 text-lg",
} as const;

export function UserAvatar({
  profile,
  name,
  avatarUrl,
  size = "sm",
  className,
}: {
  profile?: AvatarSource | null;
  name?: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const displayName = profile
    ? getUserDisplayName(profile)
    : name?.trim() || "Użytkownik";
  const url = avatarUrl ?? profile?.avatarUrl ?? null;
  const initials = initialsFromName(displayName);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-surface-muted font-semibold text-foreground/80",
        SIZE_CLASS[size],
        className,
      )}
      title={displayName}
      aria-hidden={!url}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

export function UserIdentity({
  profile,
  name,
  avatarUrl,
  size = "sm",
  subtitle,
  className,
}: {
  profile?: AvatarSource | null;
  name?: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  subtitle?: string;
  className?: string;
}) {
  const displayName = profile
    ? getUserDisplayName(profile)
    : name?.trim() || "Użytkownik";

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <UserAvatar profile={profile} name={displayName} avatarUrl={avatarUrl} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
        {subtitle ? <span className="block truncate text-xs text-muted">{subtitle}</span> : null}
      </span>
    </span>
  );
}
