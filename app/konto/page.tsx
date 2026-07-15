import { AccountSettingsForm } from "@/components/account/account-settings-form";
import { PageHeader } from "@/components/page-header";

export default function AccountSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Konto"
        title="Ustawienia konta"
        description="Twoje imię, zdjęcie, kontakt i notatka — widoczne przy aktywnościach w aplikacji."
      />
      <AccountSettingsForm />
    </>
  );
}
