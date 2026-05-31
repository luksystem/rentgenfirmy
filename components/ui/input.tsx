import * as React from "react";
import { cn } from "@/lib/utils";

const fieldClassName =
  "w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/40 focus:bg-surface-elevated focus:ring-2 focus:ring-accent/20";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10", fieldClassName, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("min-h-24 py-2", fieldClassName, className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("h-10", fieldClassName, className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-medium text-foreground/90", className)}>
      {label}
      {children}
      {error ? <span className="text-xs font-normal text-rose-400">{error}</span> : null}
    </label>
  );
}
