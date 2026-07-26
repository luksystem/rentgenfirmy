import { redirect } from "next/navigation";

export default function EmailSettingsPage() {
  redirect("/ustawienia/powiadomienia?tab=email");
}
