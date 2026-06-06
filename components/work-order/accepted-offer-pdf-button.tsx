"use client";

import { Button } from "@/components/ui/button";
import type { ClientOfferAcceptedDocument } from "@/lib/service/client-offer-snapshot";
import { openHtmlDocument } from "@/lib/service/open-html-document";

export function AcceptedOfferPdfButton({
  document,
  size = "sm",
  variant = "secondary",
}: {
  document: ClientOfferAcceptedDocument;
  size?: "sm" | "default";
  variant?: "secondary" | "outline";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() =>
        openHtmlDocument(
          document.reportHtml,
          "Przeglądarka zablokowała podgląd zaakceptowanej wyceny.",
        )
      }
    >
      Zaakceptowana wycena (PDF)
    </Button>
  );
}
