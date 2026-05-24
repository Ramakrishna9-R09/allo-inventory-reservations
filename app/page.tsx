import { Header } from "@/components/Header";
import { ConcurrencyLabContainer } from "@/components/ConcurrencyLabContainer";
import { getProductsWithAvailability } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProductsWithAvailability();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white pb-12">
      <Header />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <ConcurrencyLabContainer products={products} />
      </div>
    </main>
  );
}
