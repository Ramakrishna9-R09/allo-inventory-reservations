"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";

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
    <article className="grid overflow-hidden rounded-lg border border-[#d9e2e8] bg-white shadow-sm sm:grid-cols-[180px_1fr]">
      <div className="relative min-h-44 bg-[#e7eef2]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 640px) 180px, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-4 p-5">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-[#6a7a86]">
            {product.sku}
          </div>
          <h2 className="text-xl font-semibold text-[#172026]">
            {product.name}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#53636f]">
            {product.description}
          </p>
        </div>

        <div className="grid gap-2">
          {product.warehouses.map((warehouse) => (
            <label
              key={warehouse.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded border border-[#d9e2e8] px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-3">
                <input
                  type="radio"
                  name={`warehouse-${product.id}`}
                  checked={warehouseId === warehouse.id}
                  onChange={() => {
                    setWarehouseId(warehouse.id);
                    setQuantity(1);
                    setMessage(null);
                  }}
                  className="h-4 w-4 accent-[#17624f]"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-[#172026]">
                    {warehouse.name}
                  </span>
                  <span className="block truncate text-xs text-[#6a7a86]">
                    {warehouse.location}
                  </span>
                </span>
              </span>
              <StockBadge available={warehouse.availableStock} />
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e5ecef] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex h-10 w-32 items-center justify-between rounded border border-[#c8d4dc] bg-[#fbfcfd]">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid h-full w-10 place-items-center text-[#53636f]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() =>
                setQuantity((value) => Math.min(maxQuantity, value + 1))
              }
              className="grid h-full w-10 place-items-center text-[#53636f]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={reserve}
            disabled={status === "submitting" || isSoldOut}
            className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#17624f] px-4 text-sm font-semibold text-white transition hover:bg-[#124d3f] disabled:cursor-not-allowed disabled:bg-[#9aa9b2]"
          >
            {status === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {status === "submitting" ? "Reserving..." : "Reserve"}
          </button>
        </div>

        {message ? (
          <div className="flex items-center gap-2 rounded border border-[#efc6c6] bg-[#fff1f1] px-3 py-2 text-sm text-[#9a2a2a]">
            <AlertCircle className="h-4 w-4" />
            {message}
          </div>
        ) : null}
      </div>
    </article>
  );
}
