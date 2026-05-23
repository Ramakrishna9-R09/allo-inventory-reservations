import { PrismaClient, ReservationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const [mumbai, delhi, bangalore] = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Mumbai Fulfillment Hub", location: "Mumbai, Maharashtra" },
    }),
    prisma.warehouse.create({
      data: { name: "Delhi Rapid Store", location: "New Delhi, Delhi" },
    }),
    prisma.warehouse.create({
      data: { name: "Bangalore Cold Chain", location: "Bangalore, Karnataka" },
    }),
  ]);

  const [starter, raceDemo, samplePack, refillBox, careBundle] =
    await Promise.all([
      prisma.product.create({
        data: {
          name: "Wellness Starter Kit",
          sku: "ALLO-WELLNESS-KIT",
          description: "A high-stock bundle for happy-path reservation demos.",
          imageUrl:
            "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80",
        },
      }),
      prisma.product.create({
        data: {
          name: "Single Unit Race Demo",
          sku: "ALLO-RACE-ONE",
          description: "Only one unit in Mumbai, ideal for testing lock conflicts.",
          imageUrl:
            "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80",
        },
      }),
      prisma.product.create({
        data: {
          name: "Clinic Sample Pack",
          sku: "ALLO-SAMPLE-PACK",
          description: "Moderate stock spread across all warehouses.",
          imageUrl:
            "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
        },
      }),
      prisma.product.create({
        data: {
          name: "Express Refill Box",
          sku: "ALLO-REFILL-BOX",
          description: "Low stock in Delhi to show insufficient stock handling.",
          imageUrl:
            "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=900&q=80",
        },
      }),
      prisma.product.create({
        data: {
          name: "Telehealth Care Bundle",
          sku: "ALLO-CARE-BUNDLE",
          description: "High-demand item with an active pre-existing hold.",
          imageUrl:
            "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=900&q=80",
        },
      }),
    ]);

  await prisma.stock.createMany({
    data: [
      { productId: starter.id, warehouseId: mumbai.id, total: 75 },
      { productId: starter.id, warehouseId: delhi.id, total: 40 },
      { productId: starter.id, warehouseId: bangalore.id, total: 35 },
      { productId: raceDemo.id, warehouseId: mumbai.id, total: 1 },
      { productId: raceDemo.id, warehouseId: delhi.id, total: 0 },
      { productId: samplePack.id, warehouseId: mumbai.id, total: 18 },
      { productId: samplePack.id, warehouseId: delhi.id, total: 12 },
      { productId: samplePack.id, warehouseId: bangalore.id, total: 14 },
      { productId: refillBox.id, warehouseId: delhi.id, total: 3 },
      { productId: refillBox.id, warehouseId: bangalore.id, total: 7 },
      { productId: careBundle.id, warehouseId: mumbai.id, total: 10, reserved: 2 },
      { productId: careBundle.id, warehouseId: bangalore.id, total: 5 },
    ],
  });

  await prisma.reservation.createMany({
    data: [
      {
        productId: careBundle.id,
        warehouseId: mumbai.id,
        quantity: 2,
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() + 8 * 60 * 1000),
        idempotencyKey: "26a62be4-7929-4060-a2be-4c7c1f9bb901",
      },
      {
        productId: samplePack.id,
        warehouseId: delhi.id,
        quantity: 1,
        status: ReservationStatus.RELEASED,
        expiresAt: new Date(Date.now() - 15 * 60 * 1000),
        releasedAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
