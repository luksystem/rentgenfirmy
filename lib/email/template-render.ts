import { escapeEmailHtml } from "@/lib/email/layout";

/** Zamienia placeholdery w szablonie. Najpierw escape całego tekstu, potem wstawia wartości. */
export function renderEmailTemplateString(
  template: string,
  textVars: Record<string, string> = {},
  htmlVars: Record<string, string> = {},
) {
  let result = escapeEmailHtml(template);

  for (const [key, value] of Object.entries(textVars)) {
    result = result.split(`{{${key}}}`).join(escapeEmailHtml(value));
  }

  for (const [key, value] of Object.entries(htmlVars)) {
    result = result.split(`{{${key}}}`).join(value);
  }

  // Usuń niewypełnione placeholdery HTML-bloków, żeby nie zostawały w mailu.
  result = result.replace(/\{\{[a-z0-9_]+\}\}/gi, "");

  const paragraphs = result
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const withBreaks = block.replace(/\n/g, "<br />");
      // Bloki zaczynające się od HTML (np. agreements) nie owijamy w <p>
      if (withBreaks.startsWith("<")) {
        return withBreaks;
      }
      return `<p style="margin:0 0 16px;color:#374151;line-height:1.55;">${withBreaks}</p>`;
    });

  return paragraphs.join("");
}

export function renderEmailSubject(
  template: string,
  textVars: Record<string, string> = {},
) {
  let result = template;
  for (const [key, value] of Object.entries(textVars)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result.replace(/\{\{[a-z0-9_]+\}\}/gi, "").trim();
}
