import { partyToServiceClientName } from "@/lib/party/display-name";
import type { ServiceAiEstimateRecord } from "@/lib/service/ai-estimate-types";
import type { ClientOfferStatus } from "@/lib/service/client-offer";
import type { ClientOfferAcceptedDocument } from "@/lib/service/client-offer-snapshot";
import type { ClientOfferHistoryEntry } from "@/lib/service/client-offer-history";

export const SERVICE_TYPES = [
  "Gwarancyjny",
  "Pogwarancyjny",
  "Prace dodatkowe",
  "Inne",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_STATUSES = [
  "Wycena",
  "Oczekuje na klienta",
  "Zaplanowany",
  "W trakcie",
  "Do rozliczenia",
  "Rozliczony",
  "Anulowany",
] as const;

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const VAT_RATES = [0, 8, 23] as const;
export type VatRate = (typeof VAT_RATES)[number];

export type BillableFlags = {
  supervisionHours: boolean;
  programmerHours: boolean;
  installerHours: boolean;
  helperHours: boolean;
  carHours: boolean;
  carKilometers: boolean;
  accommodations: boolean;
  materials: boolean;
};

export type ServicePhoto = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  caption: string;
  createdAt: string;
};

/** Godziny poszczególnych ról wykonane w ramach gwarancji (tylko rozliczenie). */
export type ServiceWarrantyHours = {
  supervisionHours: number;
  programmerHours: number;
  installerHours: number;
  helperHours: number;
  carHours: number;
};

export type ServiceMaterialItem = {
  id: string;
  title: string;
  description: string;
  netAmount: number;
  vatRate: VatRate;
  billable: boolean;
};

export type ServiceLineItems = {
  accommodations: number;
  supervisionHours: number;
  programmerHours: number;
  installerHours: number;
  helperHours: number;
  carHours: number;
  kilometersOneWay: number;
  tripCount: number;
  materialsCost: number;
  materialItems: ServiceMaterialItem[];
  materialsNote: string;
  workReportNote: string;
  photos: ServicePhoto[];
  billable: BillableFlags;
  /** Opcjonalnie — tylko w kosztach rzeczywistych; nie wpływa na raport gdy puste. */
  warrantyHours?: ServiceWarrantyHours | null;
};

export type ServiceRates = {
  supervisionHourly: number;
  installerHourly: number;
  helperHourly: number;
  programmerHourly: number;
  carPerKm: number;
  carHourly: number;
  accommodationCost: number;
};

export type ServiceDiscounts = {
  /** Rabat % na pracę, logistykę i pozycje poza materiałami. */
  percentDiscount: number;
  /** Rabat % na koszty sprzętu / materiałów. */
  materialsPercentDiscount: number;
  specialDiscountPln: number;
  vatRate: VatRate;
};

export type KilometerZoneSettings = {
  zone1ThresholdKm: number;
  zone2ThresholdKm: number;
  zone3ThresholdKm: number;
};

export type ServiceClient = {
  fullName: string;
  location: string;
  email: string;
  phone: string;
};

export const SERVICE_PRICING_MODELS = ["hourly", "fixed_price"] as const;
export type ServicePricingModel = (typeof SERVICE_PRICING_MODELS)[number];

export type ServiceFixedPriceRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  netUnitPrice: number;
  netValue: number;
  vatRate: VatRate | null;
  active: boolean;
  showDescription: boolean;
  productId: string | null;
  description: string;
};

export type ServiceFixedPriceTable = {
  id: string;
  title: string;
  description: string;
  showProductDescriptions: boolean;
  rows: ServiceFixedPriceRow[];
};

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  location: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  email: string;
  phone: string;
  notes?: string;
  externalId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = Omit<Client, "id" | "createdAt" | "updatedAt">;

export function clientToServiceClient(
  client: Pick<Client, "firstName" | "lastName" | "location" | "email" | "phone">,
): ServiceClient {
  return {
    fullName: partyToServiceClientName(client),
    location: client.location,
    email: client.email,
    phone: client.phone,
  };
}

export type ServiceOptionalItem = {
  id: string;
  title: string;
  description: string;
  netAmount: number;
  vatRate: VatRate;
  /** Wybrane przez klienta przy akceptacji oferty */
  clientSelected: boolean;
  /** Uwzględnione w rozliczeniu (odhaczane przez serwis) */
  billable: boolean;
};

