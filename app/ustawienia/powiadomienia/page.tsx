import { PageHeader } from "@/components/page-header";
import { PushNotificationsSettings } from "@/components/push/push-notifications-settings";

export default function PushNotificationsSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Powiadomienia push"
        description="Zarządzaj powiadomieniami systemowymi na tym urządzeniu. Subskrypcja pozostaje aktywna po wylogowaniu — powiadomienia trafiają na Twoje konto, nie na sesję przeglądarki."
      />
      <PushNotificationsSettings />
    </>
  );
}
