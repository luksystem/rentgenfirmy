"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ServiceForm } from "@/components/service/service-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useServiceStore } from "@/store/service-store";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

export default function EditOfferPage() {
  const params = useParams();
  const id = String(params.id);
  const getServiceById = useServiceStore((s) => s.getServiceById);
  const service = getServiceById(id);

  if (!service) {
    return (
      <div className="grid gap-4">
        <p className="text-muted">Nie znaleziono oferty.</p>
        <Button asChild>
          <Link href="/oferty">Wróć do listy</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.serviceSettlement.eyebrow}
        title="Edytuj ofertę"
        description={service.title}
        headerClassName="mb-4 sm:mb-6"
        titleClassName="text-xl sm:text-3xl"
        descriptionClassName="truncate sm:whitespace-normal"
        action={
          <Button variant="secondary" size="sm" className="w-full sm:w-auto" asChild>
            <Link href="/oferty">
              <span className="sm:hidden">Lista</span>
              <span className="hidden sm:inline">Lista ofert</span>
            </Link>
          </Button>
        }
      />
      <ServiceForm
        key={`${service.id}:${service.status}:${service.updatedAt}`}
        initialService={service}
      />
    </div>
  );
}
