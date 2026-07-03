"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMessageTemplateToken,
  getTemplateVariablesForTrigger,
  MESSAGE_TEMPLATE_CATEGORY_LABELS,
  MESSAGE_TEMPLATE_VARIABLES,
  type MessageTemplateVariable,
  type MessageTemplateVariableCategory,
} from "@/lib/messages/template-variables";
import type { SmsRuleTrigger } from "@/lib/sms/sms-rules";
import { cn } from "@/lib/utils";

function VariableRow({ variable }: { variable: MessageTemplateVariable }) {
  const token = formatMessageTemplateToken(variable.key);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Brak uprawnień schowka — użytkownik może skopiować ręcznie.
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-accent">{token}</code>
          <span className="text-sm font-medium text-foreground">{variable.label}</span>
        </div>
        <p className="mt-1 text-xs text-muted">{variable.description}</p>
        {variable.example ? (
          <p className="mt-1 text-xs text-muted/80">Przykład: {variable.example}</p>
        ) : null}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
        {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
        {copied ? "Skopiowano" : "Kopiuj"}
      </Button>
    </div>
  );
}

function groupByCategory(variables: MessageTemplateVariable[]) {
  const groups = new Map<MessageTemplateVariableCategory, MessageTemplateVariable[]>();

  for (const variable of variables) {
    const list = groups.get(variable.category) ?? [];
    list.push(variable);
    groups.set(variable.category, list);
  }

  return (["dane", "linki"] as const)
    .map((category) => ({
      category,
      variables: groups.get(category) ?? [],
    }))
    .filter((group) => group.variables.length > 0);
}

export function MessageTemplateVariablesReference({
  trigger,
  compact = false,
}: {
  trigger?: SmsRuleTrigger;
  compact?: boolean;
}) {
  const variables = trigger ? getTemplateVariablesForTrigger(trigger) : MESSAGE_TEMPLATE_VARIABLES;
  const groups = groupByCategory(variables);

  return (
    <div className={cn("grid gap-3", compact ? "text-sm" : "")}>
      {groups.map((group) => (
        <div key={group.category} className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {MESSAGE_TEMPLATE_CATEGORY_LABELS[group.category]}
          </p>
          <div className="grid gap-2">
            {group.variables.map((variable) => (
              <VariableRow key={variable.key} variable={variable} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
