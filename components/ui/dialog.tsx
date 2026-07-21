"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const dialogCloseClassName =
  "absolute right-3 top-3 z-50 rounded-lg bg-surface-elevated/95 p-2 text-muted shadow-sm ring-1 ring-border/70 backdrop-blur-sm transition hover:bg-surface-muted hover:text-foreground sm:right-4 sm:top-4";

export function DialogContent({
  className,
  fullscreen = false,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { fullscreen?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 border border-border bg-surface-elevated shadow-card",
          fullscreen
            ? "inset-0 flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-none p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-5"
            : cn(
                "flex flex-col overflow-hidden",
                "inset-x-4 top-[max(1rem,env(safe-area-inset-top))] max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))] w-auto -translate-x-0 -translate-y-0 rounded-2xl p-5 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-[min(720px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6",
              ),
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Close className={dialogCloseClassName}>
          <X className="h-4 w-4" />
          <span className="sr-only">Zamknij</span>
        </DialogPrimitive.Close>
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            fullscreen ? "overflow-hidden" : "overflow-y-auto overscroll-contain",
          )}
        >
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Dialog anchored to the top — for overlays inside fullscreen process panels. */
export function TopAnchoredDialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-[100] flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] w-full min-h-0 flex-col overflow-hidden border border-border bg-surface-elevated shadow-soft",
          "inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] rounded-b-2xl",
          "sm:inset-x-auto sm:left-1/2 sm:top-[max(1rem,env(safe-area-inset-top))] sm:max-w-2xl sm:-translate-x-1/2 sm:rounded-2xl",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Close className={cn(dialogCloseClassName, "z-[110]")}>
          <X className="h-4 w-4" />
          <span className="sr-only">Zamknij</span>
        </DialogPrimitive.Close>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Dialog layered above another open dialog (e.g. Kanban task detail inside process panel). */
export function StackedDialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-[100] flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden border border-border bg-surface-elevated shadow-soft",
          "inset-x-0 bottom-0 top-auto rounded-t-3xl",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          className,
        )}
        {...props}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 pr-10", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 text-sm text-muted", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
