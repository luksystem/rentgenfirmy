const SERVICE_INBOX_EMAIL = "serwis@luksystem.pl";

export function getServiceIntakeThreadUrl(trackingToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/zgloszenie/watek/${trackingToken}`;
}

export function buildServiceIntakeSubmittedEmail(input: {
  referenceNumber: string;
  contactFullName: string;
  threadUrl: string;
}) {
  return {
    subject: `Potwierdzenie zgłoszenia ${input.referenceNumber}`,
    html: `
      <p>Dzień dobry ${input.contactFullName},</p>
      <p>otrzymaliśmy Twoje zgłoszenie serwisowe <strong>${input.referenceNumber}</strong>.</p>
      <p>Możesz śledzić status i prowadzić dyskusję pod publicznym linkiem:</p>
      <p><a href="${input.threadUrl}">${input.threadUrl}</a></p>
      <p>Zespół serwisowy LUKSYSTEM</p>
    `,
  };
}

export function buildServiceIntakeStatusEmail(input: {
  referenceNumber: string;
  contactFullName: string;
  statusLabel: string;
  threadUrl: string;
}) {
  return {
    subject: `Aktualizacja zgłoszenia ${input.referenceNumber}: ${input.statusLabel}`,
    html: `
      <p>Dzień dobry ${input.contactFullName},</p>
      <p>status zgłoszenia <strong>${input.referenceNumber}</strong> zmienił się na: <strong>${input.statusLabel}</strong>.</p>
      <p>Szczegóły i odpowiedzi zespołu:</p>
      <p><a href="${input.threadUrl}">${input.threadUrl}</a></p>
      <p>Zespół serwisowy LUKSYSTEM</p>
    `,
  };
}

export function getServiceInboxRecipients() {
  return [SERVICE_INBOX_EMAIL];
}
