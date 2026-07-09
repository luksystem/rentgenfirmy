import { sendSms } from "@/lib/sms/sendSms";
import { fetchLeaveNotificationsSettingsServer } from "@/lib/supabase/leave-settings-server";

/** SMS do przełożonego o nowej prośbie o urlop — wysyłany tylko gdy checkbox w ustawieniach SMS jest włączony. */
export async function dispatchLeaveRequestCreatedSms(input: {
  supervisorPhone: string | null;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}) {
  const settings = await fetchLeaveNotificationsSettingsServer();
  if (!settings.smsEnabled || !input.supervisorPhone?.trim()) {
    return;
  }

  const message = `${input.employeeName} prosi o urlop (${input.leaveTypeName}): ${input.startDate} - ${input.endDate}. Zaloguj się do Rentgena, aby zaakceptować lub odrzucić.`;

  await sendSms({
    phone: input.supervisorPhone,
    message,
    metadata: { type: "leave_request_created" },
  }).catch(() => undefined);
}

/** SMS do pracownika o decyzji w sprawie jego wniosku urlopowego. */
export async function dispatchLeaveRequestDecidedSms(input: {
  employeePhone: string | null;
  approved: boolean;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}) {
  const settings = await fetchLeaveNotificationsSettingsServer();
  if (!settings.smsEnabled || !input.employeePhone?.trim()) {
    return;
  }

  const message = input.approved
    ? `Twój urlop (${input.leaveTypeName}, ${input.startDate} - ${input.endDate}) zostal zaakceptowany.`
    : `Twój wniosek o urlop (${input.leaveTypeName}, ${input.startDate} - ${input.endDate}) zostal odrzucony.`;

  await sendSms({
    phone: input.employeePhone,
    message,
    metadata: { type: "leave_request_decided" },
  }).catch(() => undefined);
}
