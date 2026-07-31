import { AccountSettingsForm } from "@/components/account/account-settings-form";
import { HomeWidgetsSettings } from "@/components/account/home-widgets-settings";
import { PageHeader } from "@/components/page-header";

export default function AccountSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Konto"
        title="Ustawienia konta"
        description="Profil, powiadomienia push, hasło oraz dane widoczne przy aktywnościach w aplikacji."
      />
      <div className="grid gap-4">
        <HomeWidgetsSettings />
        <AccountSettingsForm />
      </div>
    </>
  );
}
