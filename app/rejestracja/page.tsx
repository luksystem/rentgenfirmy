"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess(
        "Konto utworzone. Jeśli wymagane jest potwierdzenie e-mail, sprawdź skrzynkę. Możesz też spróbować się zalogować.",
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Nie udało się utworzyć konta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Rejestracja"
      description="Utwórz konto użytkownika aplikacji."
      footer={
        <>
          Masz już konto?{" "}
          <Link href="/logowanie" className="text-accent underline">
            Zaloguj się
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Imię">
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
          </Field>
          <Field label="Nazwisko">
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
          </Field>
        </div>
        <Field label="Telefon">
          <Input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </Field>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Tworzenie konta..." : "Utwórz konto"}
        </Button>
      </form>
    </AuthLayout>
  );
}
