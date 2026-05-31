import { addDays, toISODate } from "@/lib/utils";
import type { FieldOptions } from "@/lib/field-options";
import {
  getInterruptionTypeSuggestion,
  isProjectForClosing,
  isWaitingFlowStatus,
} from "@/lib/field-options";
import {
  filterInterruptionsByPeriod,
  formatPeriodLabel,
  previousPeriod,
  type ReportPeriod,
} from "@/lib/report-period";
import type { Interruption, Project, QuickWin, TrendComparison, WeeklyReport } from "@/lib/types";

export type { QuickWin, TrendComparison };

const WAITING_COUNT_WARN = 5;
const CLOSING_COUNT_WARN = 4;
const WAITING_SHARE_WARN = 0.35;

export function compareCounts(current: number, previous: number): TrendComparison {
  const delta = current - previous;

  return {
    current,
    previous,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
    percentChange:
      previous === 0 ? (current === 0 ? 0 : null) : Math.round((delta / previous) * 100),
  };
}

export function countInterruptionsBetween(
  interruptions: Interruption[],
  start: Date,
  end: Date,
) {
  const startIso = toISODate(start);
  const endIso = toISODate(end);

  return interruptions.filter(
    (item) => item.date >= startIso && item.date <= endIso,
  ).length;
}

export function interruptionTrends(
  interruptions: Interruption[],
  period: ReportPeriod,
  referenceDate = new Date(),
) {
  const inPeriod = filterInterruptionsByPeriod(interruptions, period);
  const prev = previousPeriod(period);
  const inPrevious = filterInterruptionsByPeriod(interruptions, prev);
  const periodComparison = compareCounts(inPeriod.length, inPrevious.length);

  const today = toISODate(referenceDate);
  const yesterday = toISODate(addDays(referenceDate, -1));
  const todayInPeriod = period.endDate >= today && period.startDate <= today;
  const todayCount = todayInPeriod
    ? inPeriod.filter((item) => item.date === today).length
    : inPeriod.filter((item) => item.date === period.endDate).length;
  const yesterdayCount = todayInPeriod
    ? interruptions.filter((item) => item.date === yesterday).length
    : interruptions.filter(
        (item) => item.date === toISODate(addDays(new Date(period.endDate), -1)),
      ).length;

  return {
    daily: compareCounts(todayCount, yesterdayCount),
    weekly: periodComparison,
    previousPeriodLabel: formatPeriodLabel(prev),
  };
}

export function formatTrendHelper(trend: TrendComparison, periodLabel: string) {
  if (trend.current === 0 && trend.previous === 0) {
    return `Brak przerwań: ${periodLabel}`;
  }

  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const deltaLabel =
    trend.delta === 0
      ? "bez zmiany"
      : `${arrow} ${Math.abs(trend.delta)} (${trend.delta > 0 ? "więcej" : "mniej"})`;

  const percentLabel =
    trend.percentChange !== null && trend.previous > 0
      ? `, ${trend.percentChange > 0 ? "+" : ""}${trend.percentChange}%`
      : "";

  return `${deltaLabel} vs ${periodLabel}${percentLabel}`;
}

