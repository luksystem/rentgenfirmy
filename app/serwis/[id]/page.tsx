"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ServiceForm } from "@/components/service/service-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useServiceStore } from "@/store/service-store";

export default function EditServicePage() {
  const params = useParams();
  const id = String(params.id);
  const getServiceById = useServiceStore((s) => s.getServiceById);
  const service = getServiceById(id);

  if (!service) {
    return (
      <div className="grid gap-4">
        <p className="text-muted">Nie znaleziono serwisu.</p>
        <Button asChild>
          <Link href="/serwis">Wróć do listy</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Serwis"
        title="Edytuj serwis"
        description={service.title}
        action={
          <Button variant="secondary" asChild>
            <Link href="/serwis">Lista serwisów</Link>
          </Button>
        }
      />
      <ServiceForm key={service.id} initialService={service} mode="edit" />
    </>
  );
}
