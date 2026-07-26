import { redirect } from "next/navigation";

export default function SmsSettingsPage() {
  redirect("/ustawienia/powiadomienia?tab=sms");
}