export function generateQuickWins(
  projects: Project[],
  interruptions: Interruption[],
  options: FieldOptions,
  report: Omit<WeeklyReport, "quickWins">,
): QuickWin[] {
  const wins: QuickWin[] = [];
  const nonClosedCount = projects.length - report.closedProjects;
  const { daily, weekly } = report.interruptionTrends;
  const topInterruption = report.interruptionsByTypeChart[0];
  const topBlocker = report.blockersByReason[0];
  const waitingShare =
    nonClosedCount > 0 ? report.waitingProjects / nonClosedCount : 0;
  const periodLabel = report.periodLabel.toLowerCase();
  const previousLabel = report.interruptionTrends.previousPeriodLabel.toLowerCase();

  if (weekly.direction === "up" && weekly.delta >= 3) {
    wins.push({
      id: "interruptions-week-up",
      severity: "warning",
      title: "Przerwania rosną w wybranym okresie",
      description: `W okresie ${periodLabel} było ${weekly.current} przerwań, wcześniej ${weekly.previous}.`,
      action:
        "Przejrzyj typy przerwań i wprowadź jedną regułę ograniczającą najczęstsze źródło.",
    });
  } else if (weekly.direction === "down" && weekly.delta <= -2) {
    wins.push({
      id: "interruptions-week-down",
      severity: "info",
      title: "Mniej przerwań niż w poprzednim okresie",
      description: `Spadek z ${weekly.previous} do ${weekly.current} przerwań (${previousLabel}).`,
      action: "Utrzymaj obecne reguły pracy — co działa, zapisz w checklistcie zespołu.",
    });
  }

  if (daily.direction === "up" && daily.delta >= 2) {
    wins.push({
      id: "interruptions-day-up",
      severity: "warning",
      title: "Skok przerwań pod koniec okresu",
      description: `Ostatni dzień okresu: ${daily.current}, dzień wcześniej: ${daily.previous}.`,
      action: "Odłóż reaktywne tematy na jutro i domknij 1 oczekujący projekt.",
    });
  }

  if (topInterruption && topInterruption.value >= 3) {
    wins.push({
      id: "top-interruption-type",
      severity: weekly.direction === "up" ? "critical" : "warning",
      title: `Dominuje: ${topInterruption.name}`,
      description: `${topInterruption.value} przerwań tego typu w wybranym okresie.`,
      action: getInterruptionTypeSuggestion(topInterruption.name, options),
    });
  }

  if (report.waitingProjects >= WAITING_COUNT_WARN || waitingShare >= WAITING_SHARE_WARN) {
    wins.push({
      id: "too-many-waiting",
      severity: "warning",
      title: "Dużo projektów oczekujących",
      description: `${report.waitingProjects} projektów czeka (${Math.round(waitingShare * 100)}% otwartych).`,
      action:
        "Zrób przegląd blokad: wybierz 3 najstarsze oczekujące i ustaw konkretną datę odblokowania.",
    });
  }

  if (report.closingProjects >= CLOSING_COUNT_WARN) {
    wins.push({
      id: "too-many-closing",
      severity: "warning",
      title: "Dużo projektów utknęło na domknięciu",
      description: `${report.closingProjects} projektów jest w trakcie na etapie do zamknięcia.`,
      action:
        "Zaplanuj sprint zamknięć: dla każdego wpisz termin, listę poprawek i osobę odpowiedzialną.",
    });
  }

  const staleClosing = projects.filter(
    (project) =>
      isProjectForClosing(project, options) &&
      project.closeDeadline &&
      new Date(project.closeDeadline) < new Date(),
  );

  if (staleClosing.length > 0) {
    wins.push({
      id: "overdue-closing",
      severity: "critical",
      title: "Przeterminowane domknięcia",
      description: `${staleClosing.length} projekt(ów) po terminie zamknięcia.`,
      action: `Priorytet: ${staleClosing
        .slice(0, 3)
        .map((project) => project.name)
        .join(", ")}.`,
    });
  }

  if (topBlocker && topBlocker.value >= 3) {
    wins.push({
      id: "top-blocker",
      severity: "info",
      title: `Najczęstsza blokada: ${topBlocker.name}`,
      description: `${topBlocker.value} projektów ma ten sam powód blokady.`,
      action:
        "Ustal jednorazową akcję usuwającą tę blokadę (np. spotkanie z branżą, decyzja klienta).",
    });
  }

  const noisyInactive = projects.filter((project) => {
    if (project.isActive) {
      return false;
    }

    const recentCount = filterInterruptionsByPeriod(
      interruptions.filter((item) => item.projectId === project.id),
      report.period,
    ).length;

    return recentCount >= 2;
  });

  if (noisyInactive.length > 0) {
    wins.push({
      id: "inactive-with-interruptions",
      severity: "warning",
      title: "Przerwania w nieaktywnych projektach",
      description: `${noisyInactive.length} nieaktywnych projektów generuje przerwania w wybranym okresie.`,
      action:
        "Albo oznacz projekt jako aktywny, albo ustal regułę „nie reagujemy” i komunikuj ją klientowi lub ekipie.",
    });
  }

  if (report.noContactProjects >= 3) {
    wins.push({
      id: "no-contact",
      severity: "warning",
      title: "Projekty bez kontaktu",
      description: `${report.noContactProjects} projektów bez kontaktu >14 dni.`,
      action: "Zaplanuj serię krótkich follow-upów na dziś lub jutrze.",
    });
  }

  const waitingWithoutBlocker = projects.filter(
    (project) =>
      isWaitingFlowStatus(project.flowStatus, options) && !project.blockerReason,
  );

  if (waitingWithoutBlocker.length > 0) {
    wins.push({
      id: "waiting-no-blocker",
      severity: "info",
      title: "Oczekujące bez opisanego powodu",
      description: `${waitingWithoutBlocker.length} projektów oczekuje bez powodu blokady.`,
      action: "Uzupełnij blokady — inaczej nie wiadomo, na co czekamy.",
    });
  }

  if (wins.length === 0) {
    wins.push({
      id: "all-good",
      severity: "info",
      title: "Brak pilnych quick winów",
      description: "Wskaźniki wyglądają stabilnie — utrzymuj rytm przeglądu projektów.",
      action: "Wygeneruj raport ponownie za tydzień i porównaj trendy przerwań.",
    });
  }

  return wins.slice(0, 8);
}
