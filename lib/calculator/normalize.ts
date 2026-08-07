import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_OFFER_STATUSES,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  emptyCalculatorAnswers,
  emptyCalculatorClient,
  type CalculatorAddonKey,
  type CalculatorAnswers,
  type CalculatorClient,
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

function asNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
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

  return {
    odlegloscKm: asNumber(data.odlegloscKm, fallback.odlegloscKm),

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

    addons,
    iloscStacjiDokujacychZIpadem: asNumber(data.iloscStacjiDokujacychZIpadem, fallback.iloscStacjiDokujacychZIpadem),

    otherSystems,
    iloscKamerMonitoringu: asNumber(data.iloscKamerMonitoringu, fallback.iloscKamerMonitoringu),
    iloscStrefMultiroom: asNumber(data.iloscStrefMultiroom, fallback.iloscStrefMultiroom),
    iloscGlosnikowMultiroom: asNumber(data.iloscGlosnikowMultiroom, fallback.iloscGlosnikowMultiroom),

    instalacjaDoGlosnikow: asBoolean(data.instalacjaDoGlosnikow, fallback.instalacjaDoGlosnikow),
    instalacjaDoMonitoringu: asBoolean(data.instalacjaDoMonitoringu, fallback.instalacjaDoMonitoringu),
    instalacjaDoTelewizjiLubLan: asBoolean(data.instalacjaDoTelewizjiLubLan, fallback.instalacjaDoTelewizjiLubLan),
    kanalyPrzepustyDoTv: asBoolean(data.kanalyPrzepustyDoTv, fallback.kanalyPrzepustyDoTv),
    przylaczeDoDomu: asBoolean(data.przylaczeDoDomu, fallback.przylaczeDoDomu),
    dlugoscPrzylaczaM: asNumber(data.dlugoscPrzylaczaM, fallback.dlugoscPrzylaczaM),
    instalacjaMasztuAnteny: asBoolean(data.instalacjaMasztuAnteny, fallback.instalacjaMasztuAnteny),
    rozdzielniaBudowlana: asBoolean(data.rozdzielniaBudowlana, fallback.rozdzielniaBudowlana),
    formalnosciOdbiorowe: asBoolean(data.formalnosciOdbiorowe, fallback.formalnosciOdbiorowe),
    pomiaryWewnetrzne: asBoolean(data.pomiaryWewnetrzne, fallback.pomiaryWewnetrzne),

    iloscGniazd400V: asNullableNumber(data.iloscGniazd400V),
    iloscObwodowGniazd230V: asNullableNumber(data.iloscObwodowGniazd230V),
    iloscKolejnychGniazdObwody230V: asNullableNumber(data.iloscKolejnychGniazdObwody230V),
    iloscObwodowOswietleniaWszystkich: asNullableNumber(data.iloscObwodowOswietleniaWszystkich),
    iloscOswietleniaKolejne: asNullableNumber(data.iloscOswietleniaKolejne),
    iloscGniazdLanTv: asNullableNumber(data.iloscGniazdLanTv),
    iloscKabliGlosnikowych: asNullableNumber(data.iloscKabliGlosnikowych),
    iloscKanalowTv: asNullableNumber(data.iloscKanalowTv),
    dodatkoweBruzdowanieM: asNumber(data.dodatkoweBruzdowanieM, fallback.dodatkoweBruzdowanieM),

    iloscPrzyciskowPrestiz: asNumber(data.iloscPrzyciskowPrestiz, fallback.iloscPrzyciskowPrestiz),
    iloscPrzyciskowNormal: asNumber(data.iloscPrzyciskowNormal, fallback.iloscPrzyciskowNormal),
    iloscCzujekDodatkowychRecznie: asNumber(data.iloscCzujekDodatkowychRecznie, fallback.iloscCzujekDodatkowychRecznie),

    trudnyKlientWspolczynnik: asNumber(data.trudnyKlientWspolczynnik, fallback.trudnyKlientWspolczynnik),
    platnoscZGory: asBoolean(data.platnoscZGory, fallback.platnoscZGory),
    istniejePodstawowyAlarm: asBoolean(data.istniejePodstawowyAlarm, fallback.istniejePodstawowyAlarm),
    tylkoRozdzielnia: asBoolean(data.tylkoRozdzielnia, fallback.tylkoRozdzielnia),
    wspolczynnikProjekt: asNumber(data.wspolczynnikProjekt, fallback.wspolczynnikProjekt),
    wspolczynnikRozdzielnica: asNumber(data.wspolczynnikRozdzielnica, fallback.wspolczynnikRozdzielnica),
    wspolczynnikOutdoor: asNumber(data.wspolczynnikOutdoor, fallback.wspolczynnikOutdoor),
    wspolczynnikAlarmTymczasowy: asNumber(data.wspolczynnikAlarmTymczasowy, fallback.wspolczynnikAlarmTymczasowy),
  };
}
