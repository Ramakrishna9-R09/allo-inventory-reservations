import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma, ReservationStatus, isSQLite } from "@/lib/db";
import { ApiException, apiError, exceptionResponse } from "@/lib/errors";
import { ReservationIdSchema } from "@/lib/schemas";

type LockedReservation = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
};

type RouteContext = {
  params: {
    id: string;
  };
};

function isLockConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" &&
    typeof error.meta?.code === "string" &&
    error.meta.code === "55P03"
  );
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const parsed = ReservationIdSchema.safeParse(params);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid reservation id");
    }

    const result = await prisma.$transaction(async (tx) => {
      let current: LockedReservation | undefined;

      if (isSQLite) {
        const res = await tx.reservation.findUnique({
          where: { id: parsed.data.id },
        });
        if (res) {
          current = {
            id: res.id,
            productId: res.productId,
            warehouseId: res.warehouseId,
            quantity: res.quantity,
            status: res.status as ReservationStatus,
            expiresAt: res.expiresAt,
          };
        }
      } else {
        const rows = await tx.$queryRaw<LockedReservation[]>`
          SELECT id, "productId", "warehouseId", quantity, status, "expiresAt"
          FROM "Reservation"
          WHERE id = ${parsed.data.id}
          FOR UPDATE NOWAIT
        `;
        current = rows[0];
      }

      if (!current) {
        throw new ApiException(404, "NOT_FOUND", "Reservation not found");
      }

      if (current.status === ReservationStatus.CONFIRMED) {
        const fullReservation = await tx.reservation.findUniqueOrThrow({
          where: { id: current.id },
        });
        return { status: "confirmed" as const, reservation: fullReservation };
      }

      if (current.status !== ReservationStatus.PENDING) {
        throw new ApiException(
          409,
          "INVALID_STATE",
          "Reservation is not pending",
        );
      }

      if (current.expiresAt <= new Date()) {
        if (!isSQLite) {
          await tx.$queryRaw`
            SELECT id
            FROM "Stock"
            WHERE "productId" = ${current.productId}
              AND "warehouseId" = ${current.warehouseId}
            FOR UPDATE NOWAIT
          `;
        }

        await tx.reservation.update({
          where: { id: current.id },
          data: {
            status: ReservationStatus.RELEASED,
            releasedAt: new Date(),
          },
        });
        await tx.stock.update({
          where: {
            productId_warehouseId: {
              productId: current.productId,
              warehouseId: current.warehouseId,
            },
          },
          data: { reserved: { decrement: current.quantity } },
        });

        return { status: "expired" as const };
      }

      if (!isSQLite) {
        await tx.$queryRaw`
          SELECT id
          FROM "Stock"
          WHERE "productId" = ${current.productId}
            AND "warehouseId" = ${current.warehouseId}
          FOR UPDATE NOWAIT
        `;
      }

      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: current.productId,
            warehouseId: current.warehouseId,
          },
        },
        data: {
          total: { decrement: current.quantity },
          reserved: { decrement: current.quantity },
        },
      });

      const reservation = await tx.reservation.update({
        where: { id: current.id },
        data: {
          status: ReservationStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      return { status: "confirmed" as const, reservation };
    });

    if (result.status === "expired") {
      return apiError(410, "RESERVATION_EXPIRED", "Reservation expired");
    }

    return NextResponse.json({ reservation: result.reservation });
  } catch (error) {
    if (isLockConflict(error)) {
      return apiError(409, "LOCK_CONFLICT", "Reservation is being updated");
    }

    return exceptionResponse(error);
  }
}
