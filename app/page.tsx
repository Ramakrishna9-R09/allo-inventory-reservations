import { PackageCheck } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { getProductsWithAvailability } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProductsWithAvailability();

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="border-b border-[#d9e2e8] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded border border-[#b8d6ca] bg-[#edf8f3] px-3 py-1 text-sm font-medium text-[#17624f]">
              <PackageCheck className="h-4 w-4" />
              10 minute checkout holds
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-[#172026] sm:text-4xl">
              Allo Inventory Reservations
            </h1>
          </div>
          <div className="rounded border border-[#d9e2e8] bg-[#fbfcfd] px-4 py-3 text-sm text-[#53636f]">
            Available stock is computed as total inventory minus active holds.
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 sm:px-8 lg:grid-cols-2">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </main>
  );
}
