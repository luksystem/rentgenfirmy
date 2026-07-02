"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CAFE_PRIORITY_OPTIONS } from "@/lib/service-intake/cafe-priorities";
import {
  resolveServiceIntakeDueAt,
  SERVICE_INTAKE_STATUS_BADGE_CLASS,
  SERVICE_INTAKE_STATUS_TONE,
} from "@/lib/service-intake/sla";
import {
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_REQUEST_TYPE_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeRecord,
} from "@/lib/service-intake/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export function ProjectServiceIntakeHistoryPanel({
  projectId,
  intakes: intakesProp,
  seedIntakes,
  readOnly = false,
}: {
  projectId: string;
  intakes?: ServiceIntakeRecord[];
  seedIntakes?: ServiceIntakeRecord[];
  readOnly?: boolean;
}) {
  const [intakes, setIntakes] = useState<ServiceIntakeRecord[]>(
    seedIntakes ?? intakesProp ?? [],
  );

  useEffect(() => {
    if (seedIntakes !== undefined) {
      setIntakes(seedIntakes);
      return;
    }
    if (intakesProp !== undefined) {
      setIntakes(intakesProp);
      return;
    }

    let cancelled = false;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/service-intakes`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setIntakes(payload.items ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIntakes([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [intakesProp, projectId, seedIntakes]);
  if (!intakes.length) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
        Brak zgłoszeń serwisowych dla tego projektu.
        {!readOnly ? " Nowe zgłoszenia pojawią się tutaj po wysłaniu przez klienta." : null}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {intakes.map((intake) => {
        const cafe = intake.priority
          ? CAFE_PRIORITY_OPTIONS.find((entry) => entry.id === intake.priority)
          : null;
        const tone = SERVICE_INTAKE_STATUS_TONE[intake.status];
        const dueAt = resolveServiceIntakeDueAt(intake);

        return (
          <article
            key={intake.id}
            className={cn(
              "rounded-xl border p-4",
              cafe ? cafe.toneClass : "border-border/70 bg-surface-muted/10",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{intake.referenceNumber}</p>
                <p className="mt-1 text-sm text-muted">{formatDateTime(intake.createdAt)}</p>
                {dueAt ? (
                  <p className="mt-0.5 text-sm text-muted">Wykonać do: {formatDate(dueAt.slice(0, 10))}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  SERVICE_INTAKE_STATUS_BADGE_CLASS[tone],
                )}
              >
                {SERVICE_INTAKE_STATUS_LABELS[intake.status]}
              </span>
            </div>

            <p className="mt-3 line-clamp-3 text-sm text-foreground">{intake.description}</p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              <span>{SERVICE_INTAKE_REQUEST_TYPE_LABELS[intake.requestType]}</span>
              <span>·</span>
              <span>{intake.serviceTypeHint}</span>
              {intake.priority ? (
                <>
                  <span>·</span>
                  <span>{SERVICE_INTAKE_PRIORITY_LABELS[intake.priority]}</span>
                </>
              ) : null}
              {cafe ? (
                <>
                  <span>·</span>
                  <span className="font-semibold text-foreground">CAFE {cafe.letter}</span>
                </>
              ) : null}
            </div>

            <div className="mt-3">
              <Link
                href={`/zgloszenie/watek/${intake.trackingToken}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                Otwórz wątek
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
