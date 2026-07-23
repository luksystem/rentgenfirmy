import { isChannelEnabled } from "@/lib/email/notification-routing";
import { renderPlainTemplateString } from "@/lib/notifications/dispatch";
import { sendSms } from "@/lib/sms/sendSms";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";

/** SMS do przełożonego o nowej prośbie o urlop — sterowany głównym przełącznikiem w /ustawienia/email. */
export async function dispatchLeaveRequestCreatedSms(input: {
  supervisorPhone: string | null;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}) {
  if (!input.supervisorPhone?.trim()) {
    return;
  }

  const settings = await fetchEmailSettingsServer();
  if (!isChannelEnabled(settings.routing, "leave_request_created", "sms")) {
    return;
  }

  const message = renderPlainTemplateString(settings.templates.leave_request_created.sms, {
    employee_name: input.employeeName,
    leave_type_name: input.leaveTypeName,
    start_date: input.startDate,
    end_date: input.endDate,
  });
  if (!message) {
    return;
  }

  await sendSms({
    phone: input.supervisorPhone,
    message,
    metadata: { type: "leave_request_created" },
  }).catch(() => undefined);
}

/** SMS do pracownika o decyzji w sprawie jego wniosku urlopowego — sterowany głównym przełącznikiem. */
export async function dispatchLeaveRequestDecidedSms(input: {
  employeePhone: string | null;
  approved: boolean;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}) {
  if (!input.employeePhone?.trim()) {
    return;
  }

  const settings = await fetchEmailSettingsServer();
  if (!isChannelEnabled(settings.routing, "leave_request_decided", "sms")) {
    return;
  }

  const message = renderPlainTemplateString(settings.templates.leave_request_decided.sms, {
    decision_label: input.approved ? "Zaakceptowano" : "Odrzucono",
    leave_type_name: input.leaveTypeName,
    start_date: input.startDate,
    end_date: input.endDate,
  });
  if (!message) {
    return;
  }

  await sendSms({
    phone: input.employeePhone,
    message,
    metadata: { type: "leave_request_decided" },
  }).catch(() => undefined);
}
