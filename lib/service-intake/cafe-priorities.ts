import type { ServiceIntakePriority, ServiceIntakeRequestType } from "@/lib/service-intake/types";

export type CafePriorityOption = {
  id: ServiceIntakePriority;
  letter: string;
  title: string;
  clientLabel: string;
  deadlineHint: string;
  isHighPriority: boolean;
  toneClass: string;
  letterClass: string;
};

export const CAFE_PRIORITY_OPTIONS: CafePriorityOption[] = [
  {
    id: "c",
    letter: "C",
    title: "Krytyczny",
    clientLabel:
      "C — Krytyczny problem, uniemożliwia mi normalne funkcjonowanie, proszę o natychmiastową reakcję.",
    deadlineHint: "Maksymalnie 1 dzień na realizację. W systemie: wysoki priorytet.",
    isHighPriority: true,
    toneClass: "border-rose-500/40 bg-rose-500/10",
    letterClass: "bg-rose-600 text-white",
  },
  {
    id: "a",
    letter: "A",
    title: "Asap",
    clientLabel: "A — Utrudnia mi funkcjonowanie, ale wytrzymam z tym ok. tygodnia.",
    deadlineHint: "Maksymalnie 1 tydzień na realizację. W systemie: wysoki priorytet.",
    isHighPriority: true,
    toneClass: "border-orange-500/40 bg-orange-500/10",
    letterClass: "bg-orange-500 text-white",
  },
  {
    id: "f",
    letter: "F",
    title: "Freetime",
    clientLabel: "F — Proszę przyjrzyjcie się temu w wolnym czasie, mogę poczekać nawet miesiąc.",
    deadlineHint: "Maksymalnie 1 miesiąc na realizację.",
    isHighPriority: false,
    toneClass: "border-amber-400/40 bg-amber-400/10",
    letterClass: "bg-amber-400 text-black",
  },
  {
    id: "e",
    letter: "E",
    title: "Easy",
    clientLabel:
      "E — Nie jestem pewien czy to w ogóle problem, ale zgłaszam, ponowię zgłoszenie jeśli to się powtórzy. Na razie możecie nie reagować.",
    deadlineHint: "Bez planowania — reakcja po ponownym zgłoszeniu.",
    isHighPriority: false,
    toneClass: "border-emerald-500/40 bg-emerald-500/10",
    letterClass: "bg-emerald-500 text-white",
  },
];

export const SERVICE_INTAKE_REQUEST_TYPE_OPTIONS: Array<{
  id: ServiceIntakeRequestType;
  label: string;
  description: string;
}> = [
  {
    id: "service",
    label: "Zgłoszenie serwisowe",
    description: "Usterka, awaria lub problem z działaniem systemu.",
  },
  {
    id: "new_feature",
    label: "Nowa funkcjonalność",
    description: "Propozycja rozbudowy lub zmiany w instalacji.",
  },
  {
    id: "offer_request",
    label: "Prośba o ofertę",
    description: "Chcę otrzymać wycenę przed rozpoczęciem prac.",
  },
];

export const WARRANTY_EMERGENCY_PHONE = "+48 668 419 619";

export function isHighCafePriority(priority: ServiceIntakePriority) {
  return priority === "c" || priority === "a";
}

export function getWarrantyContactDays(priority: ServiceIntakePriority) {
  return isHighCafePriority(priority) ? 3 : 7;
}

export function getDoneScreenContent(input: {
  requestType: ServiceIntakeRequestType;
  isWarrantyActive: boolean;
  priority: ServiceIntakePriority | null;
}) {
  if (input.requestType === "new_feature" || input.requestType === "offer_request") {
    return {
      title: "Dziękujemy za zgłoszenie — proszę czekać na nasz kontakt",
      paragraphs: [
        "Będziemy starać się pomóc jak najszybciej.",
        "W przypadku nowej funkcjonalności lub prośby o ofertę odpowiemy w ciągu maksymalnie 7 dni roboczych.",
        "Dziękujemy.",
      ],
      showEmergencyPhone: false,
    };
  }

  if (input.isWarrantyActive && input.priority === "c") {
    return {
      title: "Dziękujemy za zgłoszenie — zadziałamy od razu",
      paragraphs: [
        "Rozumiemy, że to bardzo ważne zgłoszenie.",
        "W przypadku zgłoszenia serwisowego:",
        "• Priorytet 1 lub 2 — dział serwisu skontaktuje się z Państwem w ciągu maksymalnie 3 dni roboczych.",
        "• Priorytet 3 lub 4 — dział serwisu skontaktuje się w ciągu maksymalnie 7 dni roboczych, aby ustalić dalsze działania.",
        "Jeżeli to sprawa nagląca i są Państwo w okresie GWARANCYJNYM — prosimy o dodatkowy kontakt telefoniczny pod numerem serwisowym (24/7 dla klientów gwarancyjnych w przypadku krytycznych usterek).",
        "Dziękujemy.",
      ],
      showEmergencyPhone: true,
    };
  }

  if (input.isWarrantyActive) {
    const contactDays = input.priority ? getWarrantyContactDays(input.priority) : 7;
    return {
      title: "Dziękujemy za zgłoszenie — proszę czekać na nasz kontakt",
      paragraphs: [
        "Będziemy starać się pomóc jak najszybciej.",
        `W przypadku zgłoszenia serwisowego dział serwisu skontaktuje się z Państwem w ciągu maksymalnie ${contactDays} dni roboczych.`,
        "W przypadku nowej funkcjonalności lub prośby o ofertę — maksymalnie 7 dni roboczych.",
        "Jeżeli to sprawa nagląca i są Państwo w okresie gwarancyjnym — można dodatkowo zadzwonić pod numer serwisowy (24/7 dla krytycznych usterek gwarancyjnych).",
        "Dziękujemy.",
      ],
      showEmergencyPhone: isHighCafePriority(input.priority ?? "f"),
    };
  }

  return {
    title: "Dziękujemy za zgłoszenie — proszę czekać na nasz kontakt",
    paragraphs: [
      "Będziemy starać się pomóc jak najszybciej.",
      "Maksymalnie skontaktujemy się w ciągu 7 dni roboczych.",
      "Dziękujemy.",
    ],
    showEmergencyPhone: false,
  };
}
