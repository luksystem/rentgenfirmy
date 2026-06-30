import { ServiceIntakeWizard } from "@/components/service-intake/service-intake-wizard";

export const metadata = {
  title: "Zgłoszenie serwisowe",
  description: "Zgłoś usterkę lub zlecenie serwisowe online.",
};

export default function ServiceIntakePage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <ServiceIntakeWizard />
    </div>
  );
}
