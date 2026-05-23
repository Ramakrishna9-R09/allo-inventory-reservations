import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  ReservationTimer,
  type CheckoutReservation,
} from "@/components/ReservationTimer";
import { prisma } from "@/lib/db";
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
    status: reservation.status,
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
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#17624f]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>
        <ReservationTimer reservation={checkoutReservation} />
      </div>
    </main>
  );
}
