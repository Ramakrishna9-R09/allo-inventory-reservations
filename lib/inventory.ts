import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

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
    )
    UPDATE "Stock" AS stock
    SET reserved = GREATEST(0, stock.reserved - totals.quantity)
    FROM totals
    WHERE stock."productId" = totals."productId"
      AND stock."warehouseId" = totals."warehouseId"
  `;
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
