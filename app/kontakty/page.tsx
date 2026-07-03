import { ContactsView } from "@/components/contacts/contacts-view";
import { PageHeader } from "@/components/page-header";

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sprzedaż"
        title="Kontakty"
        description="Leady i osoby przed konwersją na klienta. Kontakt może zaakceptować ofertę — wtedy automatycznie powstanie klient i zlecenie."
      />
      <ContactsView />
    </>
  );
}
