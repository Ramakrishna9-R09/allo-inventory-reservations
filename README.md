# Allo Inventory Reservations

A Next.js 14 App Router take-home implementation for a concurrency-safe inventory reservation flow. When a shopper enters checkout, the app holds stock for 10 minutes. A confirmed purchase consumes inventory; a cancelled or expired hold releases it back to availability.

## Stack

- Next.js 14 App Router, React Server Components, TypeScript strict mode
- Prisma 5 with Supabase Postgres
- PostgreSQL row-level locks with `SELECT ... FOR UPDATE NOWAIT`
- Zod shared request validation
- Vercel Cron for periodic expiry cleanup

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the Supabase pooled connection string for serverless runtime.
3. Set `DIRECT_URL` to the direct Supabase connection string for migrations.
4. Run:

```bash
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

The app runs at `http://localhost:3000`.

## How The Race Condition Is Solved

The reservation endpoint uses a database transaction and locks the exact stock row with:

```sql
SELECT id, total, reserved
FROM "Stock"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE NOWAIT
```

That lock means only one checkout can inspect and mutate a product/warehouse stock row at a time. `NOWAIT` makes the endpoint fail fast with `409` if another transaction already owns the lock, instead of letting requests queue until users see slow or stale checkout behavior.

Inside the same transaction, the app computes `available = total - reserved`, creates the reservation, and increments `reserved`. If the available stock is too low, the whole transaction rolls back and returns `409`.

On confirm, the held units leave inventory, so both `total` and `reserved` are decremented. On release or expiry, only `reserved` is decremented because the units become sellable again.

## Expiry Mechanism

The primary expiry path is lazy cleanup on reads. `GET /api/products` runs a set-based SQL update that marks expired pending reservations as `RELEASED` and subtracts their grouped quantities from matching `Stock.reserved` rows.

There is also a Vercel Cron route at `/api/cron/expire`, scheduled every five minutes in `vercel.json`. Lazy cleanup keeps the user-facing product listing correct even if cron is delayed; cron keeps old holds from lingering when traffic is quiet.

## Idempotency

`POST /api/reservations` accepts an optional `idempotencyKey`. The endpoint checks for an existing reservation with that key before it takes a stock lock or writes anything. If a network retry submits the same key again, the cached reservation is returned instead of reserving more units.

The database also enforces `Reservation.idempotencyKey` as unique, so a concurrent duplicate request is caught safely. If that unique constraint fires, the route looks up and returns the already-created reservation.

## API Routes

- `GET /api/products`: returns products with per-warehouse `availableStock`.
- `GET /api/warehouses`: returns warehouses.
- `POST /api/reservations`: creates a 10-minute hold with row-level locking.
- `GET /api/reservations/[id]`: returns checkout details for a reservation.
- `POST /api/reservations/[id]/confirm`: confirms a pending, unexpired hold.
- `POST /api/reservations/[id]/release`: releases a pending hold.
- `GET /api/cron/expire`: expires old holds; protect with `CRON_SECRET`.

## Seed Data

`prisma/seed.ts` creates:

- Warehouses in Mumbai, Delhi, and Bangalore
- Five products with mixed stock levels
- A one-unit product for race-condition testing
- A pending reservation and a released historical reservation

## Deployment

- Deploy the app to Vercel.
- Use Supabase Postgres for the database.
- Set `DATABASE_URL`, `DIRECT_URL`, and `CRON_SECRET` in Vercel.
- Keep the pooled Supabase URL in `DATABASE_URL` for serverless functions, and the direct URL in `DIRECT_URL` for migrations.

## Trade-Offs

With more time, I would add websocket-driven stock updates, an audit/event table for every reservation state transition, integration tests that open two concurrent transactions against a real Postgres database, and observability around lock conflicts and expiry volume. Redis is useful for broader workflow coordination, but the inventory correctness boundary belongs in Postgres because the stock row is the source of truth.
