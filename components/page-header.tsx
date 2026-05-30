import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{action}</div> : null}
    </div>
  );
}

export function ResetButton({
  onReset,
  disabled,
}: {
  onReset: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Button variant="secondary" disabled={disabled} onClick={() => void onReset()}>
      Załaduj dane demo
    </Button>
  );
}
