import { cn } from "@/lib/utils";

const RICH_HTML_VARIANTS = {
  default:
    "text-sm leading-7 text-foreground [&_b]:font-semibold [&_br]:block [&_font]:[font-family:inherit]",
  document:
    "text-sm leading-relaxed text-foreground/90 [&_b]:font-semibold [&_br]:block [&_font]:[font-family:inherit] [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:border-b [&_h3]:border-border/50 [&_h3]:pb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3:first-child]:mt-0 [&_h4]:mb-1.5 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground [&_li]:leading-relaxed [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
} as const;

export function RichHtml({
  html,
  className,
  fallback = "—",
  variant = "default",
}: {
  html?: string | null;
  className?: string;
  fallback?: string;
  variant?: keyof typeof RICH_HTML_VARIANTS;
}) {
  const trimmed = html?.trim();
  if (!trimmed) {
    return <p className={cn("text-sm text-muted", className)}>{fallback}</p>;
  }

  return (
    <div
      className={cn("rich-html", RICH_HTML_VARIANTS[variant], className)}
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}
