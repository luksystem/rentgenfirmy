import type { ServiceIntakeAttachment } from "@/lib/service-intake/types";

export function serviceIntakeAttachmentLabel(
  attachment: Pick<ServiceIntakeAttachment, "label" | "url" | "kind">,
) {
  if (attachment.label?.trim()) {
    return attachment.label.trim();
  }

  try {
    const pathname = new URL(attachment.url).pathname;
    const fileName = pathname.split("/").filter(Boolean).pop();
    if (fileName) {
      return decodeURIComponent(fileName);
    }
  } catch {
    // ignore invalid URLs (e.g. pasted relative paths)
  }

  if (attachment.kind === "link") {
    return "Link zewnętrzny";
  }

  return "Załącznik";
}
