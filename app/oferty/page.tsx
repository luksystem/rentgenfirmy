import Link from "next/link";
import { ServiceList } from "@/components/service/service-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

const moduleInfo = COMMERCIAL_MODULES.serviceSettlement;

export default function OfertyPage() {
  return (
    <>
      <PageHeader
        eyebrow={moduleInfo.eyebrow}
        title={moduleInfo.label}
        description={moduleInfo.description}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/oferty/ustawienia">Ustawienia stawek</Link>
            </Button>
            <Button asChild>
              <Link href="/oferty/nowy">Nowa oferta</Link>
            </Button>
          </div>
        }
      />
      <ServiceList />
    </>
  );
}
