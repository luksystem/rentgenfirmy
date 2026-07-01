import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RequisitionList } from "@/components/requisitions/requisition-list";
import { Button } from "@/components/ui/button";

export default function ZapotrzebowaniaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operacje"
        title="Zapotrzebowania"
        description="Zgłoszenia na ubrania, narzędzia i sprzęt z workflow akceptacji."
        action={
          <Button asChild>
            <Link href="/zapotrzebowania/nowy">
              <Plus className="h-4 w-4" />
              Nowe zapotrzebowanie
            </Link>
          </Button>
        }
      />
      <RequisitionList />
    </>
  );
}
