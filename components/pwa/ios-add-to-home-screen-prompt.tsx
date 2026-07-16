"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIosDevice, isStandaloneDisplay } from "@/lib/pwa/ios";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "rentgen-ios-a2hs-dismissed-at";
/** Po zamknięciu pokaż ponownie następnego dnia. */
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

const HIDDEN_PATH_PREFIXES = [
  "/przestrzen",
  "/oferta",
  "/kanban",
  "/odbior",
  "/element",
  "/ustalenie",
  "/zgloszenie",
  "/public",
  "/sri",
  "/ankieta",
] as const;

function wasDismissedRecently() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) {
      return false;
    }
    return Date.now() - dismissedAt < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function shouldHideForPath(pathname: string) {
  return HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function IosAddToHomeScreenPrompt({ className }: { className?: string }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldHideForPath(pathname)) {
      setVisible(false);
      return;
    }
    if (!isIosDevice() || isStandaloneDisplay() || wasDismissedRecently()) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [pathname]);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore quota / private mode
    }
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  const aboveMobileNav =
    pathname !== "/logowanie" &&
    pathname !== "/rejestracja" &&
    !pathname.startsWith("/logowanie/") &&
    !pathname.startsWith("/rejestracja/");

  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-3 z-40 mx-auto max-w-lg",
        aboveMobileNav
          ? "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5rem))] xl:bottom-6"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="rounded-2xl border border-border bg-surface-elevated/95 p-4 shadow-card backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Używaj Rentgena jak aplikacji</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Dodaj go do ekranu początkowego iPhone’a — otworzy się pełnoekranowo, bez paska Safari.
            </p>
            <ol className="mt-3 grid gap-1.5 text-xs text-foreground/90">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-accent">1.</span>
                <span>
                  Dotknij{" "}
                  <span className="inline-flex items-center gap-1 font-medium">
                    Udostępnij
                    <Share className="inline h-3.5 w-3.5" aria-hidden />
                  </span>{" "}
                  na dole Safari
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-accent">2.</span>
                <span>
                  Wybierz <span className="font-medium">Do ekranu początkowego</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-accent">3.</span>
                <span>
                  Potwierdź <span className="font-medium">Dodaj</span>
                </span>
              </li>
            </ol>
            <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={dismiss}>
              Rozumiem
            </Button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="Zamknij wskazówkę"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
