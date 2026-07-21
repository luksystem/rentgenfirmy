function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

function hostToHttpsUrl(hostOrUrl: string) {
  const trimmed = hostOrUrl.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return stripTrailingSlash(trimmed);
  }
  return `https://${stripTrailingSlash(trimmed)}`;
}

/**
 * Absolutny adres aplikacji do linków w mailach / SMS / push.
 * Preferuje NEXT_PUBLIC_APP_URL; na Vercel bierze produkcyjną domenę projektu.
 */
export function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return hostToHttpsUrl(configured);
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return hostToHttpsUrl(productionHost);
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    return hostToHttpsUrl(deploymentHost);
  }

  return "http://localhost:3000";
}

export function absoluteAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${normalizedPath}`;
}
