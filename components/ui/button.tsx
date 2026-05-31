import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground shadow-soft hover:bg-[var(--accent-hover)] active:scale-[0.98]",
        secondary:
          "bg-surface-muted text-foreground hover:bg-stone-200/60 active:scale-[0.98]",
        outline:
          "border border-border bg-surface text-foreground hover:bg-surface-muted active:scale-[0.98]",
        destructive:
          "bg-rose-600 text-white shadow-soft hover:bg-rose-700 active:scale-[0.98]",
        ghost: "text-muted hover:bg-surface-muted hover:text-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-xl px-3 text-xs",
        lg: "h-12 rounded-2xl px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
