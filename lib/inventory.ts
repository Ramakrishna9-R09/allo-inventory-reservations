import { Prisma } from "@prisma/client";

import { prisma, isSQLite } from "@/lib/db";

export type ProductWithAvailability = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  imageUrl: string | null;
  warehouses: {
    id: string;
    name: string;
    location: string;
    total: number;
    reserved: number;
    availableStock: number;
  }[];
};

export async function expirePendingReservations(
  client: Prisma.TransactionClient = prisma,
) {
  if (isSQLite) {
    const expired = await client.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (expired.length === 0) {
      return;
    }

    // Group quantities by product/warehouse
    const totals: Record<string, number> = {};
    for (const res of expired) {
      const key = `${res.productId}_${res.warehouseId}`;
      totals[key] = (totals[key] || 0) + res.quantity;
    }

    // Mark as RELEASED
    await client.reservation.updateMany({
      where: {
        id: {
          in: expired.map((r) => r.id),
        },
      },
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });

    // Update Stock reserved values
    for (const [key, quantity] of Object.entries(totals)) {
      const [productId, warehouseId] = key.split("_");
      
      const stock = await client.stock.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });

      if (stock) {
        await client.stock.update({
          where: {
            id: stock.id,
          },
          data: {
            reserved: Math.max(0, stock.reserved - quantity),
          },
        });
      }
    }
  } else {
    await client.$executeRaw`
      WITH expired AS (
        UPDATE "Reservation"
        SET status = 'RELEASED'::"ReservationStatus", "releasedAt" = NOW()
        WHERE status = 'PENDING'::"ReservationStatus"
          AND "expiresAt" < NOW()
        RETURNING "productId", "warehouseId", quantity
      ),
      totals AS (
        SELECT "productId", "warehouseId", SUM(quantity)::int AS quantity
        FROM expired
        GROUP BY "productId", "warehouseId"
      ),
      locked_stock AS (
        SELECT s.id
        FROM "Stock" s
        JOIN totals t ON s."productId" = t."productId" AND s."warehouseId" = t."warehouseId"
        ORDER BY s."productId", s."warehouseId"
        FOR UPDATE
      )
      UPDATE "Stock" AS stock
      SET reserved = GREATEST(0, stock.reserved - totals.quantity)
      FROM totals
      WHERE stock."productId" = totals."productId"
        AND stock."warehouseId" = totals."warehouseId"
        AND stock.id IN (SELECT id FROM locked_stock)
    `;
  }
}

export async function getProductsWithAvailability(): Promise<
  ProductWithAvailability[]
> {
  await expirePendingReservations();

  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: {
          warehouse: true,
        },
        orderBy: {
          warehouse: {
            name: "asc",
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    imageUrl: product.imageUrl,
    warehouses: product.stocks.map((stock) => ({
      id: stock.warehouse.id,
      name: stock.warehouse.name,
      location: stock.warehouse.location,
      total: stock.total,
      reserved: stock.reserved,
      availableStock: Math.max(0, stock.total - stock.reserved),
    })),
  }));
}
