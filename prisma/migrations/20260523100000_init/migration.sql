CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RELEASED');

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Stock_productId_warehouseId_key" ON "Stock"("productId", "warehouseId");
CREATE UNIQUE INDEX "Reservation_idempotencyKey_key" ON "Reservation"("idempotencyKey");
CREATE INDEX "Reservation_status_expiresAt_idx" ON "Reservation"("status", "expiresAt");
CREATE INDEX "Reservation_productId_warehouseId_idx" ON "Reservation"("productId", "warehouseId");

ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
