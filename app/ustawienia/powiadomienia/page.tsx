"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmailSettingsView } from "@/components/settings/email-settings-view";
import { SmsSettingsView } from "@/components/settings/sms-settings-view";
import { PushNotificationsSettings } from "@/components/push/push-notifications-settings";
import { cn } from "@/lib/utils";

type NotificationsTab = "push" | "email" | "sms";

const TABS: Array<{ id: NotificationsTab; label: string; icon: typeof Bell }> = [
  { id: "push", label: "Push", icon: Bell },
  { id: "email", label: "E-mail", icon: Mail },
  { id: "sms", label: "SMS", icon: MessageSquare },
];

function NotificationsSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: NotificationsTab = tabParam === "email" || tabParam === "sms" ? tabParam : "push";

  function selectTab(tab: NotificationsTab) {
    router.replace(
      tab === "push" ? "/ustawienia/powiadomienia" : `/ustawienia/powiadomienia?tab=${tab}`,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Powiadomienia"
        description="Wszystko, co dotyczy powiadomień zespołu i klientów, w jednym miejscu: push, e-mail i SMS."
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "push" ? <PushNotificationsSettings /> : null}
      {activeTab === "email" ? <EmailSettingsView /> : null}
      {activeTab === "sms" ? <SmsSettingsView /> : null}
    </>
  );
}

export default function NotificationsSettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie ustawień powiadomień…</p>}>
      <NotificationsSettingsContent />
    </Suspense>
  );
}
