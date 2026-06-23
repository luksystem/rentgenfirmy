export function NavBadges({
  overdueCount = 0,
  newCount = 0,
  size = "md",
}: {
  overdueCount?: number;
  newCount?: number;
  size?: "sm" | "md";
}) {
  if (overdueCount <= 0 && newCount <= 0) {
    return null;
  }

  const sizeClass =
    size === "sm"
      ? "h-3.5 min-w-3.5 px-0.5 text-[8px]"
      : "h-5 min-w-5 px-1.5 text-[10px]";

  return (
    <span className="flex items-center gap-0.5">
      {overdueCount > 0 ? (
        <span
          className={`inline-flex items-center justify-center rounded-full bg-rose-500 font-bold text-white ${sizeClass}`}
        >
          {overdueCount > 99 ? "99+" : overdueCount}
        </span>
      ) : null}
      {newCount > 0 ? (
        <span
          className={`inline-flex items-center justify-center rounded-full bg-emerald-500 font-bold text-white ${sizeClass}`}
        >
          {newCount > 99 ? "99+" : newCount}
        </span>
      ) : null}
    </span>
  );
}
