import { PageHeader } from "@/components/page-header";
import { PushNotificationsSettings } from "@/components/push/push-notifications-settings";

export default function PushNotificationsSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Powiadomienia"
        description="Zarządzaj powiadomieniami push na tym urządzeniu oraz wyślij testowy e-mail (Resend)."
      />
      <PushNotificationsSettings />
    </>
  );
}
