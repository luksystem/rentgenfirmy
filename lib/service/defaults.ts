import {
  emptyLineItems,
  type BillableFlags,
  type ServiceGlobalSettings,
  type ServiceRecord,
} from "@/lib/service/types";

export const DEFAULT_SERVICE_SETTINGS: ServiceGlobalSettings = {
  rates: {
    supervisionHourly: 180,
    installerHourly: 120,
    helperHourly: 80,
    programmerHourly: 200,
    carPerKm: 2.5,
    carHourly: 90,
    accommodationCost: 350,
  },
  zoneSettings: {
    zone1ThresholdKm: 100,
    zone2ThresholdKm: 200,
    zone3ThresholdKm: 300,
  },
  defaultDiscounts: {
    percentDiscount: 0,
    materialsPercentDiscount: 0,
    specialDiscountPln: 0,
    vatRate: 23,
  },
};

const warrantyBillable: BillableFlags = {
  supervisionHours: false,
  programmerHours: true,
  installerHours: true,
  helperHours: true,
  carHours: false,
  carKilometers: false,
  accommodations: false,
  materials: false,
};

function makeService(
  partial: Omit<
    ServiceRecord,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "clientOffer"
    | "clientOfferHistory"
    | "clientOfferAcceptedDocument"
    | "aiEstimate"
    | "optionalItems"
  > & {
    id: string;
    createdAt: string;
    clientOffer?: ServiceRecord["clientOffer"];
    clientOfferHistory?: ServiceRecord["clientOfferHistory"];
    clientOfferAcceptedDocument?: ServiceRecord["clientOfferAcceptedDocument"];
    aiEstimate?: ServiceRecord["aiEstimate"];
    optionalItems?: ServiceRecord["optionalItems"];
  },
): ServiceRecord {
  const emptyOffer: ServiceRecord["clientOffer"] = {
    token: null,
    expiresAt: null,
    status: null,
    message: null,
    respondedAt: null,
    lastClientMessage: null,
  };

  return {
    ...partial,
    optionalItems: partial.optionalItems ?? [],
    clientOffer: partial.clientOffer ?? emptyOffer,
    clientOfferHistory: partial.clientOfferHistory ?? [],
    clientOfferAcceptedDocument: partial.clientOfferAcceptedDocument ?? null,
    aiEstimate: partial.aiEstimate ?? null,
    updatedAt: partial.createdAt,
  };
}

