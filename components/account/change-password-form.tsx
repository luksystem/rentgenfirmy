"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Hasła nie są identyczne.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess("Hasło zostało zmienione.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nie udało się zmienić hasła. Zaloguj się ponownie i spróbuj jeszcze raz.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Nowe hasło">
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </Field>
      <Field label="Powtórz nowe hasło">
        <Input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
        />
      </Field>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Zapisywanie..." : "Zmień hasło"}
        </Button>
      </div>
    </form>
  );
}
