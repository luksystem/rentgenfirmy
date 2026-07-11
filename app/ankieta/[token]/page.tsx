import { ClientFunctionalitySurveyWizard } from "@/components/client-functionality/client-functionality-survey-wizard";
import { fetchFunctionalitySurveyBundleByToken } from "@/lib/supabase/project-functionality-survey-server";

export const dynamic = "force-dynamic";

export default async function PublicFunctionalitySurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bundle = await fetchFunctionalitySurveyBundleByToken(token);

  if (!bundle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted">Nie znaleziono ankiety.</p>
      </div>
    );
  }

  return <ClientFunctionalitySurveyWizard token={token} initialBundle={bundle} />;
}