export function createSampleServices(): ServiceRecord[] {
  const base = DEFAULT_SERVICE_SETTINGS;
  const now = new Date();

  const samples: Array<
    Omit<
      ServiceRecord,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "clientOffer"
      | "clientOfferHistory"
      | "clientOfferAcceptedDocument"
      | "aiEstimate"
      | "optionalItems"
    >
  > = [
    {
      status: "Wycena",
      projectId: null,
      client: {
        fullName: "Jan Kowalski",
        location: "Warszawa, Wilanów",
        email: "jan@example.com",
        phone: "+48 600 100 200",
      },
      title: "Awaria sterowania oświetleniem",
      serviceType: "Gwarancyjny",
      rates: { ...base.rates },
      clientId: null,
      contactId: null,
      detailedSettlement: false,
      showEstimateComparison: true,
      estimateDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 0 },
      actualDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 0 },
      zoneSettings: { ...base.zoneSettings },
      estimate: {
        ...emptyLineItems(warrantyBillable),
        supervisionHours: 2,
        programmerHours: 4,
        installerHours: 6,
        kilometersOneWay: 45,
        workReportNote: "Diagnoza magistrali DALI.",
      },
      actual: emptyLineItems(warrantyBillable),
    },
    {
      status: "Do rozliczenia",
      projectId: null,
      client: {
        fullName: "Anna Nowak",
        location: "Kraków, Kazimierz",
        email: "anna@example.com",
        phone: "+48 601 200 300",
      },
      title: "Wymiana modułu HVAC",
      serviceType: "Gwarancyjny",
      rates: { ...base.rates },
      clientId: null,
      contactId: null,
      detailedSettlement: false,
      showEstimateComparison: true,
      estimateDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 0 },
      actualDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 0 },
      zoneSettings: { ...base.zoneSettings },
      estimate: {
        ...emptyLineItems(warrantyBillable),
        installerHours: 5,
        programmerHours: 2,
        materialsCost: 0,
      },
      actual: {
        ...emptyLineItems(warrantyBillable),
        installerHours: 7,
        programmerHours: 3,
        materialsCost: 0,
        workReportNote: "Wymieniono moduł, testy OK.",
      },
    },
    {
      status: "Zaplanowany",
      projectId: null,
      client: {
        fullName: "Piotr Wiśniewski",
        location: "Gdańsk, Oliwa",
        email: "piotr@example.com",
        phone: "+48 602 300 400",
      },
      title: "Serwis pogwarancyjny rozdzielni",
      serviceType: "Pogwarancyjny",
      rates: { ...base.rates },
      clientId: null,
      contactId: null,
      detailedSettlement: false,
      showEstimateComparison: true,
      estimateDiscounts: { percentDiscount: 5, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 23 },
      actualDiscounts: { percentDiscount: 5, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 23 },
      zoneSettings: { ...base.zoneSettings },
      estimate: {
        ...emptyLineItems(),
        supervisionHours: 3,
        installerHours: 8,
        kilometersOneWay: 120,
        carHours: 4,
        materialsCost: 450,
        materialsNote: "Listwy, złączki.",
      },
      actual: emptyLineItems(),
    },
    {
      status: "Rozliczony",
      projectId: null,
      client: {
        fullName: "Maria Lewandowska",
        location: "Wrocław, Krzyki",
        email: "maria@example.com",
        phone: "+48 603 400 500",
      },
      title: "Naprawa panelu dotykowego",
      serviceType: "Pogwarancyjny",
      rates: { ...base.rates },
      clientId: null,
      contactId: null,
      detailedSettlement: false,
      showEstimateComparison: true,
      estimateDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 200, vatRate: 23 },
      actualDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 200, vatRate: 23 },
      zoneSettings: { ...base.zoneSettings },
      estimate: {
        ...emptyLineItems(),
        programmerHours: 6,
        installerHours: 4,
        kilometersOneWay: 180,
        materialsCost: 320,
      },
      actual: {
        ...emptyLineItems(),
        programmerHours: 8,
        installerHours: 5,
        kilometersOneWay: 180,
        carHours: 6,
        accommodations: 1,
        materialsCost: 410,
        workReportNote: "Wymiana panelu, kalibracja scen.",
      },
    },
    {
      status: "W trakcie",
      projectId: null,
      client: {
        fullName: "Sklep Fashion Park",
        location: "Poznań, galeria",
        email: "serwis@fashionpark.pl",
        phone: "+48 61 500 600",
      },
      title: "Rozszerzenie stref oświetlenia",
      serviceType: "Prace dodatkowe",
      rates: { ...base.rates },
      clientId: null,
      contactId: null,
      detailedSettlement: false,
      showEstimateComparison: true,
      estimateDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 23 },
      actualDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 23 },
      zoneSettings: { ...base.zoneSettings },
      estimate: {
        ...emptyLineItems(),
        supervisionHours: 4,
        programmerHours: 12,
        installerHours: 16,
        helperHours: 8,
        kilometersOneWay: 250,
        accommodations: 2,
        materialsCost: 2800,
        materialsNote: "Kable, moduły LED.",
      },
      actual: {
        ...emptyLineItems(),
        supervisionHours: 4,
        programmerHours: 6,
        installerHours: 10,
        kilometersOneWay: 250,
        materialsCost: 1200,
      },
    },
    {
      status: "Do rozliczenia",
      projectId: null,
      client: {
        fullName: "Hotel Aurora",
        location: "Zakopane",
        email: "techniczny@aurora.pl",
        phone: "+48 18 700 800",
      },
      title: "Integracja nowego systemu rekuperacji",
      serviceType: "Prace dodatkowe",
      rates: { ...base.rates },
      clientId: null,
      contactId: null,
      detailedSettlement: false,
      showEstimateComparison: true,
      estimateDiscounts: { percentDiscount: 10, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 23 },
      actualDiscounts: { percentDiscount: 10, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 23 },
      zoneSettings: { ...base.zoneSettings },
      estimate: {
        ...emptyLineItems(),
        supervisionHours: 6,
        programmerHours: 20,
        installerHours: 24,
        kilometersOneWay: 320,
        accommodations: 3,
        materialsCost: 5400,
      },
      actual: {
        ...emptyLineItems(),
        supervisionHours: 8,
        programmerHours: 22,
        installerHours: 28,
        helperHours: 12,
        kilometersOneWay: 320,
        carHours: 10,
        accommodations: 3,
        materialsCost: 6100,
        workReportNote: "Integracja zakończona, szkolenie recepcji.",
      },
    },
    {
      status: "Wycena",
      projectId: null,
      client: {
        fullName: "Tomasz Zieliński",
        location: "Łódź, Bałuty",
        email: "tomasz@example.com",
        phone: "+48 605 600 700",
      },
      title: "Konsultacja rozszerzenia automatyki",
      serviceType: "Inne",
      rates: { ...base.rates },
      clientId: null,
      contactId: null,
      detailedSettlement: false,
      showEstimateComparison: true,
      estimateDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 23 },
      actualDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 0, vatRate: 23 },
      zoneSettings: { ...base.zoneSettings },
      estimate: {
        ...emptyLineItems(),
        supervisionHours: 4,
        programmerHours: 2,
        kilometersOneWay: 90,
      },
      actual: emptyLineItems(),
    },
    {
      status: "Rozliczony",
      projectId: null,
      client: {
        fullName: "Biuro Nexus",
        location: "Katowice, centrum",
        email: "it@nexus.pl",
        phone: "+48 32 800 900",
      },
      title: "Audyt sieci po modernizacji",
      serviceType: "Inne",
      rates: { ...base.rates },
      clientId: null,
      contactId: null,
      detailedSettlement: false,
      showEstimateComparison: true,
      estimateDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 150, vatRate: 8 },
      actualDiscounts: { percentDiscount: 0, materialsPercentDiscount: 0, specialDiscountPln: 150, vatRate: 8 },
      zoneSettings: { ...base.zoneSettings },
      estimate: {
        ...emptyLineItems(),
        supervisionHours: 8,
        programmerHours: 10,
        kilometersOneWay: 150,
        materialsCost: 200,
      },
      actual: {
        ...emptyLineItems(),
        supervisionHours: 10,
        programmerHours: 12,
        kilometersOneWay: 150,
        carHours: 5,
        materialsCost: 240,
        workReportNote: "Raport audytowy przekazany mailem.",
      },
    },
  ];

  return samples.map((sample, index) =>
    makeService({
      ...sample,
      id: `service-sample-${index + 1}`,
      createdAt: new Date(now.getTime() - index * 86400000 * 3).toISOString(),
    }),
  );
}
