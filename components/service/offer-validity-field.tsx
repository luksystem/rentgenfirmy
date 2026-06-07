"use client";

import { Field, Input } from "@/components/ui/input";
import {
  DEFAULT_OFFER_VALIDITY_DAYS,
  dateInputToOfferExpiry,
  defaultClientOfferExpiry,
  offerExpiryToDateInput,
} from "@/lib/service/offer-validity";
import type { ServiceRecord } from "@/lib/service/types";
import { formatDate } from "@/lib/utils";

export function OfferValidityField({
  service,
  onChange,
}: {
  service: ServiceRecord;
  onChange: (service: ServiceRecord) => void;
}) {
  const resolvedExpiry =
    service.clientOffer.expiresAt ?? defaultClientOfferExpiry(DEFAULT_OFFER_VALIDITY_DAYS);
  const dateValue = offerExpiryToDateInput(resolvedExpiry);

  return (
    <Field label="Ważność oferty">
      <Input
        type="date"
        value={dateValue}
        min={offerExpiryToDateInput(new Date().toISOString())}
        onChange={(event) => {
          const nextDate = event.target.value;
          onChange({
            ...service,
            clientOffer: {
              ...service.clientOffer,
              expiresAt: nextDate
                ? dateInputToOfferExpiry(nextDate)
                : defaultClientOfferExpiry(DEFAULT_OFFER_VALIDITY_DAYS),
            },
          });
        }}
      />
      <p className="mt-1 text-xs font-normal text-muted">
        Domyślnie {DEFAULT_OFFER_VALIDITY_DAYS} dni od dziś
        {service.clientOffer.expiresAt
          ? ` · aktualnie do ${formatDate(service.clientOffer.expiresAt)}`
          : ""}
        . Data obowiązuje przy wysyłce linku do klienta.
      </p>
    </Field>
  );
}
