import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { apiError, exceptionResponse } from "@/lib/errors";
import { ReservationIdSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const parsed = ReservationIdSchema.safeParse(params);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid reservation id");
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: parsed.data.id },
      include: {
        product: true,
      },
    });

    if (!reservation) {
      return apiError(404, "NOT_FOUND", "Reservation not found");
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: reservation.warehouseId },
    });

    return NextResponse.json({ reservation: { ...reservation, warehouse } });
  } catch (error) {
    return exceptionResponse(error);
  }
}
