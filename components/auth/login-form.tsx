"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const errorCode = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorCode === "deactivated"
      ? "Konto zostało dezaktywowane. Skontaktuj się z administratorem."
      : errorCode === "auth_callback"
        ? "Nie udało się dokończyć logowania z linku. Spróbuj ponownie."
        : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Nie udało się zalogować.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Logowanie"
      description="Zaloguj się, aby korzystać z aplikacji Rentgen firmy."
      footer={
        <>
          Nie masz konta?{" "}
          <Link href="/rejestracja" className="text-accent underline">
            Zarejestruj się
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Field label="E-mail">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label="Hasło">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logowanie..." : "Zaloguj się"}
        </Button>
        <p className="text-center text-sm text-muted">
          <Link href="/konto/haslo" className="text-accent underline">
            Zmień hasło
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
