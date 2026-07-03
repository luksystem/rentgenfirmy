"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/company/company-profile";
import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { resolveCompanyProfileDocument } from "@/lib/company/company-profile-document";

let cachedProfile: CompanyProfileDocument | null = null;
let inflight: Promise<CompanyProfileDocument> | null = null;

async function fetchCompanyProfileDocument(): Promise<CompanyProfileDocument> {
  if (cachedProfile) {
    return cachedProfile;
  }

  if (!inflight) {
    inflight = fetch("/api/company-profile")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Nie udało się wczytać danych firmy.");
        }
        return payload.profile as CompanyProfileDocument;
      })
      .then((profile) => {
        cachedProfile = profile;
        return profile;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

export function invalidateCompanyProfileCache() {
  cachedProfile = null;
}

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfileDocument>(() =>
    cachedProfile ?? resolveCompanyProfileDocument(DEFAULT_COMPANY_PROFILE),
  );
  const [loading, setLoading] = useState(!cachedProfile);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    invalidateCompanyProfileCache();
    setLoading(true);
    setError(null);
    try {
      const next = await fetchCompanyProfileDocument();
      setProfile(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd wczytywania danych firmy.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedProfile) {
      setProfile(cachedProfile);
      setLoading(false);
      return;
    }

    void reload();
  }, [reload]);

  return { profile, loading, error, reload };
}

export async function fetchCompanyProfileDocumentClient() {
  return fetchCompanyProfileDocument();
}
