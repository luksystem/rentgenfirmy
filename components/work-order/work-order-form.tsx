"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AcceptedOfferPdfButton } from "@/components/work-order/accepted-offer-pdf-button";
import { ClientPicker } from "@/components/client-picker";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SERVICE_TYPES } from "@/lib/service/types";
import {
  WORK_ORDER_STATUSES,
  type WorkOrderRecord,
} from "@/lib/work-order/types";
import { validateWorkOrder } from "@/lib/work-order/validate";
import { projectsForClient } from "@/lib/sort/party-and-project";
import { useAppStore } from "@/store/app-store";
import { useWorkOrderStore } from "@/store/work-order-store";
import { formatDate, formatMoney } from "@/lib/utils";

export function WorkOrderForm({ initialOrder }: { initialOrder: WorkOrderRecord }) {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const addClient = useAppStore((s) => s.addClient);
  const upsertOrder = useWorkOrderStore((s) => s.upsertOrder);
  const isSaving = useWorkOrderStore((s) => s.isSaving);

  const [order, setOrder] = useState(initialOrder);
  const [withoutProject, setWithoutProject] = useState(!initialOrder.projectId);
  const [errors, setErrors] = useState<string[]>([]);

  const clientProjects = useMemo(
    () => projectsForClient(projects, order.clientId),
    [order.clientId, projects],
  );
  const clientHasProjects = clientProjects.length > 0;

  useEffect(() => {
    if (order.clientId && clientHasProjects && withoutProject) {
      setWithoutProject(false);
    }
  }, [order.clientId, clientHasProjects, withoutProject]);

  async function save() {
    const payload: WorkOrderRecord = {
      ...order,
      updatedAt: new Date().toISOString(),
      projectId: withoutProject ? null : order.projectId,
    };

    const validationErrors = validateWorkOrder(payload);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await upsertOrder(payload);
      router.push("/zlecenia");
    } catch {
      setErrors(["Nie udało się zapisać zlecenia. Sprawdź połączenie z Supabase."]);
    }
  }

  const fromOffer = order.source === "accepted_offer";

  return (
    <Card className="overflow-visible">
      <CardContent className="grid gap-4 py-5">
        {fromOffer ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">Zlecenie z zaakceptowanej oferty</p>
            {order.acceptedAt ? (
              <p className="mt-1 text-muted">
                Zaakceptowano {formatDate(order.acceptedAt)}
                {order.offerGrossTotal !== null
                  ? ` · brutto ${formatMoney(order.offerGrossTotal)}`
                  : ""}
              </p>
            ) : null}
            {order.serviceId ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link href={`/oferty/${order.serviceId}`} className="text-accent underline">
                  Otwórz powiązaną ofertę
                </Link>
                {order.acceptedOfferDocument ? (
                  <AcceptedOfferPdfButton document={order.acceptedOfferDocument} />
                ) : null}
              </div>
            ) : order.acceptedOfferDocument ? (
              <div className="mt-2">
                <AcceptedOfferPdfButton document={order.acceptedOfferDocument} />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tytuł zlecenia" className="sm:col-span-2">
            <Input
              value={order.title}
              onChange={(event) => setOrder({ ...order, title: event.target.value })}
            />
          </Field>

          <Field label="Typ prac">
            <Select
              value={order.serviceType}
              onChange={(event) =>
                setOrder({
                  ...order,
                  serviceType: event.target.value as WorkOrderRecord["serviceType"],
                })
              }
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </Field>

          <Field label="Status zlecenia">
            <Select
              value={order.status}
              onChange={(event) =>
                setOrder({
                  ...order,
                  status: event.target.value as WorkOrderRecord["status"],
                })
              }
            >
              {WORK_ORDER_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ClientPicker
            clients={clients}
            clientId={order.clientId}
            clientSnapshot={order.client}
            onSelectClient={(clientId, snapshot) => {
              const nextClientProjects = projectsForClient(projects, clientId);
              if (nextClientProjects.length > 0) {
                setWithoutProject(false);
              }
              setOrder({ ...order, clientId, client: snapshot, projectId: null });
            }}
            onCreateClient={addClient}
          />
        </div>

        {order.clientId ? (
          <div className="relative z-20 grid gap-3 overflow-visible rounded-xl border border-border/80 bg-surface-muted/30 p-4">
            {!clientHasProjects ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={withoutProject}
                  onChange={(event) => {
                    setWithoutProject(event.target.checked);
                    if (event.target.checked) {
                      setOrder({ ...order, projectId: null });
                    }
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                Zlecenie bez projektu
              </label>
            ) : null}

            {clientHasProjects ? (
              <ProjectSelectSearchable
                key={order.clientId ?? "no-client"}
                projects={clientProjects}
                clients={clients}
                value={order.projectId}
                onChange={(projectId) => setOrder({ ...order, projectId })}
                emptyLabel="Wybierz projekt klienta"
              />
            ) : (
              <p className="text-xs text-muted">
                Ten klient nie ma przypisanych projektów — zostaw zaznaczone „Zlecenie bez projektu”.
              </p>
            )}
          </div>
        ) : null}

        <Field label="Notatki">
          <Textarea
            rows={4}
            value={order.notes}
            onChange={(event) => setOrder({ ...order, notes: event.target.value })}
            placeholder="Uwagi operacyjne, ustalenia z klientem…"
          />
        </Field>

        {errors.length > 0 ? (
          <ul className="grid gap-1 text-sm text-rose-400">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isSaving} onClick={() => void save()}>
            {isSaving ? "Zapisywanie…" : "Zapisz zlecenie"}
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link href="/zlecenia">Anuluj</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
