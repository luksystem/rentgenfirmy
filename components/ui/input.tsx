import * as React from "react";
import { cn } from "@/lib/utils";

const fieldClassName =
  "w-full rounded-2xl border border-transparent bg-surface-muted px-3 text-sm text-foreground outline-none ring-1 ring-border/60 transition placeholder:text-stone-400 focus:bg-surface focus:ring-2 focus:ring-accent/30";

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
    <label className={cn("grid gap-1.5 text-sm font-medium text-stone-700", className)}>
      {label}
      {children}
      {error ? <span className="text-xs font-normal text-rose-600">{error}</span> : null}
    </label>
  );
}
