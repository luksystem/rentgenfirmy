"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/store/auth-store";

export function AccountHeaderButton() {
  const profile = useAuthStore((state) => state.profile);

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="shrink-0 px-2"
      asChild
    >
      <Link href="/konto" aria-label="Ustawienia konta" title="Ustawienia konta">
        {profile?.avatarUrl ? (
          <UserAvatar profile={profile} size="xs" className="border-transparent" />
        ) : (
          <UserCircle className="h-4 w-4" />
        )}
      </Link>
    </Button>
  );
}
