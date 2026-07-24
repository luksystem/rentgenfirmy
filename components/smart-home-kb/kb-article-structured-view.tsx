import { Lightbulb } from "lucide-react";
import { RichHtml } from "@/components/ui/rich-html";
import type { SmartHomeKbArticle } from "@/lib/smart-home-kb/types";

/** Zawsze ten sam, ustandaryzowany układ artykułu: Kontekst → Kroki → Wskazówki. */
export function KbArticleStructuredView({ article }: { article: SmartHomeKbArticle }) {
  const hasStructuredContent =
    article.contextHtml.trim().length > 0 || article.steps.length > 0 || article.tipsHtml.trim().length > 0;

  if (!hasStructuredContent) {
    return <RichHtml html={article.bodyHtml} variant="document" fallback="Brak treści." />;
  }

  return (
    <div className="grid gap-6">
      {article.contextHtml.trim() ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Kontekst</h3>
          <RichHtml html={article.contextHtml} variant="document" />
        </section>
      ) : null}

      {article.steps.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Kroki</h3>
          <ol className="grid gap-3">
            {article.steps.map((step, index) => (
              <li
                key={index}
                className="flex gap-3 rounded-xl border border-border bg-surface-muted/20 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {step.title ? <p className="mb-1 font-medium text-foreground">{step.title}</p> : null}
                  <RichHtml html={step.bodyHtml} variant="document" />
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {article.tipsHtml.trim() ? (
        <section className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Lightbulb className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-sm font-semibold text-amber-300">Wskazówki</h3>
            <RichHtml html={article.tipsHtml} variant="document" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
