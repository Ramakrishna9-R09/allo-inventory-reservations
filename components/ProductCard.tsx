"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Minus, Plus, ShoppingCart, MapPin } from "lucide-react";

import { StockBadge } from "@/components/StockBadge";
import type { ApiError } from "@/lib/errors";
import type { ProductWithAvailability } from "@/lib/inventory";

type ProductCardProps = {
  product: ProductWithAvailability;
};

type ReservationResponse = {
  reservation: {
    id: string;
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const firstAvailableWarehouse =
    product.warehouses.find((warehouse) => warehouse.availableStock > 0) ??
    product.warehouses[0];
  const [warehouseId, setWarehouseId] = useState(firstAvailableWarehouse?.id);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const selectedWarehouse = useMemo(
    () => product.warehouses.find((warehouse) => warehouse.id === warehouseId),
    [product.warehouses, warehouseId],
  );

  const maxQuantity = Math.max(1, selectedWarehouse?.availableStock ?? 0);
  const isSoldOut = !selectedWarehouse || selectedWarehouse.availableStock < 1;

  async function reserve() {
    if (!selectedWarehouse || isSoldOut) {
      setMessage("Sorry, not enough stock available");
      return;
    }

    setStatus("submitting");
    setMessage(null);

    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        warehouseId: selectedWarehouse.id,
        quantity,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as ApiError;
      setMessage(
        payload.code === "INSUFFICIENT_STOCK" || payload.code === "LOCK_CONFLICT"
          ? "Sorry, not enough stock available"
          : payload.error,
      );
      setStatus("idle");
      return;
    }

    const payload = (await response.json()) as ReservationResponse;
    router.push(`/reservation/${payload.reservation.id}`);
  }

  return (
    <article className="glass-card flex flex-col overflow-hidden rounded-2xl border border-slate-200/50 bg-white/70 shadow-lg transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] dark:border-slate-800/40 dark:bg-slate-900/60 md:flex-row">
      {/* Image container */}
      <div className="relative min-h-48 w-full bg-slate-100 dark:bg-slate-950 md:w-44 md:min-h-full">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 176px, 100vw"
            className="object-cover transition duration-500 hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            No image
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
        <div>
          <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-indigo-600 uppercase dark:bg-indigo-950/40 dark:text-indigo-400">
            {product.sku}
          </span>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-800 dark:text-white">
            {product.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Warehouse Selector */}
        <div className="grid gap-2">
          {product.warehouses.map((warehouse) => {
            const isSelected = warehouseId === warehouse.id;
            return (
              <label
                key={warehouse.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/10 dark:ring-indigo-500"
                    : "border-slate-200 hover:bg-slate-50/50 dark:border-slate-800/80 dark:hover:bg-slate-800/20"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <input
                    type="radio"
                    name={`warehouse-${product.id}`}
                    checked={isSelected}
                    onChange={() => {
                      setWarehouseId(warehouse.id);
                      setQuantity(1);
                      setMessage(null);
                    }}
                    className="sr-only"
                  />
                  <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all duration-250 ${
                    isSelected 
                      ? "border-indigo-650 dark:border-indigo-500 bg-indigo-600 dark:bg-indigo-500 scale-100" 
                      : "border-slate-300 dark:border-slate-700 bg-transparent"
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full bg-white transition-transform duration-250 ${
                      isSelected ? "scale-100" : "scale-0"
                    }`} />
                  </div>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                      {warehouse.name}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {warehouse.location}
                    </span>
                  </span>
                </span>
                <StockBadge available={warehouse.availableStock} />
              </label>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex h-10 w-32 items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={isSoldOut}
              className="grid h-full w-10 place-items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-bold text-slate-800 dark:text-white">
              {isSoldOut ? 0 : quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() =>
                setQuantity((value) => Math.min(maxQuantity, value + 1))
              }
              disabled={isSoldOut}
              className="grid h-full w-10 place-items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={reserve}
            disabled={status === "submitting" || isSoldOut}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:pointer-events-none disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          >
            {status === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {status === "submitting" ? "Reserving..." : "Reserve Stock"}
          </button>
        </div>

        {message ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-600 dark:border-rose-950/40 dark:bg-rose-950/10 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
