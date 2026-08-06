import Link from "next/link";
import { ContractTemplateList } from "@/components/contracts/contract-template-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ContractTemplatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sprzedaż"
        title="Szablony umów"
        description="Gotowe szablony całych umów do szybkiego powielania i modyfikacji."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/umowy">Umowy</Link>
            </Button>
            <Button asChild>
              <Link href="/umowy/szablony/nowy">Nowy szablon</Link>
            </Button>
          </div>
        }
      />
      <ContractTemplateList />
    </>
  );
}
