# Allo Inventory Reservations

A Next.js 14 App Router take-home implementation for a concurrency-safe inventory reservation flow. When a shopper enters checkout, the app holds stock for 10 minutes. A confirmed purchase consumes inventory; a cancelled or expired hold releases it back to availability.

This project features a high-fidelity **Developer Dashboard** supporting both **Light/Dark Mode** and an interactive **Concurrency Lab** to simulate split-second checkout races directly in the browser!

---

## 🚀 Local Setup (Zero-Setup SQLite or Hosted PostgreSQL)

To make review as seamless as possible, this project supports both production-ready PostgreSQL and zero-setup local SQLite.

### Option A: Zero-Setup SQLite (Recommended for Local Dev)
Run the following single command to automatically configure SQLite, wipe old PostgreSQL migrations, create the database, run migrations, seed, and start:
```bash
npm install
npm run use-sqlite
npm run dev
```

### Option B: Hosted PostgreSQL Setup (Production Default)
1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the pooled connection string (e.g. Supabase, Neon) for serverless runtime.
3. Set `DIRECT_URL` to the direct connection string for running migrations.
4. Run:
```bash
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

The app will start at `http://localhost:3000` (exposing network access at `http://0.0.0.0:3000`).

---

## 🔒 Concurrency Isolation Mechanics

The core feature of this system is race-condition-free inventory allocation. Under extreme traffic (e.g., when thousands of checkout requests hit the server for the last unit of a product), double-booking is prevented using PostgreSQL transaction locks:

```sql
SELECT id, total, reserved
FROM "Stock"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE NOWAIT
```

### How the locks work:
1. **Row-Level Write Locks**: The `SELECT ... FOR UPDATE` statement locks the exact `Stock` row for the requested product/warehouse. Only one checkout transaction can read or write that stock row at a time.
2. **Fail Fast with NOWAIT**: The `NOWAIT` flag ensures that subsequent concurrent requests for the locked row fail immediately with a `409 LOCK_CONFLICT` error. This prevents requests from piling up and causing slow checkout behavior for users who will ultimately fail to book stock.
3. **Transaction Isolated Calculations**: Inside the same transaction, available stock is computed as `total - reserved`. If the available stock is less than the requested quantity, the transaction rolls back and returns a `409 INSUFFICIENT_STOCK` error. Otherwise, the reservation is created and `reserved` stock is incremented.
4. **SQLite Serialization Fallback**: In SQLite, database-wide write locks serialize all write transactions natively, ensuring that standard Prisma client operations are 100% race-condition-free without Postgres-specific raw SQL.

---

## 🔄 Idempotency Protections (Bonus)

To handle network retries gracefully and prevent duplicate holds/charges:
- `POST /api/reservations` enforces a unique index on `Reservation.idempotencyKey`. If a client retries a request before the lock is released or after it's committed, the server detects the key collision, bypasses allocation side effects, and returns the already-created reservation with status `200`.
- **Race Condition Handling**: Checked inside the transaction `catch` block to ensure that if a concurrent retry hits the lock during an ongoing allocation, it resolves with the newly created reservation rather than returning a false-positive `409` conflict.
- `POST /api/reservations/:id/confirm` is fully idempotent. If a client retries a confirm request (e.g., due to a payment web-hook delay), it returns status `200` with the confirmed record instead of throwing a `409 INVALID_STATE`.

---

## ⏳ Expiry Cleanup Mechanism

To release unconfirmed holds and reclaim reserved stock:
1. **Lazy Cleanup on Read**: The `GET /api/products` route and dashboard requests invoke `expirePendingReservations()` before queries run. This executes a set-based transaction that moves expired pending reservations to `RELEASED` and returns stock to availability. This guarantees that stock listings shown to users are always correct and up to date, even if background tasks are delayed.
2. **Postgres Deadlock Prevention**: Batch cleanups can deadlock if multiple concurrent cleanups try to update stock rows in different orders. We prevent this by joining the expired reservations with the `Stock` table, sorting the target rows deterministically by `productId` and `warehouseId`, and locking them via `FOR UPDATE` before applying subtractions.
3. **Vercel Cron**: A route at `/api/cron/expire` (protected by a `CRON_SECRET` bearer check) is configured in `vercel.json` to trigger every 5 minutes in production to clean up stale holds when traffic is low.

---

## 📐 Trade-Offs & Senior Architecture Design

1. **Prisma Raw SQL**: Using `$queryRaw` bypasses Prisma's standard compiler checks but is necessary because Prisma does not natively support Postgres-specific SQL dialects like `FOR UPDATE NOWAIT`. To mitigate risk, variables are bound using parameterized template strings to prevent SQL injection.
2. **Read Performance**: Performing lazy cleanup on read introduces a slight database write load to list routes. However, this is wrapped in a quick transaction and only writes if there are actual expired holds, which guarantees stock accuracy on read without expensive background pollers.
3. **Optimistic Locking Alternative**: Row-level locking serializes checkout attempts per product. For high-stock items (e.g., 10,000 available), this creates an artificial bottleneck where users checkout one-by-one. In a real-world high-volume platform, we could use optimistic version locking or an in-memory Redis allocation queue, separating the checkout reservation engine from the primary PostgreSQL transaction database.
