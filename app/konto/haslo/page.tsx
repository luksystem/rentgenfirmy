import Link from "next/link";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader
        eyebrow="Konto"
        title="Zmiana hasła"
        description="Ustaw nowe hasło do swojego konta w aplikacji."
      />

      <Card className="max-w-xl">
        <CardContent className="grid gap-4 py-6">
          <ChangePasswordForm />
          <div>
            <Button variant="secondary" asChild>
              <Link href="/konto">Wróć do ustawień konta</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
