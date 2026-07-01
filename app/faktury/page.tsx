import { PageHeader } from "@/components/page-header";
import { ProjectInvoiceList } from "@/components/invoices/project-invoice-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function FakturyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sprzedaż"
        title="Faktury i koszty"
        description="Rejestr faktur i kosztów projektowych z załącznikami PDF oraz przypisaniem do klienta i projektu."
        action={
          <Button asChild>
            <Link href="/faktury/nowy">
              <Plus className="h-4 w-4" />
              Dodaj wpis
            </Link>
          </Button>
        }
      />
      <ProjectInvoiceList />
    </>
  );
}
