/**
 * Jednorazowa migracja: przenosi wartość starego, wspólnego checkboxa "SMS o urlopach"
 * (app_settings.id = "leave_notifications_settings") na dwa niezależne przełączniki
 * w głównej tabeli powiadomień (email_settings.routing[leave_request_created/decided].sms).
 * Uruchomić raz przy wdrożeniu, PRZED migracją SQL 177, która kasuje stary rekord.
 *
 *   npx tsx scripts/migrate-leave-sms-setting.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: oldRow, error: oldError } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", "leave_notifications_settings")
    .maybeSingle();

  if (oldError) throw new Error(oldError.message);

  const oldSmsEnabled = Boolean((oldRow?.data as { smsEnabled?: boolean } | null)?.smsEnabled);
  if (!oldRow) {
    console.log("Brak starego ustawienia leave_notifications_settings — nic do migracji.");
    return;
  }
  if (!oldSmsEnabled) {
    console.log("Stary checkbox 'SMS o urlopach' był wyłączony — nic do migracji.");
    return;
  }

  const { data: emailRow, error: emailError } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", "email_settings")
    .maybeSingle();

  if (emailError) throw new Error(emailError.message);

  const data = (emailRow?.data as { routing?: Array<{ id: string; sms?: boolean }> } | null) ?? {};
  const routing = Array.isArray(data.routing) ? data.routing : [];
  let changed = false;

  const nextRouting = routing.map((rule) => {
    if (
      (rule.id === "leave_request_created" || rule.id === "leave_request_decided") &&
      rule.sms !== true
    ) {
      changed = true;
      return { ...rule, sms: true };
    }
    return rule;
  });

  if (!changed) {
    console.log("Przełączniki SMS urlopów już ustawione na true (lub brak wpisów) — nic do zmiany.");
    return;
  }

  const { error: updateError } = await supabase
    .from("app_settings")
    .upsert(
      { id: "email_settings", data: { ...data, routing: nextRouting }, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );

  if (updateError) throw new Error(updateError.message);

  console.log(
    "Przeniesiono: leave_request_created.sms = true, leave_request_decided.sms = true (z dawnego wspólnego checkboxa).",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
