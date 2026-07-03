"use client";

import Link from "next/link";
import { ExternalLink, Mail, Phone, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TradeCompanyWithProjects } from "@/lib/trades/company-types";

type PhoneOption = {
  label: string;
  phone: string;
  contactName?: string;
};

function collectPhoneOptions(company: TradeCompanyWithProjects): PhoneOption[] {
  const seen = new Set<string>();
  const options: PhoneOption[] = [];

  const add = (phone: string | undefined, label: string, contactName?: string) => {
    const normalized = phone?.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    options.push({ phone: normalized, label, contactName: contactName?.trim() || undefined });
  };

  add(company.phone, "Główny kontakt", company.contactName);

  for (const project of company.projects) {
    add(
      project.phone,
      project.projectName,
      project.contactName ?? company.contactName,
    );
  }

  return options;
}

function collectEmailOptions(company: TradeCompanyWithProjects) {
  const seen = new Set<string>();
  const options: { label: string; email: string }[] = [];

  const add = (email: string | undefined, label: string) => {
    const normalized = email?.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) {
      return;
    }
    seen.add(normalized.toLowerCase());
    options.push({ email: normalized, label });
  };

  add(company.email, "Główny kontakt");
  for (const project of company.projects) {
    add(project.email, project.projectName);
  }

  return options;
}

type TradeCompanyDetailDialogProps = {
  company: TradeCompanyWithProjects | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TradeCompanyDetailDialog({
  company,
  open,
  onOpenChange,
}: TradeCompanyDetailDialogProps) {
  if (!company) {
    return null;
  }

  const phones = collectPhoneOptions(company);
  const emails = collectEmailOptions(company);
  const addressParts = [company.addressStreet, company.addressPostalCode, company.addressCity].filter(
    Boolean,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{company.company}</DialogTitle>
          <DialogDescription>
            Branża: {company.tradeName}
            {company.projects.length
              ? ` · ${company.projects.length} ${
                  company.projects.length === 1 ? "projekt" : company.projects.length < 5 ? "projekty" : "projektów"
                }`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {company.description ? (
            <p className="text-sm text-muted">{company.description}</p>
          ) : null}

          {company.contactName ? (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 shrink-0 text-muted" />
              <span>{company.contactName}</span>
            </div>
          ) : null}

          {phones.length ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Telefony</p>
              <div className="grid gap-2">
                {phones.map((option) => (
                  <a
                    key={`${option.label}-${option.phone}`}
                    href={`tel:${option.phone.replace(/\s/g, "")}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/15 px-3 py-2.5 transition hover:border-accent/40 hover:bg-accent/5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{option.phone}</p>
                      <p className="text-xs text-muted">
                        {option.label}
                        {option.contactName ? ` · ${option.contactName}` : null}
                      </p>
                    </div>
                    <Phone className="h-4 w-4 shrink-0 text-accent" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Brak numeru telefonu w katalogu.</p>
          )}

          {emails.length ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">E-mail</p>
              <div className="grid gap-2">
                {emails.map((option) => (
                  <a
                    key={`${option.label}-${option.email}`}
                    href={`mailto:${option.email}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/15 px-3 py-2.5 transition hover:border-accent/40 hover:bg-accent/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{option.email}</p>
                      <p className="text-xs text-muted">{option.label}</p>
                    </div>
                    <Mail className="h-4 w-4 shrink-0 text-accent" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {addressParts.length ? (
            <p className="text-sm text-muted">{addressParts.join(", ")}</p>
          ) : null}

          {company.projects.length ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Projekty z tą firmą
              </p>
              <ul className="grid gap-2">
                {company.projects.map((project) => (
                  <li key={project.projectId}>
                    {project.clientId ? (
                      <Link
                        href={`/przestrzenie/klient/${project.clientId}?project=${project.projectId}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2.5 text-sm transition hover:border-accent/40 hover:bg-accent/5"
                        onClick={() => onOpenChange(false)}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{project.projectName}</p>
                          <p className="text-xs text-muted">{project.clientName}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted" />
                      </Link>
                    ) : (
                      <div className="rounded-xl border border-border/70 px-3 py-2.5 text-sm">
                        <p className="font-medium text-foreground">{project.projectName}</p>
                        <p className="text-xs text-muted">{project.clientName}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Firma nie jest jeszcze przypisana do żadnego projektu — tylko wpis w katalogu.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
