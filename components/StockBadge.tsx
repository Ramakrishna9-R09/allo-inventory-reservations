import { clsx } from "clsx";

type StockBadgeProps = {
  available: number;
};

export function StockBadge({ available }: StockBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded border px-2 text-xs font-semibold",
        available > 10 &&
          "border-[#b8d6ca] bg-[#edf8f3] text-[#17624f]",
        available > 0 &&
          available <= 10 &&
          "border-[#f0d49b] bg-[#fff7e6] text-[#815b12]",
        available === 0 &&
          "border-[#efc6c6] bg-[#fff1f1] text-[#9a2a2a]",
      )}
    >
      {available} available
    </span>
  );
}
