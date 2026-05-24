import { clsx } from "clsx";

type StockBadgeProps = {
  available: number;
};

export function StockBadge({ available }: StockBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold tracking-wide transition-all duration-300",
        available > 10 &&
          "border-[#b8d6ca] bg-[#edf8f3] text-[#17624f] dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400",
        available > 0 &&
          available <= 10 &&
          "border-[#f0d49b] bg-[#fff7e6] text-[#815b12] dark:border-amber-700/30 dark:bg-amber-950/20 dark:text-amber-400",
        available === 0 &&
          "border-[#efc6c6] bg-[#fff1f1] text-[#9a2a2a] dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400",
      )}
    >
      {available} available
    </span>
  );
}
