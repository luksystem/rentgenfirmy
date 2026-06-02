"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NumericInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number;
  onChange: (value: number) => void;
  decimals?: boolean;
};

function formatDisplay(value: number, decimals: boolean) {
  if (value === 0) {
    return "";
  }

  return decimals ? String(value) : String(Math.trunc(value));
}

export function NumericInput({
  value,
  onChange,
  decimals = true,
  className,
  onFocus,
  onBlur,
  ...props
}: NumericInputProps) {
  const [display, setDisplay] = useState(() => formatDisplay(value, decimals));
  const [focused, setFocused] = useState(false);
  const pattern = decimals ? /^\d*\.?\d*$/ : /^\d*$/;

  useEffect(() => {
    if (focused) {
      return;
    }

    setDisplay(formatDisplay(value, decimals));
  }, [value, decimals, focused]);

  function commit(raw: string) {
    if (raw === "" || raw === ".") {
      onChange(0);
      return;
    }

    const parsed = decimals ? Number(raw) : Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      className={cn(className)}
      value={display}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onChange={(event) => {
        const raw = event.target.value.replace(",", ".");
        if (raw !== "" && !pattern.test(raw)) {
          return;
        }

        setDisplay(raw);
        commit(raw);
      }}
      onBlur={(event) => {
        setFocused(false);

        if (display === "" || display === ".") {
          setDisplay("");
          onChange(0);
        } else {
          const parsed = decimals ? Number(display) : Number.parseInt(display, 10);
          if (Number.isFinite(parsed) && parsed >= 0) {
            setDisplay(formatDisplay(parsed, decimals));
          }
        }

        onBlur?.(event);
      }}
    />
  );
}
