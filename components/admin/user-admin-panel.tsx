"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import {
  USER_ROLE_LABELS,
  USER_ROLES,
  type UserProfile,
  type UserProfileInput,
  type UserRole,
} from "@/lib/auth/types";

type UserFormState = UserProfileInput & {
  password: string;
  sendInvite: boolean;
};

const emptyForm = (): UserFormState => ({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  role: "pracownik",
  isActive: true,
  password: "",
  sendInvite: false,
});

function profileToForm(user: UserProfile): UserFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    password: "",
    sendInvite: false,
  };
}

export function UserAdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [passwordDraft, setPasswordDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = selectedId !== null;
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [selectedId, users],
  );

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users");
      const payload = (await response.json()) as {
        users?: UserProfile[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się pobrać użytkowników.");
      }

      setUsers(payload.users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm());
    setPasswordDraft("");
    setMessage(null);
    setError(null);
  }

  function startEdit(user: UserProfile) {
    setSelectedId(user.id);
    setForm(profileToForm(user));
    setPasswordDraft("");
    setMessage(null);
    setError(null);
  }

  async function saveUser() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        isEditing ? `/api/admin/users/${selectedId}` : "/api/admin/users",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditing
              ? form
              : {
                  ...form,
                  password: form.password || undefined,
                  sendInvite: form.sendInvite,
                },
          ),
        },
      );

      const payload = (await response.json()) as { user?: UserProfile; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać użytkownika.");
      }

      await loadUsers();
      if (payload.user) {
        startEdit(payload.user);
      } else {
        startCreate();
      }

      setMessage(isEditing ? "Zapisano zmiany użytkownika." : "Utworzono użytkownika.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUser() {
    if (!selectedId || !selectedUser) {
      return;
    }

    if (!window.confirm(`Usunąć użytkownika ${selectedUser.email}?`)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${selectedId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się usunąć użytkownika.");
      }

      startCreate();
      await loadUsers();
      setMessage("Użytkownik został usunięty.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    } finally {
      setIsSaving(false);
    }
  }

  async function setPassword() {
    if (!selectedId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${selectedId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordDraft }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się ustawić hasła.");
      }

      setPasswordDraft("");
      setMessage("Hasło zostało ustawione.");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Błąd hasła.");
    } finally {
      setIsSaving(false);
    }
  }

  async function sendInvite() {
    if (!selectedId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${selectedId}/invite`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać zaproszenia.");
      }

      setMessage("Wysłano link logowania / resetu hasła (wymaga SMTP w Supabase).");
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Błąd zaproszenia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Panel administratora"
        title="Użytkownicy"
        description="Zarządzaj kontami, rolami, aktywnością, hasłami i zaproszeniami."
        action={
          <Button variant="secondary" onClick={startCreate}>
            Nowy użytkownik
          </Button>
        }
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardContent className="py-4">
            {isLoading ? (
              <p className="text-sm text-muted">Ładowanie użytkowników...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="px-2 py-2 font-medium">Imię i nazwisko</th>
                      <th className="px-2 py-2 font-medium">E-mail</th>
                      <th className="px-2 py-2 font-medium">Telefon</th>
                      <th className="px-2 py-2 font-medium">Rola</th>
                      <th className="px-2 py-2 font-medium">Aktywny</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={`cursor-pointer border-b border-border/60 transition hover:bg-surface-muted ${
                          selectedId === user.id ? "bg-surface-muted" : ""
                        }`}
                        onClick={() => startEdit(user)}
                      >
                        <td className="px-2 py-3">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-2 py-3">{user.email}</td>
                        <td className="px-2 py-3">{user.phone || "—"}</td>
                        <td className="px-2 py-3">{USER_ROLE_LABELS[user.role]}</td>
                        <td className="px-2 py-3">{user.isActive ? "Tak" : "Nie"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 py-6">
            <h2 className="text-lg font-semibold">
              {isEditing ? "Edycja użytkownika" : "Nowy użytkownik"}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Imię">
                <Input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Nazwisko">
                <Input
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Telefon">
              <Input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </Field>

            <Field label="E-mail">
              <Input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </Field>

            <Field label="Rola">
              <Select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as UserRole,
                  }))
                }
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </Field>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              Konto aktywne
            </label>

            {!isEditing ? (
              <>
                <Field label="Hasło startowe">
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    disabled={form.sendInvite}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                  <input
                    type="checkbox"
                    checked={form.sendInvite}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sendInvite: event.target.checked,
                        password: event.target.checked ? "" : current.password,
                      }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  Wyślij zaproszenie e-mailem zamiast ustawiać hasło
                </label>
              </>
            ) : (
              <>
                <Field label="Ustaw nowe hasło">
                  <Input
                    type="password"
                    value={passwordDraft}
                    onChange={(event) => setPasswordDraft(event.target.value)}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSaving || passwordDraft.length < 8}
                    onClick={() => void setPassword()}
                  >
                    Ustaw hasło
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSaving}
                    onClick={() => void sendInvite()}
                  >
                    Wyślij zaproszenie / link logowania
                  </Button>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={isSaving} onClick={() => void saveUser()}>
                {isSaving ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Utwórz użytkownika"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="destructive" disabled={isSaving} onClick={() => void deleteUser()}>
                  Usuń
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
