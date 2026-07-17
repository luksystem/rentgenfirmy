"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationsSettings() {
  const {
    isSupported,
    permission,
    status,
    loading,
    error,
    isIos,
    isStandalone,
    vapidPublicKey,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  async function sendTestEmail() {
    setEmailLoading(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const response = await fetch("/api/email/test", { method: "POST" });
      const payload = (await response.json()) as { error?: string; to?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać testowego e-maila.");
      }

      setEmailSuccess(
        payload.to
          ? `Wysłano testowy e-mail na ${payload.to}.`
          : "Wysłano testowy e-mail.",
      );
    } catch (testError) {
      setEmailError(
        testError instanceof Error
          ? testError.message
          : "Nie udało się wysłać testowego e-maila.",
      );
    } finally {
      setEmailLoading(false);
    }
  }

  function renderEmailTest(withDivider: boolean) {
    return (
      <div className={`grid gap-2 ${withDivider ? "border-t border-border/60 pt-4" : ""}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-surface-muted p-2">
            <Mail className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Test e-mail (Resend)</p>
            <p className="mt-1 text-sm text-muted">
              Wyśle wiadomość testową na adres z Twojego profilu. Wymaga{" "}
              <code className="text-xs">RESEND_API_KEY</code> i{" "}
              <code className="text-xs">EMAIL_FROM</code>.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={emailLoading}
            onClick={() => void sendTestEmail()}
          >
            {emailLoading ? "Wysyłanie..." : "Wyślij testowy e-mail"}
          </Button>
        </div>
        {emailSuccess ? <p className="text-sm text-emerald-300">{emailSuccess}</p> : null}
        {emailError ? <p className="text-sm text-red-400">{emailError}</p> : null}
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="grid gap-4">
        <Card className="border border-border/80">
          <CardContent className="py-5 text-sm text-muted">
            Ta przeglądarka nie obsługuje powiadomień Web Push.
          </CardContent>
        </Card>
        <Card className="border border-border/80">
          <CardContent className="grid gap-4 py-5">{renderEmailTest(false)}</CardContent>
        </Card>
      </div>
    );
  }

  const denied = permission === "denied";
  const active = status.subscribed && permission === "granted";
  const missingVapid = !vapidPublicKey || !status.vapidConfigured;

  return (
    <Card className="border border-border/80">
      <CardContent className="grid gap-4 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-surface-muted p-2">
            {active ? (
              <BellRing className="h-5 w-5 text-emerald-400" />
            ) : denied ? (
              <BellOff className="h-5 w-5 text-muted" />
            ) : (
              <Bell className="h-5 w-5 text-accent" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Powiadomienia push</p>
            <p className="mt-1 text-sm text-muted">
              Otrzymuj informacje o nowych zadaniach, zmianach terminów i ważnych zdarzeniach —
              także gdy aplikacja jest zamknięta lub działa w tle.
            </p>
            {status.activeDeviceCount > 1 ? (
              <p className="mt-2 text-xs text-muted">
                Aktywne urządzenia na koncie: {status.activeDeviceCount}
              </p>
            ) : null}
          </div>
        </div>

        {missingVapid ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            <p className="font-medium">Brak konfiguracji VAPID</p>
            <p className="mt-1">
              Uzupełnij klucze w <code className="text-xs">.env.local</code> (lokalnie) lub Vercel
              (produkcja), a następnie zrestartuj serwer: <code className="text-xs">npm run dev</code>.
            </p>
          </div>
        ) : null}

        {isIos && !isStandalone ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="mb-2 flex items-center gap-2 font-medium">
              <Smartphone className="h-4 w-4" />
              Instrukcja dla iPhone (Safari)
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Otwórz menu Udostępnij w Safari.</li>
              <li>Wybierz „Dodaj do ekranu początkowego”.</li>
              <li>Uruchom aplikację z dodanej ikony.</li>
              <li>W ustawieniach aplikacji wybierz „Włącz powiadomienia”.</li>
            </ol>
          </div>
        ) : null}

        {denied ? (
          <p className="text-sm text-muted">
            Powiadomienia są zablokowane w ustawieniach przeglądarki. Aby je włączyć, zmień
            uprawnienia dla tej strony.
          </p>
        ) : active ? (
          <div className="grid gap-3">
            <p className="text-sm text-emerald-300">Powiadomienia są aktywne na tym urządzeniu.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={loading}
                onClick={() => void sendTestNotification()}
              >
                {loading ? "Wysyłanie..." : "Wyślij testowe"}
              </Button>
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => void unsubscribe()}
              >
                Wyłącz na tym urządzeniu
              </Button>
            </div>
          </div>
        ) : (
          <Button
            disabled={loading || missingVapid || (isIos && !isStandalone)}
            onClick={() => void subscribe()}
          >
            {loading ? "Włączanie..." : "Włącz powiadomienia"}
          </Button>
        )}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        {renderEmailTest(true)}
      </CardContent>
    </Card>
  );
}
