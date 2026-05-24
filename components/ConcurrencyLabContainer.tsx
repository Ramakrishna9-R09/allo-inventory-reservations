"use client";

import { useRouter } from "next/navigation";
import { ProductCard } from "./ProductCard";
import { ConcurrencyLab } from "./ConcurrencyLab";
import { PackageOpen, Lightbulb } from "lucide-react";
import type { ProductWithAvailability } from "@/lib/inventory";

type ContainerProps = {
  products: ProductWithAvailability[];
};

export function ConcurrencyLabContainer({ products }: ContainerProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Top Banner Info */}
      <div className="rounded-2xl border border-indigo-200/50 bg-indigo-50/20 p-5 dark:border-indigo-950/40 dark:bg-indigo-950/10">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Understanding Concurrency Holds
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              When a checkout hold is created, the system increments the reserved count on the database. Available stock is calculated as:{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-slate-900 dark:text-indigo-400">
                total - reserved
              </code>
              . A database transaction locks the stock row using{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-slate-900 dark:text-indigo-400">
                FOR UPDATE NOWAIT
              </code>
              , preventing double-booking and resolving checkout races under extreme traffic.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Product Cards */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <PackageOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
            Available Inventory
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Concurrency Lab Console */}
      <ConcurrencyLab products={products} onRaceComplete={handleRefresh} />
    </div>
  );
}
