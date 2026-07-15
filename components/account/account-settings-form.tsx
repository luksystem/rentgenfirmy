"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { USER_ROLE_LABELS, type UserProfile } from "@/lib/auth/types";
import { fetchUserResourceProfile } from "@/lib/supabase/user-resource-repository";
import { useAuthStore } from "@/store/auth-store";
import { useDictionaryStore } from "@/store/dictionary-store";

export function AccountSettingsForm() {
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const ensureDictionaries = useDictionaryStore((s) => s.ensure);
  const itemLabel = useDictionaryStore((s) => s.itemLabel);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [competencyLines, setCompetencyLines] = useState<string[]>([]);
  const [certificateLines, setCertificateLines] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone);
    setEmail(profile.email);
    setAboutMe(profile.aboutMe ?? "");
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      try {
        await ensureDictionaries();
        const resource = await fetchUserResourceProfile(profile.id);
        setCompetencyLines(
          resource.competencies.map((c) => {
            const name = itemLabel(c.competencyItemId);
            const level = c.levelItemId ? itemLabel(c.levelItemId) : null;
            return level && level !== "—" ? `${name} (${level})` : name;
          }),
        );
        setCertificateLines(
          resource.certificates.map((cert) =>
            cert.expiresAt ? `${cert.name} · do ${cert.expiresAt}` : cert.name,
          ),
        );
      } catch {
        setCompetencyLines([]);
        setCertificateLines([]);
      }
    })();
  }, [profile, ensureDictionaries, itemLabel]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, email, aboutMe }),
      });
      const payload = (await response.json()) as { error?: string; profile?: UserProfile };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać.");
      }
      await refreshProfile();
      setSuccess("Zapisano ustawienia konta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarSelected(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wgrać zdjęcia.");
      }
      await refreshProfile();
      setSuccess("Zdjęcie profilowe zaktualizowane.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wgrać zdjęcia.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/account/avatar", { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się usunąć zdjęcia.");
      }
      await refreshProfile();
      setSuccess("Usunięto zdjęcie profilowe.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć zdjęcia.");
    } finally {
      setUploading(false);
    }
  }

  if (!profile) {
    return <p className="text-sm text-muted">Brak danych profilu.</p>;
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zdjęcie i tożsamość</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <UserAvatar profile={profile} size="lg" />
          <div className="grid gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleAvatarSelected(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Zmień zdjęcie
              </Button>
              {profile.avatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => void handleRemoveAvatar()}
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted">JPG, PNG lub WEBP, max 2 MB.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dane konta</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={(e) => void handleSave(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Imię">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </Field>
              <Field label="Nazwisko">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </Field>
            </div>
            <Field label="E-mail">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Telefon">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48 …" />
            </Field>
            <Field label="Rola">
              <Input value={USER_ROLE_LABELS[profile.role]} disabled readOnly />
            </Field>
            <Field label="O mnie">
              <Textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Krótka notatka o sobie (max 500 znaków)…"
              />
            </Field>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Zapisz
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/konto/haslo">Zmiana hasła</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kompetencje i doświadczenie</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Kompetencje
            </p>
            {competencyLines.length === 0 ? (
              <p className="text-muted">Brak przypisanych kompetencji (ustawia administrator).</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-foreground/90">
                {competencyLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Certyfikaty / doświadczenie
            </p>
            {certificateLines.length === 0 ? (
              <p className="text-muted">Brak certyfikatów (ustawia administrator).</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-foreground/90">
                {certificateLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
