export function projectActivityHref(projectId: string) {
  return `/projekty/${encodeURIComponent(projectId)}/proces`;
}

export function clientActivityHref() {
  return "/klienci";
}

export function serviceActivityHref(serviceId: string) {
  return `/oferty/${encodeURIComponent(serviceId)}`;
}

export function workOrderActivityHref() {
  return "/zlecenia";
}

export function goalActivityHref(boardId: string, goalId: string) {
  return `/tablice-celow/${encodeURIComponent(boardId)}/${encodeURIComponent(goalId)}`;
}

export function kanbanActivityHref() {
  return "/tablice-wdrozen";
}

export function userActivityHref() {
  return "/admin/uzytkownicy";
}
