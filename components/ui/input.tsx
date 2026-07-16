import * as React from "react";
import { cn } from "@/lib/utils";

const fieldClassName =
  "w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/40 focus:bg-surface-elevated focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50";

export const inputInvalidClassName =
  "border-rose-500/70 bg-rose-500/5 ring-1 ring-rose-500/30 focus:border-rose-500 focus:ring-rose-500/25";

export const fieldGroupInvalidClassName =
  "rounded-2xl ring-1 ring-rose-500/40 ring-offset-2 ring-offset-surface";

export function Input({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn("h-10", fieldClassName, invalid && inputInvalidClassName, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn("min-h-24 py-2", fieldClassName, invalid && inputInvalidClassName, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  invalid,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn("h-10", fieldClassName, invalid && inputInvalidClassName, className)}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  error,
  invalid,
  children,
  className,
}: {
  label: string;
  error?: string;
  invalid?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "grid gap-1.5 text-sm font-medium text-foreground/90",
        invalid && fieldGroupInvalidClassName,
        className,
      )}
    >
      <span className={cn(invalid && "text-rose-300")}>{label}</span>
      {children}
      {error ? <span className="text-xs font-normal text-rose-400">{error}</span> : null}
    </label>
  );
}
