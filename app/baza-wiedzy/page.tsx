"use client";

import { PageHeader } from "@/components/page-header";
import { KnowledgeSettingsPanel } from "@/components/knowledge/knowledge-settings-panel";
import { KnowledgeSourceManager } from "@/components/knowledge/knowledge-source-manager";

export default function KnowledgeBasePage() {
  return (
    <>
      <PageHeader
        eyebrow="Serwis"
        title="Baza wiedzy"
        description="Dokumenty, linki, filmy i historia zgłoszeń serwisowych, z których korzysta AI przy podsuwaniu klientom sugestii rozwiązań przed zgłoszeniem serwisu."
      />

      <div className="grid gap-6">
        <KnowledgeSettingsPanel />
        <KnowledgeSourceManager />
      </div>
    </>
  );
}
