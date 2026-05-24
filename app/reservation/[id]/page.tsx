import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  ReservationTimer,
  type CheckoutReservation,
} from "@/components/ReservationTimer";
import { prisma, ReservationStatus } from "@/lib/db";
import { ReservationIdSchema } from "@/lib/schemas";

type ReservationPageProps = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

export default async function ReservationPage({ params }: ReservationPageProps) {
  const parsed = ReservationIdSchema.safeParse(params);

  if (!parsed.success) {
    notFound();
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: parsed.data.id },
    include: {
      product: true,
    },
  });

  if (!reservation) {
    notFound();
  }

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: reservation.warehouseId },
  });

  const checkoutReservation: CheckoutReservation = {
    id: reservation.id,
    quantity: reservation.quantity,
    status: reservation.status as ReservationStatus,
    expiresAt: reservation.expiresAt.toISOString(),
    product: {
      name: reservation.product.name,
      sku: reservation.product.sku,
    },
    warehouse: warehouse
      ? {
          name: warehouse.name,
          location: warehouse.location,
        }
      : null,
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white pb-12">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory Dashboard
        </Link>
        <ReservationTimer reservation={checkoutReservation} />
      </div>
    </main>
  );
}
