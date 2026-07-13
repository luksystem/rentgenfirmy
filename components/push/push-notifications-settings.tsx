"use client";

import { Bell, BellOff, BellRing, Smartphone } from "lucide-react";
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
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="border border-border/80">
        <CardContent className="py-5 text-sm text-muted">
          Ta przeglądarka nie obsługuje powiadomień Web Push.
        </CardContent>
      </Card>
    );
  }

  const denied = permission === "denied";
  const active = status.subscribed && permission === "granted";

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
          <Button disabled={loading || (isIos && !isStandalone)} onClick={() => void subscribe()}>
            {loading ? "Włączanie..." : "Włącz powiadomienia"}
          </Button>
        )}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
