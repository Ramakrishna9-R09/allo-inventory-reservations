const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🛠️ Starting SQLite environment configuration...");

// 1. Update prisma/schema.prisma
const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
let schemaContent = fs.readFileSync(schemaPath, "utf8");

schemaContent = schemaContent
  .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
  .replace(/\s*directUrl\s*=\s*env\("DIRECT_URL"\)/, "")
  .replace(/status\s*ReservationStatus\s*@default\(PENDING\)/, 'status         String            @default("PENDING")')
  .replace(/\s*enum\s*ReservationStatus\s*\{[\s\S]*?\}/, "");

fs.writeFileSync(schemaPath, schemaContent, "utf8");
console.log("✅ Modified prisma/schema.prisma for SQLite");

// 2. Update lib/db.ts
const dbPath = path.join(__dirname, "../lib/db.ts");
let dbContent = fs.readFileSync(dbPath, "utf8");

dbContent = dbContent.replace(
  'export { ReservationStatus } from "@prisma/client";',
  `export enum ReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  RELEASED = "RELEASED",
}`
);

fs.writeFileSync(dbPath, dbContent, "utf8");
console.log("✅ Modified lib/db.ts for SQLite");

// 3. Update prisma/seed.ts
const seedPath = path.join(__dirname, "../prisma/seed.ts");
let seedContent = fs.readFileSync(seedPath, "utf8");

seedContent = seedContent.replace(
  'import { PrismaClient, ReservationStatus } from "@prisma/client";',
  `import { PrismaClient } from "@prisma/client";
import { ReservationStatus } from "../lib/db";`
);

fs.writeFileSync(seedPath, seedContent, "utf8");
console.log("✅ Modified prisma/seed.ts for SQLite");

// 4. Create .env file
const envPath = path.join(__dirname, "../.env");
const envContent = `DATABASE_URL="file:./dev.db"
CRON_SECRET="local-cron-secret-12345"
`;
fs.writeFileSync(envPath, envContent, "utf8");
console.log("✅ Created/updated .env file");

// 5. Delete migrations folder if exists
const migrationsPath = path.join(__dirname, "../prisma/migrations");
if (fs.existsSync(migrationsPath)) {
  fs.rmSync(migrationsPath, { recursive: true, force: true });
  console.log("✅ Cleared old migrations");
}

// 6. Run Prisma DB Push
console.log("⏳ Pushing database schema...");
try {
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Database synced successfully!");
} catch (error) {
  console.error("❌ Database sync failed:", error.message);
  process.exit(1);
}

// 7. Run Prisma Seed
console.log("⏳ Seeding database...");
try {
  execSync("npx prisma db seed", { stdio: "inherit" });
  console.log("✅ Seeding completed successfully!");
} catch (error) {
  console.error("❌ Seeding failed:", error.message);
  process.exit(1);
}

console.log("🎉 SQLite configuration complete! Run 'npm run dev' to start the local server.");
