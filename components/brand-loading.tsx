"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/icons/rentgen-logo-mark-transparent-1024.png";

/** Animowane logo Rentgen na czas ładowania danych. */
export function BrandLoading({
  size = 36,
  label = "Ładowanie…",
  className,
  labelClassName,
}: {
  size?: number;
  label?: string | null;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 text-sm text-muted", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="relative inline-flex items-center justify-center">
        <span
          className="absolute inset-[-18%] rounded-full bg-accent/15 animate-ping"
          style={{ animationDuration: "1.6s" }}
          aria-hidden
        />
        <Image
          src={LOGO_SRC}
          alt=""
          width={size}
          height={size}
          className="relative shrink-0 animate-pulse object-contain"
          style={{ animationDuration: "1.2s" }}
          priority
        />
      </span>
      {label ? <span className={cn("text-center", labelClassName)}>{label}</span> : null}
      <span className="sr-only">{label ?? "Ładowanie"}</span>
    </div>
  );
}

/** Kompaktowy wariant w jednej linii (panele, karty). */
export function BrandLoadingInline({
  size = 18,
  label = "Ładowanie…",
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <p
      className={cn("flex items-center gap-2 text-sm text-muted", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Image
        src={LOGO_SRC}
        alt=""
        width={size}
        height={size}
        className="shrink-0 animate-pulse object-contain"
        style={{ animationDuration: "1.1s" }}
        priority
      />
      <span>{label}</span>
    </p>
  );
}
