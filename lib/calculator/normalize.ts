import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_FUNCTIONAL_LEVELS,
  CALCULATOR_OFFER_STATUSES,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  emptyCalculatorAnswers,
  emptyCalculatorClient,
  type CalculatorAddonKey,
  type CalculatorAnswers,
  type CalculatorClient,
  type CalculatorFunctionalLevel,
  type CalculatorOfferStatus,
  type CalculatorOtherSystemKey,
} from "@/lib/calculator/types";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function normalizeLevel(value: unknown, fallback: CalculatorFunctionalLevel): CalculatorFunctionalLevel {
  return (CALCULATOR_FUNCTIONAL_LEVELS as readonly string[]).includes(value as string)
    ? (value as CalculatorFunctionalLevel)
    : fallback;
}

export function normalizeCalculatorOfferStatus(value: unknown): CalculatorOfferStatus {
  return (CALCULATOR_OFFER_STATUSES as readonly string[]).includes(value as string)
    ? (value as CalculatorOfferStatus)
    : "draft";
}

export function normalizeCalculatorClient(value: unknown): CalculatorClient {
  const fallback = emptyCalculatorClient();
  const data = asObject(value);
  return {
    fullName: asString(data.fullName, fallback.fullName),
    location: asString(data.location, fallback.location),
    email: asString(data.email, fallback.email),
    phone: asString(data.phone, fallback.phone),
  };
}

export function normalizeCalculatorAnswers(value: unknown): CalculatorAnswers {
  const fallback = emptyCalculatorAnswers();
  const data = asObject(value);

  const addonsData = asObject(data.addons);
  const addons = {} as Record<CalculatorAddonKey, boolean>;
  for (const key of CALCULATOR_ADDON_KEYS) {
    addons[key] = asBoolean(addonsData[key], fallback.addons[key]);
  }

  const otherSystemsData = asObject(data.otherSystems);
  const otherSystems = {} as Record<CalculatorOtherSystemKey, boolean>;
  for (const key of CALCULATOR_OTHER_SYSTEM_KEYS) {
    otherSystems[key] = asBoolean(otherSystemsData[key], fallback.otherSystems[key]);
  }

  const puntyRecznie = data.liczbaPunktowElektrycznychRecznie;
  const puntyRecznieNumber = Number(puntyRecznie);

  return {
    powierzchniaM2: asNumber(data.powierzchniaM2, fallback.powierzchniaM2),
    liczbaKondygnacji: asNumber(data.liczbaKondygnacji, fallback.liczbaKondygnacji),
    liczbaPomieszczenZOknami: asNumber(data.liczbaPomieszczenZOknami, fallback.liczbaPomieszczenZOknami),
    liczbaOkienOtwieranych: asNumber(data.liczbaOkienOtwieranych, fallback.liczbaOkienOtwieranych),
    liczbaDrzwiWejsciowych: asNumber(data.liczbaDrzwiWejsciowych, fallback.liczbaDrzwiWejsciowych),
    liczbaWyjscNaTaras: asNumber(data.liczbaWyjscNaTaras, fallback.liczbaWyjscNaTaras),
    czyBramaWjazdowa: asBoolean(data.czyBramaWjazdowa, fallback.czyBramaWjazdowa),
    czyOknaCzujnikiFabryczne: asBoolean(data.czyOknaCzujnikiFabryczne, fallback.czyOknaCzujnikiFabryczne),
    korzystamZArchitekta: asBoolean(data.korzystamZArchitekta, fallback.korzystamZArchitekta),
    kompleksowaInstalacja: asBoolean(data.kompleksowaInstalacja, fallback.kompleksowaInstalacja),
    ofertaPoAnalizie: asBoolean(data.ofertaPoAnalizie, fallback.ofertaPoAnalizie),
    waznoscOfertyDni: asNumber(data.waznoscOfertyDni, fallback.waznoscOfertyDni),

    strefaPrywatna: asBoolean(data.strefaPrywatna, fallback.strefaPrywatna),
    strefaOtwarta: asBoolean(data.strefaOtwarta, fallback.strefaOtwarta),
    komunikacja: asBoolean(data.komunikacja, fallback.komunikacja),
    liczbaSypialniDodatkowych: asNumber(data.liczbaSypialniDodatkowych, fallback.liczbaSypialniDodatkowych),
    liczbaPomieszczenWilgotnych: asNumber(data.liczbaPomieszczenWilgotnych, fallback.liczbaPomieszczenWilgotnych),
    liczbaPozostalychPomieszczen: asNumber(data.liczbaPozostalychPomieszczen, fallback.liczbaPozostalychPomieszczen),
    liczbaBramGarazowych: asNumber(data.liczbaBramGarazowych, fallback.liczbaBramGarazowych),

    jestKominek: asBoolean(data.jestKominek, fallback.jestKominek),
    jestGaz: asBoolean(data.jestGaz, fallback.jestGaz),
    planujeRolety: asBoolean(data.planujeRolety, fallback.planujeRolety),
    liczbaRolet: asNumber(data.liczbaRolet, fallback.liczbaRolet),
    sterowanieOgrodem: asBoolean(data.sterowanieOgrodem, fallback.sterowanieOgrodem),
    scenyOswietleniowe: asBoolean(data.scenyOswietleniowe, fallback.scenyOswietleniowe),
    sterowanieTemperatura: asBoolean(data.sterowanieTemperatura, fallback.sterowanieTemperatura),
    systemWlamaniowy: asBoolean(data.systemWlamaniowy, fallback.systemWlamaniowy),
    alarmIKontrolaDostepu: asBoolean(data.alarmIKontrolaDostepu, fallback.alarmIKontrolaDostepu),

    poziomOswietlenie: normalizeLevel(data.poziomOswietlenie, fallback.poziomOswietlenie),
    poziomBezpieczenstwo: normalizeLevel(data.poziomBezpieczenstwo, fallback.poziomBezpieczenstwo),
    poziomTemperatura: normalizeLevel(data.poziomTemperatura, fallback.poziomTemperatura),
    poziomRolety: normalizeLevel(data.poziomRolety, fallback.poziomRolety),
    poziomZewnetrzne: normalizeLevel(data.poziomZewnetrzne, fallback.poziomZewnetrzne),

    addons,
    iloscStacjiDokujacychZIpadem: asNumber(data.iloscStacjiDokujacychZIpadem, fallback.iloscStacjiDokujacychZIpadem),

    otherSystems,
    iloscKamerMonitoringu: asNumber(data.iloscKamerMonitoringu, fallback.iloscKamerMonitoringu),
    iloscStrefMultiroom: asNumber(data.iloscStrefMultiroom, fallback.iloscStrefMultiroom),
    iloscGlosnikowMultiroom: asNumber(data.iloscGlosnikowMultiroom, fallback.iloscGlosnikowMultiroom),

    liczbaPunktowElektrycznychRecznie: Number.isFinite(puntyRecznieNumber) ? puntyRecznieNumber : null,

    trudnyKlientWspolczynnik: asNumber(data.trudnyKlientWspolczynnik, fallback.trudnyKlientWspolczynnik),
    platnoscZGory: asBoolean(data.platnoscZGory, fallback.platnoscZGory),
    istniejePodstawowyAlarm: asBoolean(data.istniejePodstawowyAlarm, fallback.istniejePodstawowyAlarm),
    tylkoRozdzielnia: asBoolean(data.tylkoRozdzielnia, fallback.tylkoRozdzielnia),
  };
}
