"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ProtocolTemplateEditor } from "@/components/process/protocol-template-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProtocolReferencePdfUrl } from "@/lib/supabase/process-protocol-repository";
import { useProcessStore } from "@/store/process-store";

export default function ProtocolTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = String(params.id);
  const templates = useProcessStore((state) => state.protocolTemplates);
  const hydrated = useProcessStore((state) => state.protocolTemplatesHydrated);
  const ensureProtocolTemplates = useProcessStore((state) => state.ensureProtocolTemplates);
  const saveProtocolTemplate = useProcessStore((state) => state.saveProtocolTemplate);
  const removeProtocolTemplate = useProcessStore((state) => state.removeProtocolTemplate);
  const [referencePdfUrl, setReferencePdfUrl] = useState<string | null>(null);

  useEffect(() => {
    void ensureProtocolTemplates();
  }, [ensureProtocolTemplates]);

  const template = templates.find((entry) => entry.id === templateId);

  useEffect(() => {
    if (template?.referencePdfPath) {
      void getProtocolReferencePdfUrl(template.referencePdfPath).then(setReferencePdfUrl);
    }
  }, [template?.referencePdfPath]);

  if (!hydrated) {
    return <p className="text-sm text-muted">Ładowanie wzoru protokołu…</p>;
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-muted">Nie znaleziono wzoru protokołu.</p>
          <Button asChild variant="secondary">
            <Link href="/procesy/protokoly">Wróć do wzorów</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Wzór protokołu"
        title={template.name}
        description="Zmiany dotyczą nowych wyborów wzoru w elementach procesu — już wypełnione protokoły w projektach zachowują swoje dane."
        action={
          <Button variant="secondary" asChild>
            <Link href="/procesy/protokoly">Wzory protokołów</Link>
          </Button>
        }
      />
      <ProtocolTemplateEditor
        key={template.updatedAt}
        initialTemplate={template}
        referencePdfUrl={referencePdfUrl}
        onSave={(next, file) => saveProtocolTemplate(next, file)}
        onDelete={async () => {
          await removeProtocolTemplate(template.id);
          router.push("/procesy/protokoly");
        }}
      />
    </>
  );
}
