/**
 * Wysyła push do "Admin Łukasz" (domyślnie Łukasz Kapusta — patrz memory feedback_push_on_blockers.md
 * o niepewności co do tego, która osoba jest "Admin Łukasz"; zero aktywnej subskrypcji push na
 * 2026-07-29, więc to no-op dopóki ktoś nie włączy powiadomień w aplikacji Rentgen).
 *
 * Uruchom:
 *   npx tsx scripts/notify-admin.ts "Tytuł" "Treść" ["/sciezka/w/aplikacji"]
 *
 * Wymaga w .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 */
import { sendPushToUser } from "../lib/push/send-push";

const ADMIN_LUKASZ_PROFILE_ID = "1b6103eb-bb5d-4b9e-99c2-e7d170f132fd"; // Łukasz Kapusta

async function main() {
  const [title, body, url] = process.argv.slice(2);
  if (!title || !body) {
    console.error('Użycie: npx tsx scripts/notify-admin.ts "Tytuł" "Treść" ["/sciezka"]');
    process.exit(1);
  }

  const result = await sendPushToUser(ADMIN_LUKASZ_PROFILE_ID, {
    title,
    body,
    url: url ?? "/",
    tag: "claude-blocker",
  });

  console.log(JSON.stringify(result));
  if (result.sent === 0) {
    console.warn(
      "Brak aktywnych subskrypcji push dla tego profilu — powiadomienie nie dotarło na żadne urządzenie.",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
