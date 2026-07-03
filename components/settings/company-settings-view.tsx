"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CompanyDocumentFooter } from "@/components/company/company-document-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  DEFAULT_COMPANY_PROFILE,
  type CompanyProfile,
} from "@/lib/company/company-profile";
import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { resolveCompanyProfileDocument } from "@/lib/company/company-profile-document";
import { invalidateCompanyProfileCache } from "@/lib/hooks/use-company-profile";
import { useAuthStore } from "@/store/auth-store";

export function CompanySettingsView() {
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const authLoading = useAuthStore((state) => state.isLoading);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [preview, setPreview] = useState<CompanyProfileDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/company-profile");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać danych firmy.");
      }
      const loaded = payload.profile as CompanyProfileDocument;
      setProfile({
        name: loaded.name,
        address: loaded.address,
        phone: loaded.phone,
        nip: loaded.nip,
        regon: loaded.regon,
        additionalInfo: loaded.additionalInfo,
        logoStoragePath: loaded.logoStoragePath,
      });
      setPreview(loaded);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd wczytywania.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function patchProfile(patch: Partial<CompanyProfile>) {
    setProfile((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/company-profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać danych firmy.");
      }
      invalidateCompanyProfileCache();
      const savedProfile = payload.profile as CompanyProfileDocument;
      setProfile({
        name: savedProfile.name,
        address: savedProfile.address,
        phone: savedProfile.phone,
        nip: savedProfile.nip,
        regon: savedProfile.regon,
        additionalInfo: savedProfile.additionalInfo,
        logoStoragePath: savedProfile.logoStoragePath,
      });
      setPreview(savedProfile);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    setError(null);
    setSaved(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/company-profile/logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wgrać logo.");
      }
      invalidateCompanyProfileCache();
      const savedProfile = payload.profile as CompanyProfileDocument;
      setProfile({
        name: savedProfile.name,
        address: savedProfile.address,
        phone: savedProfile.phone,
        nip: savedProfile.nip,
        regon: savedProfile.regon,
        additionalInfo: savedProfile.additionalInfo,
        logoStoragePath: savedProfile.logoStoragePath,
      });
      setPreview(savedProfile);
      setSaved(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Błąd uploadu logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    setUploadingLogo(true);
    setError(null);
    try {
      const response = await fetch("/api/company-profile/logo", {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się usunąć logo.");
      }
      invalidateCompanyProfileCache();
      const savedProfile = payload.profile as CompanyProfileDocument;
      setProfile((current) => ({ ...current, logoStoragePath: null }));
      setPreview(savedProfile);
      setSaved(true);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Błąd usuwania logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  const previewDocument = useMemo(() => {
    const resolved = resolveCompanyProfileDocument(profile);
    return {
      ...resolved,
      logoUrl: preview?.logoUrl ?? resolved.logoUrl,
    };
  }, [preview?.logoUrl, profile]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie danych firmy…
      </div>
    );
  }

  if (!isAdministrator) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted">
          Tylko administrator może edytować dane firmy.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Ustawienia"
        title="Firma"
        description="Dane i logo wyświetlane w stopkach ofert, raportów serwisowych i dokumentów PDF."
        action={
          <Button disabled={saving || uploadingLogo} onClick={() => void handleSave()}>
            {saving ? "Zapisywanie…" : "Zapisz dane firmy"}
          </Button>
        }
      />

      {saved ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="py-3 text-sm text-emerald-300">Zapisano.</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="py-3 text-sm text-rose-300">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
            <Field label="Nazwa firmy" className="sm:col-span-2">
              <Input
                value={profile.name}
                onChange={(event) => patchProfile({ name: event.target.value })}
                placeholder="Np. Luksystem Sp. z o.o."
              />
            </Field>
            <Field label="Adres" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={profile.address}
                onChange={(event) => patchProfile({ address: event.target.value })}
                placeholder="Ulica, kod pocztowy, miasto"
              />
            </Field>
            <Field label="Telefon">
              <Input
                value={profile.phone}
                onChange={(event) => patchProfile({ phone: event.target.value })}
                placeholder="+48 …"
              />
            </Field>
            <Field label="NIP">
              <Input
                value={profile.nip}
                onChange={(event) => patchProfile({ nip: event.target.value })}
                placeholder="0000000000"
              />
            </Field>
            <Field label="REGON (opcjonalnie)">
              <Input
                value={profile.regon}
                onChange={(event) => patchProfile({ regon: event.target.value })}
                placeholder="000000000"
              />
            </Field>
            <Field label="Pole dodatkowe" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={profile.additionalInfo}
                onChange={(event) => patchProfile({ additionalInfo: event.target.value })}
                placeholder="Np. www, e-mail kontaktowy, godziny pracy…"
              />
            </Field>

            <div className="sm:col-span-2 grid gap-3 rounded-xl border border-border/80 bg-surface-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4 text-accent" />
                Logo firmy
              </div>
              <p className="text-xs text-muted">
                PNG, JPG, WEBP lub SVG, max 2 MB. Logo pojawi się w stopce dokumentów.
              </p>
              {previewDocument?.logoUrl ? (
                <div className="flex flex-wrap items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewDocument.logoUrl}
                    alt={previewDocument.displayName}
                    className="max-h-16 max-w-[200px] rounded-lg border border-border bg-white object-contain p-2"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => void handleLogoRemove()}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Usuń logo
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) {
                      void handleLogoUpload(file);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingLogo ? "Wgrywanie…" : previewDocument?.logoUrl ? "Zmień logo" : "Dodaj logo"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 py-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Building2 className="h-4 w-4 text-accent" />
              Podgląd stopki dokumentu
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-white">
              {previewDocument ? (
                <CompanyDocumentFooter profile={previewDocument} />
              ) : (
                <div className="px-6 py-8 text-center text-xs text-zinc-400">Brak podglądu</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
