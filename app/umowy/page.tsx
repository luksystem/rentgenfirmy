import Link from "next/link";
import { ContractList } from "@/components/contracts/contract-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

const moduleInfo = COMMERCIAL_MODULES.contracts;

export default function UmowyPage() {
  return (
    <>
      <PageHeader
        eyebrow={moduleInfo.eyebrow}
        title={moduleInfo.label}
        description={moduleInfo.description}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/umowy/bloki-tresci">Biblioteka treści</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/umowy/szablony">Szablony umów</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/umowy/ustawienia">Ustawienia</Link>
            </Button>
            <Button asChild>
              <Link href="/umowy/nowa">Nowa umowa</Link>
            </Button>
          </div>
        }
      />
      <ContractList />
    </>
  );
}
