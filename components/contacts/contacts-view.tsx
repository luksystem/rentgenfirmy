"use client";

import { useMemo, useState } from "react";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Input } from "@/components/ui/input";
import {
  countActiveContactListFilters,
  EMPTY_CONTACT_LIST_FILTERS,
  filterContacts,
  type ContactListFilters,
} from "@/lib/contacts/contact-filters";
import { useAppStore } from "@/store/app-store";

export function ContactsView() {
  const allContacts = useAppStore((state) => state.contacts);
  const [filters, setFilters] = useState<ContactListFilters>(EMPTY_CONTACT_LIST_FILTERS);

  const filteredContacts = useMemo(
    () => filterContacts(allContacts, filters),
    [allContacts, filters],
  );

  const activeFilterCount = countActiveContactListFilters(filters);

  function updateFilters(patch: Partial<ContactListFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  return (
    <>
      <div className="mb-4 rounded-2xl border border-border/80 bg-surface p-4">
        <MobileFiltersPanel activeCount={activeFilterCount}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Szukaj po nazwie, lokalizacji, ID…"
              value={filters.nameQuery}
              onChange={(event) => updateFilters({ nameQuery: event.target.value })}
            />
            <Input
              placeholder="Adres, miasto, kod…"
              value={filters.addressQuery}
              onChange={(event) => updateFilters({ addressQuery: event.target.value })}
            />
            <select
              value={filters.status}
              onChange={(event) =>
                updateFilters({
                  status: event.target.value as ContactListFilters["status"],
                })
              }
              className="h-10 rounded-xl border border-border bg-surface-muted px-3 text-sm"
            >
              <option value="active">Tylko aktywne kontakty</option>
              <option value="converted">Przekształcone w klientów</option>
              <option value="all">Wszystkie</option>
            </select>
          </div>
        </MobileFiltersPanel>
      </div>

      <ContactsTable contacts={filteredContacts} />
    </>
  );
}
