import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma, isSQLite } from "@/lib/db";
import { ApiException, apiError, exceptionResponse } from "@/lib/errors";
import { CreateReservationSchema } from "@/lib/schemas";

type LockedStock = {
  id: string;
  total: number;
  reserved: number;
};

function isLockConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" &&
    typeof error.meta?.code === "string" &&
    error.meta.code === "55P03"
  );
}

export async function POST(request: Request) {
  let idempotencyKey: string | undefined;

  try {
    const parsed = CreateReservationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid reservation payload");
    }

    const input = parsed.data;
    idempotencyKey = input.idempotencyKey;

    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        return NextResponse.json({ reservation: existing }, { status: 200 });
      }
    }

    const reservation = await prisma.$transaction(async (tx) => {
      let stock: LockedStock | undefined;

      if (isSQLite) {
        const row = await tx.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: input.productId,
              warehouseId: input.warehouseId,
            },
          },
        });
        if (row) {
          stock = {
            id: row.id,
            total: row.total,
            reserved: row.reserved,
          };
        }
      } else {
        const rows = await tx.$queryRaw<LockedStock[]>`
          SELECT id, total, reserved
          FROM "Stock"
          WHERE "productId" = ${input.productId}
            AND "warehouseId" = ${input.warehouseId}
          FOR UPDATE NOWAIT
        `;
        stock = rows[0];
      }

      if (!stock) {
        throw new ApiException(404, "NOT_FOUND", "Stock row not found");
      }

      const available = stock.total - stock.reserved;

      if (available < input.quantity) {
        throw new ApiException(
          409,
          "INSUFFICIENT_STOCK",
          "Sorry, not enough stock available",
        );
      }

      const created = await tx.reservation.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          quantity: input.quantity,
          idempotencyKey,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: input.productId,
            warehouseId: input.warehouseId,
          },
        },
        data: {
          reserved: {
            increment: input.quantity,
          },
        },
      });

      return created;
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        return NextResponse.json({ reservation: existing }, { status: 200 });
      }
    }

    if (isLockConflict(error)) {
      return apiError(
        409,
        "LOCK_CONFLICT",
        "Inventory is being reserved by another checkout. Please try again.",
      );
    }

    return exceptionResponse(error);
  }
}
