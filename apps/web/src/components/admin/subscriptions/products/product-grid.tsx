import type { ProductWithMetrics } from "@/lib/admin/subscriptions/products/live";
import { ProductCard, NewProductCard } from "./product-card";

/**
 * Horizontal pricing-card grid. Mobile-first responsive grid: stacks
 * vertically on small screens, slides into 2 columns at sm, into 4
 * at lg. The "+ New product" card is always the last cell.
 */
export function ProductGrid({
  products,
  newHref,
  hrefForProduct,
}: {
  products: ProductWithMetrics[];
  newHref: string;
  hrefForProduct: (id: string) => string;
}) {
  return (
    <section>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
            Catalogue
          </p>
          <h2 className="font-headline text-xl font-extrabold tracking-tight text-forest-900">
            Products
          </h2>
        </div>
        <p className="font-mono text-[10.5px] text-slate-500">
          {products.length} {products.length === 1 ? "product" : "products"} · operator-managed catalogue
        </p>
      </header>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} editHref={hrefForProduct(p.id)} />
        ))}
        <NewProductCard href={newHref} />
      </div>
    </section>
  );
}
