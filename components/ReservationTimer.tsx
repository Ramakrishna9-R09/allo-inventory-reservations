"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle, Building2, Package } from "lucide-react";

import type { ApiError } from "@/lib/errors";

type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED";

export type CheckoutReservation = {
  id: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  product: {
    name: string;
    sku: string;
  };
  warehouse: {
    name: string;
    location: string;
  } | null;
};

type ReservationTimerProps = {
  reservation: CheckoutReservation;
};

type ActionResponse = {
  reservation: {
    status: ReservationStatus;
  };
};

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function ReservationTimer({ reservation }: ReservationTimerProps) {
  const router = useRouter();
  const expiresAt = useMemo(
    () => new Date(reservation.expiresAt).getTime(),
    [reservation.expiresAt],
  );
  const [status, setStatus] = useState<ReservationStatus>(reservation.status);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"confirm" | "release" | null>(
    null,
  );

  const release = useCallback(async (stayOnPage = false) => {
    setBusyAction("release");
    setMessage(null);

    const response = await fetch(`/api/reservations/${reservation.id}/release`, {
      method: "POST",
    });

    if (!response.ok) {
      const payload = (await response.json()) as ApiError;
      setMessage(payload.error);
      setBusyAction(null);
      return;
    }

    const payload = (await response.json()) as ActionResponse;
    setStatus(payload.reservation.status);
    setMessage("Reservation cancelled. Held inventory has been released.");
    setBusyAction(null);

    if (!stayOnPage) {
      router.push("/");
    }
  }, [reservation.id, router]);

  useEffect(() => {
    if (status !== "PENDING") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemaining(rem);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [expiresAt, status]);

  useEffect(() => {
    if (remaining !== 0 || status !== "PENDING" || busyAction) {
      return;
    }

    void release(true);
  }, [remaining, status, busyAction, release]);

  async function confirm() {
    setBusyAction("confirm");
    setMessage(null);

    const response = await fetch(`/api/reservations/${reservation.id}/confirm`, {
      method: "POST",
    });

    if (!response.ok) {
      const payload = (await response.json()) as ApiError;
      setMessage(
        payload.code === "RESERVATION_EXPIRED"
          ? "This reservation has expired"
          : payload.error,
      );
      setStatus(payload.code === "RESERVATION_EXPIRED" ? "RELEASED" : status);
      setBusyAction(null);
      return;
    }

    const payload = (await response.json()) as ActionResponse;
    setStatus(payload.reservation.status);
    setMessage("Purchase confirmed. Inventory has been finalized.");
    setBusyAction(null);
  }

  const isPending = status === "PENDING";
  const isConfirmed = status === "CONFIRMED";
  const isReleased = status === "RELEASED";

  // Calculate percentage of timer remaining (assuming 10 minutes total)
  const timerPercentage = useMemo(() => {
    const totalDuration = 10 * 60; // 10 minutes in seconds
    return Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
  }, [remaining]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Detail Card */}
      <div className="glass-card rounded-2xl p-6 glow-blue border border-slate-200/50 dark:border-slate-800/40">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-indigo-600 uppercase dark:bg-indigo-950/40 dark:text-indigo-400">
              {reservation.product.sku}
            </span>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
              {reservation.product.name}
            </h1>
            
            <div className="mt-4 flex flex-col gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-500" />
                <span>Quantity: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{reservation.quantity} unit{reservation.quantity === 1 ? "" : "s"}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                <span>Warehouse: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{reservation.warehouse?.name ?? "Unknown Warehouse"}</strong></span>
              </div>
            </div>
          </div>

          {/* Glowing Timer Circle */}
          {isPending ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50/50 p-6 text-center dark:border-slate-800/80 dark:bg-slate-900/50 relative overflow-hidden min-w-[200px]">
              {/* Animated Progress Bar */}
              <div 
                className="absolute bottom-0 left-0 h-1 bg-indigo-600 dark:bg-indigo-500 transition-all duration-1000" 
                style={{ width: `${timerPercentage}%` }}
              />
              <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Hold expires in</span>
              </div>
              <div className="font-mono text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                {formatSeconds(remaining)}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Action panel card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40">
        {isPending ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={confirm}
              disabled={busyAction !== null}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95 disabled:pointer-events-none disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              {busyAction === "confirm" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirm Purchase
            </button>
            <button
              type="button"
              onClick={() => release(false)}
              disabled={busyAction !== null}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white disabled:pointer-events-none"
            >
              {busyAction === "release" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancel Hold
            </button>
          </div>
        ) : null}

        {isConfirmed ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200/50 bg-emerald-50/20 p-8 text-center dark:border-emerald-950/40 dark:bg-emerald-950/10">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Purchase Confirmed!
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                The hold is closed and inventory has been permanently reduced.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Return to Inventory
            </button>
          </div>
        ) : null}

        {isReleased ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200/50 bg-rose-50/20 p-8 text-center dark:border-rose-950/40 dark:bg-rose-950/10">
            <XCircle className="h-10 w-10 text-rose-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Reservation Closed
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {message ?? "This reservation has expired and stock was released back to availability."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Return to Inventory
            </button>
          </div>
        ) : null}

        {message && !isReleased && !isConfirmed ? (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 text-xs text-amber-600 dark:border-amber-950/40 dark:bg-amber-950/10 dark:text-amber-400">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
