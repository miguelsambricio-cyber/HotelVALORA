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
      {/* Mobile-first: horizontal swipeable carousel below sm,
          grid from sm upward. snap-x for a smooth touch experience. */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="w-[85%] shrink-0 snap-start sm:w-auto sm:shrink">
              <ProductCard product={p} editHref={hrefForProduct(p.id)} />
            </div>
          ))}
          <div className="w-[85%] shrink-0 snap-start sm:w-auto sm:shrink">
            <NewProductCard href={newHref} />
          </div>
        </div>
      </div>
    </section>
  );
}
