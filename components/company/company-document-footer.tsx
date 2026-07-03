import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { cn } from "@/lib/utils";

export function CompanyDocumentFooter({
  profile,
  documentNote = "Dokument wygenerowany w module Oferty · Rentgen firmy",
  className,
}: {
  profile: CompanyProfileDocument;
  documentNote?: string;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "flex flex-col items-center gap-3 border-t border-zinc-200 px-6 py-5 text-center sm:px-8",
        className,
      )}
    >
      {profile.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.logoUrl}
          alt={profile.displayName}
          className="max-h-12 max-w-[180px] object-contain"
        />
      ) : null}
      <div className="grid gap-0.5 text-xs leading-relaxed text-zinc-600">
        {profile.footerLines.length ? (
          profile.footerLines.map((line) => <p key={line}>{line}</p>)
        ) : (
          <p>{profile.displayName}</p>
        )}
      </div>
      <p className="text-[11px] text-zinc-400">{documentNote}</p>
    </footer>
  );
}
