/**
 * D44 — routing zgłoszenia pracownika.
 *
 * Pracownik odpowiada wyłącznie BINARNIE na pytanie „czy może mieć wpływ na rozliczenie”.
 * Nie podaje kwoty, nie szacuje, nie zna cennika — próg kwotowy zmusiłby instalatora do
 * oszacowania kosztu, czyli dokładnie do tego, przed czym broni zasada „pracownik nie powinien
 * się zastanawiać, co to jest i po co”. Kwotę ustala właściciel przy wycenie, później.
 *
 * Zgłoszenie NIE jest osobnym bytem — trafia od razu jako szkic do jednego z dwóch istniejących
 * modułów. Trzeci byt wymagałby konwersji przy klasyfikacji, własnego cyklu życia i własnego
 * miejsca w ROT.
 *
 * Żadna ścieżka nie tworzy zadania. Zadanie powstaje dopiero z decyzji managera przy klasyfikacji.
 */
export type BillingImpactAnswer = "tak" | "nie" | "nie_wiem";

export type EmployeeReportTarget = "change_request" | "agreement";

export type EmployeeReportRouting = {
  target: EmployeeReportTarget;
  /**
   * Czy do treści dopisać ślad, że zgłaszający nie był pewien. „nie” i „nie wiem” lądują w tym
   * samym miejscu, więc bez tego manager nie odróżniłby „na pewno bez wpływu” od „nie wiem” —
   * a to jest dokładnie ta informacja, na której opiera decyzję o konwersji na zmianę projektową.
   */
  markUncertain: boolean;
};

export function routeEmployeeReport(answer: BillingImpactAnswer): EmployeeReportRouting {
  if (answer === "tak") {
    return { target: "change_request", markUncertain: false };
  }
  return { target: "agreement", markUncertain: answer === "nie_wiem" };
}

export const UNCERTAIN_BILLING_IMPACT_NOTE =
  "Zgłaszający nie był pewien, czy to ma wpływ na rozliczenie.";

/**
 * Pilność od zgłaszającego ma znaczenie tylko dopóki rzecz jest nieobsłużona. Flaga sprzed trzech
 * miesięcy, której nikt nie zdjął, jest szumem — a nikt jej nie zdejmie, bo to nie jest niczyje
 * zadanie. Zamiast logiki czyszczenia: UI przestaje ją pokazywać, gdy manager sklasyfikował rzecz
 * (czyli po wyjściu ze stanu draft). W bazie flaga zostaje jako fakt „tak to zgłoszono”.
 */
export function shouldShowUrgency(input: { isUrgent: boolean; status: string }): boolean {
  return input.isUrgent && input.status === "draft";
}
