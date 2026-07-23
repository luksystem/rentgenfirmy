"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function OfferEmailPreviewDialog({
  open,
  onOpenChange,
  preview,
  sending,
  error,
  onConfirmSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: { subject: string; html: string; to: string } | null;
  sending: boolean;
  error: string | null;
  onConfirmSend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[min(720px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Podgląd maila do klienta</DialogTitle>
          <DialogDescription>
            Sprawdź treść przed wysyłką — dopiero kliknięcie „Wyślij” wysyła maila.
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="grid gap-3">
            <div className="grid gap-1 text-sm">
              <p>
                <span className="font-medium text-foreground">Do: </span>
                <span className="text-muted">{preview.to || "— brak adresu e-mail klienta —"}</span>
              </p>
              <p>
                <span className="font-medium text-foreground">Temat: </span>
                <span className="text-muted">{preview.subject}</span>
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/80 bg-white">
              <iframe
                title="Podgląd maila"
                srcDoc={preview.html}
                className="h-[420px] w-full"
                sandbox=""
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Ładowanie podglądu…</p>
        )}

        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={sending}>
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={onConfirmSend}
            disabled={!preview || sending || !preview.to}
          >
            {sending ? "Wysyłanie…" : "Wyślij"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
