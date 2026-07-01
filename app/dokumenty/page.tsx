import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProjectDocumentList } from "@/components/documents/project-document-list";
import { Button } from "@/components/ui/button";

export default function DokumentyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Dokumentacja"
        title="Dokumenty"
        description="Zdjęcia, skany, plany i pliki PDF powiązane z klientem lub projektem."
        action={
          <Button asChild>
            <Link href="/dokumenty/nowy">
              <Plus className="h-4 w-4" />
              Dodaj dokument
            </Link>
          </Button>
        }
      />
      <ProjectDocumentList />
    </>
  );
}