export type ServiceRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ServiceStatus;
  projectId: string | null;
  clientId: string | null;
  contactId: string | null;
  client: ServiceClient;
  title: string;
  serviceType: ServiceType;
  rates: ServiceRates;
  estimateDiscounts: ServiceDiscounts;
  actualDiscounts: ServiceDiscounts;
  zoneSettings: KilometerZoneSettings;
  detailedSettlement: boolean;
  showEstimateComparison: boolean;
  estimate: ServiceLineItems;
  actual: ServiceLineItems;
  optionalItems: ServiceOptionalItem[];
  pricingModel: ServicePricingModel;
  fixedPriceTables: ServiceFixedPriceTable[];
  clientOffer: {
    token: string | null;
    expiresAt: string | null;
    status: ClientOfferStatus | null;
    message: string | null;
    respondedAt: string | null;
    lastClientMessage: string | null;
  };
  clientOfferHistory: ClientOfferHistoryEntry[];
  clientOfferAcceptedDocument: ClientOfferAcceptedDocument | null;
  settlementOffer: {
    token: string | null;
    expiresAt: string | null;
    status: ClientOfferStatus | null;
    message: string | null;
    respondedAt: string | null;
    lastClientMessage: string | null;
  };
  settlementOfferHistory: ClientOfferHistoryEntry[];
  settlementOfferAcceptedDocument: ClientOfferAcceptedDocument | null;
  aiEstimate: ServiceAiEstimateRecord | null;
  /** Numer zgłoszenia z formularza /zgloszenie — null dla ofert dodanych ręcznie. */
  intakeReference: string | null;
  /** Kiedy zespół otworzył ofertę z formularza (badge znika). */
  reviewedAt: string | null;
};

export type ServiceIntakeSettings = {
  /** Dopłata % do wszystkich stawek przy priorytetowej obsłudze pogwarancyjnej (zgłoszenie klienta). */
  prioritySurchargePercent: number;
};

export type ServiceAiEstimateSettings = {
  /** Komunikat systemowy wysyłany do modelu AI. */
  systemPrompt: string;
  /** Zasady wyceny — wstawiane w sekcji „Zasady” promptu (kontekst i opis dodaje aplikacja). */
  rulesPrompt: string;
  /** Dodatkowe zasady dla nowego kontaktu w formularzu /zgloszenie. */
  newContactRulesPrompt: string;
};

export type ServiceGlobalSettings = {
  rates: ServiceRates;
  zoneSettings: KilometerZoneSettings;
  defaultDiscounts: ServiceDiscounts;
  intakeSettings: ServiceIntakeSettings;
  aiEstimateSettings: ServiceAiEstimateSettings;
};

export type CostCategoryKey =
  | "car"
  | "carHours"
  | "labor"
  | "materials"
  | "accommodations";

export type CategoryAmounts = Record<CostCategoryKey, number>;

export type ServiceCostBreakdown = {
  kilometerZone: number;
  suggestedCarHoursFromZone: number;
  categories: CategoryAmounts;
  subtotalBeforeDiscount: number;
  percentDiscountAmount: number;
  materialsPercentDiscountAmount: number;
  totalDiscountAmount: number;
  totalDiscountPercentOfSubtotal: number;
  netTotal: number;
  vatAmount: number;
  grossTotal: number;
};

export type ServiceCostResult = {
  estimate: ServiceCostBreakdown;
  actual: ServiceCostBreakdown;
};

export const EMPTY_BILLABLE: BillableFlags = {
  supervisionHours: true,
  programmerHours: true,
  installerHours: true,
  helperHours: true,
  carHours: true,
  carKilometers: true,
  accommodations: true,
  materials: true,
};

export function emptyLineItems(billable: BillableFlags = EMPTY_BILLABLE): ServiceLineItems {
  return {
    accommodations: 0,
    supervisionHours: 0,
    programmerHours: 0,
    installerHours: 0,
    helperHours: 0,
    carHours: 0,
    kilometersOneWay: 0,
    tripCount: 1,
    materialsCost: 0,
    materialItems: [],
    materialsNote: "",
    workReportNote: "",
    photos: [],
    billable: { ...billable },
  };
}
