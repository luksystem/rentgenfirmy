"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import {
  WORK_OBSTACLE_TYPE_LABELS,
  WORK_OBSTACLE_TYPES,
  type WorkObstacleType,
} from "@/lib/my-work/plan-types";
import type { WorkItemView } from "@/lib/my-work/types";

export function MyWorkObstacleDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
}: {
  item: WorkItemView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (obstacleType: WorkObstacleType, description: string) => Promise<void>;
}) {
  const [obstacleType, setObstacleType] = useState<WorkObstacleType>("other");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!description.trim()) {
      window.alert("Opisz przeszkodę.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(obstacleType, description);
      onOpenChange(false);
      setDescription("");
      setObstacleType("other");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zgłosić przeszkody.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zgłoś przeszkodę</DialogTitle>
          <DialogDescription>
            Opisz barierę organizacyjną przy zadaniu: {item.title}
          </DialogDescription>
        </DialogHeader>

        <Field label="Typ przeszkody">
          <Select
            value={obstacleType}
            onChange={(event) => setObstacleType(event.target.value as WorkObstacleType)}
          >
            {WORK_OBSTACLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {WORK_OBSTACLE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Opis">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Co blokuje wykonanie i czego potrzebujesz od managera?"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            Zgłoś
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
