import { cn } from "@/lib/utils";

export function RichHtml({
  html,
  className,
  fallback = "—",
}: {
  html?: string | null;
  className?: string;
  fallback?: string;
}) {
  const trimmed = html?.trim();
  if (!trimmed) {
    return <p className={cn("text-sm text-muted", className)}>{fallback}</p>;
  }

  return (
    <div
      className={cn(
        "rich-html text-sm leading-7 text-foreground [&_b]:font-semibold [&_br]:block [&_font]:[font-family:inherit]",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}
