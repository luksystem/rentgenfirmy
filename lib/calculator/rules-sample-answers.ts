import { CALCULATOR_ADDON_KEYS, CALCULATOR_OTHER_SYSTEM_KEYS, emptyCalculatorAnswers, type CalculatorAnswers } from "@/lib/calculator/types";

/**
 * Reprezentatywne dane testowe do podglądu reguł w edytorze — większość checkboxów włączona, żeby
 * niemal każda reguła (nawet z bramką) pokazywała niezerową wartość podczas edycji. Nie odpowiada
 * żadnej realnej ofercie — to celowo "wszystko naraz", do sanity-checku formuł, nie do liczenia
 * prawdziwych cen.
 */
export function sampleCalculatorAnswers(): CalculatorAnswers {
  const a = emptyCalculatorAnswers();

  a.liczbaKondygnacji = 2;
  a.powierzchniaM2 = 180;
  a.odlegloscKm = 50;
  a.trudnyKlientWspolczynnik = 1.1;
  a.wspolczynnikProjekt = 1;
  a.wspolczynnikRozdzielnica = 1;
  a.wspolczynnikOutdoor = 1;
  a.strefaPrywatna = true;
  a.strefaOtwarta = true;
  a.komunikacja = true;
  a.liczbaSypialniDodatkowych = 3;
  a.liczbaPomieszczenWilgotnych = 2;
  a.liczbaPozostalychPomieszczen = 1;
  a.iloscGarazy = 1;
  a.liczbaDrzwiWejsciowych = 1;
  a.liczbaWyjscNaTaras = 1;
  a.liczbaOkienOtwieranych = 8;
  a.liczbaPomieszczenZOknami = 10;
  a.korzystamZArchitekta = false;
  a.czyOknaCzujnikiFabryczne = false;

  a.jestKominek = true;
  a.jestGaz = true;
  a.planujeRolety = true;
  a.liczbaRolet = 8;
  a.sterowanieOgrodem = true;
  a.iloscOswietlenZewnetrznych = 4;
  a.iloscSekcjiPodlewania = 4;
  a.scenyOswietleniowe = true;
  a.sterowanieTemperatura = true;
  a.strefyOgrzewaniaPodlogowego = 6;
  a.iloscGrzejnikowSterowanych = 2;
  a.alarmIKontrolaDostepu = true;
  a.satelWOptimum = true;
  a.czyCzujkiRecznie = false;
  a.ledySciemniane = 12;
  a.rozszerzenieKnx = true;
  a.tylkoRozdzielnia = false;
  a.kompleksowaInstalacja = true;
  a.platnoscZGory = true;

  a.instalacjaDoGlosnikow = true;
  a.instalacjaDoMonitoringu = true;
  a.iloscKamerMonitoringu = 4;
  a.instalacjaDoTelewizjiLubLan = true;
  a.kanalyPrzepustyDoTv = true;
  a.instalacjaMasztuAnteny = true;
  a.przylaczeDoDomu = true;
  a.dlugoscPrzylaczaM = 10;
  a.formalnosciOdbiorowe = true;
  a.pomiaryWewnetrzne = true;
  a.dodatkoweBruzdowanieM = 5;
  a.iloscPrzyciskowPrestiz = 2;

  for (const key of CALCULATOR_ADDON_KEYS) {
    a.addons[key] = true;
  }
  a.iloscElektrozaczepow = 1;
  a.iloscKlawiaturNfc = 1;
  a.iloscOswSciemniane = 4;
  a.platneIntegracjeZInnymiSystemami = true;
  a.integracjaKlimatyzacja = true;
  a.integracjaRekuperacja = true;

  for (const key of CALCULATOR_OTHER_SYSTEM_KEYS) {
    a.otherSystems[key] = true;
  }
  a.szafkaRackLan = true;
  a.iloscAP = 4;
  a.loxoneDoplataWideodomofon = true;
  a.monitoringRejestrator = true;
  a.monitoring8Mpx = true;
  a.glosnikWcNaglosnienie = true;
  a.iloscStrefMultiroom = 4;
  a.iloscGlosnikowMultiroom = 6;
  a.iloscSkrzynekMultiroom = 1;
  a.wspolczynnikAlarmTymczasowy = 1;

  return a;
}
