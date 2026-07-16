import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/icons/rentgen-logo-mark-transparent-1024.png";

export function BrandMark({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Rentgen"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      priority
    />
  );
}
