"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import {
  PROTOCOL_FIELD_TYPES,
  PROTOCOL_FIELD_TYPE_LABELS,
  type ProtocolField,
} from "@/lib/process/protocol-types";

export function ProtocolFieldEditor({
  fields,
  onChange,
}: {
  fields: ProtocolField[];
  onChange: (fields: ProtocolField[]) => void;
}) {
  function addField() {
    onChange([
      ...fields,
      { id: crypto.randomUUID(), type: "text", label: "Nowe pole", required: false },
    ]);
  }

  function updateField(id: string, patch: Partial<ProtocolField>) {
    onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  }

  function removeField(id: string) {
    onChange(fields.filter((field) => field.id !== id));
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Pola formularza protokołu</p>
        <Button type="button" size="sm" variant="outline" onClick={addField}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Dodaj pole
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted">
          Brak pól — dodaj przynajmniej jedno pole (np. „Uwagi”, „Stan instalacji”).
        </p>
      ) : null}

      <div className="grid gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pole {index + 1}</p>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="text-muted transition hover:text-rose-300"
                title="Usuń pole"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label="Etykieta">
                <Input
                  value={field.label}
                  onChange={(event) => updateField(field.id, { label: event.target.value })}
                />
              </Field>
              <Field label="Typ pola">
                <Select
                  value={field.type}
                  onChange={(event) =>
                    updateField(field.id, { type: event.target.value as ProtocolField["type"] })
                  }
                >
                  {PROTOCOL_FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PROTOCOL_FIELD_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {field.type === "select" ? (
              <div className="mt-2">
                <Field label="Opcje (rozdziel przecinkiem)">
                  <Input
                    value={(field.options ?? []).join(", ")}
                    onChange={(event) =>
                      updateField(field.id, {
                        options: event.target.value
                          .split(",")
                          .map((option) => option.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Sprawne, Wymaga naprawy, Nie dotyczy"
                  />
                </Field>
              </div>
            ) : null}
            <label className="mt-2 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={Boolean(field.required)}
                onChange={(event) => updateField(field.id, { required: event.target.checked })}
              />
              Pole wymagane
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
