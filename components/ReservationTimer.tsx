"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";

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
    setMessage("Reservation expired. Held inventory was released.");
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
      setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
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

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-[#d9e2e8] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase text-[#6a7a86]">
              {reservation.product.sku}
            </div>
            <h1 className="mt-1 text-3xl font-semibold text-[#172026]">
              {reservation.product.name}
            </h1>
            <p className="mt-2 text-sm text-[#53636f]">
              {reservation.quantity} unit
              {reservation.quantity === 1 ? "" : "s"} held at{" "}
              {reservation.warehouse?.name ?? "unknown warehouse"}.
            </p>
          </div>

          <div className="rounded border border-[#c8d4dc] bg-[#fbfcfd] px-5 py-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-2 text-sm font-medium text-[#53636f]">
              <Clock3 className="h-4 w-4" />
              Hold expires in
            </div>
            <div className="font-mono text-4xl font-semibold text-[#172026]">
              {formatSeconds(remaining)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#d9e2e8] bg-white p-6 shadow-sm">
        {isPending ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={confirm}
              disabled={busyAction !== null}
              className="inline-flex h-11 items-center justify-center gap-2 rounded bg-[#17624f] px-5 text-sm font-semibold text-white hover:bg-[#124d3f] disabled:cursor-not-allowed disabled:bg-[#9aa9b2]"
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded border border-[#c8d4dc] bg-white px-5 text-sm font-semibold text-[#172026] hover:bg-[#f2f6f8] disabled:cursor-not-allowed disabled:text-[#9aa9b2]"
            >
              {busyAction === "release" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancel
            </button>
          </div>
        ) : null}

        {isConfirmed ? (
          <div className="rounded border border-[#b8d6ca] bg-[#edf8f3] px-4 py-3 text-sm font-medium text-[#17624f]">
            Purchase confirmed. The hold is closed and stock has been reduced.
          </div>
        ) : null}

        {isReleased ? (
          <div className="rounded border border-[#efc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-medium text-[#9a2a2a]">
            {message ?? "This reservation has expired."}
          </div>
        ) : null}

        {message && !isReleased ? (
          <div className="mt-4 rounded border border-[#f0d49b] bg-[#fff7e6] px-4 py-3 text-sm font-medium text-[#815b12]">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
