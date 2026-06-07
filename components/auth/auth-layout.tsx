import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-soft">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Rentgen firmy</p>
            <p className="text-xs text-muted">Smart Home / BMS</p>
          </div>
        </div>

        <Card>
          <CardContent className="grid gap-5 py-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </div>
            {children}
            {footer ? <div className="border-t border-border pt-4 text-sm text-muted">{footer}</div> : null}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/logowanie" className="text-accent underline">
            Logowanie
          </Link>
          {" · "}
          <Link href="/rejestracja" className="text-accent underline">
            Rejestracja
          </Link>
        </p>
      </div>
    </div>
  );
}
