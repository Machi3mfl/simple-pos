export interface CatalogCategory {
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
}

export interface CatalogProduct {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly price: number;
  readonly isAvailable: boolean;
  readonly emoji: string;
  readonly imageUrl?: string;
}

interface ProductCatalogPanelProps {
  readonly categories: readonly CatalogCategory[];
  readonly activeCategoryId: string;
  readonly products: readonly CatalogProduct[];
}

export function ProductCatalogPanel({
  categories,
  activeCategoryId,
  products,
}: ProductCatalogPanelProps): JSX.Element {
  return (
    <section className="rounded-[2rem] bg-white/95 p-5 shadow-xl shadow-slate-300/30 lg:h-full lg:p-7">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Choose Categories
        </h1>
        <label className="flex min-h-12 w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 lg:w-80">
          <span className="text-sm text-slate-500">Search menu</span>
        </label>
      </header>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <button
              key={category.id}
              type="button"
              className={[
                "min-h-16 min-w-24 rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-transparent bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <p className="text-xl">{category.emoji}</p>
              <p className="mt-1">{category.label}</p>
            </button>
          );
        })}
      </div>

      <h2 className="mt-8 text-2xl font-semibold text-slate-900">Main Course</h2>

      {products.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-lg font-semibold text-slate-800">No products yet</p>
          <p className="mt-2 text-sm text-slate-600">
            Add products from onboarding to fill this catalog.
          </p>
          <button
            type="button"
            className="mt-4 min-h-12 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white"
          >
            Open onboarding
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className="min-h-64 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-lg shadow-slate-200/40 transition hover:-translate-y-0.5"
            >
              <div className="mx-auto flex size-28 items-center justify-center rounded-full bg-slate-100 text-5xl">
                {product.imageUrl ? (
                  <span
                    role="img"
                    aria-label={product.name}
                    className="size-full rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${product.imageUrl})` }}
                  />
                ) : (
                  <span aria-hidden>{product.emoji}</span>
                )}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">{product.name}</h3>
              <p className="mt-1 min-h-10 text-sm leading-tight text-slate-500">
                {product.subtitle}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold",
                    product.isAvailable
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700",
                  ].join(" ")}
                >
                  <span className="size-2 rounded-full bg-current" />
                  {product.isAvailable ? "Available" : "Not available"}
                </span>
                <span className="text-3xl font-bold text-slate-900">
                  ${product.price.toFixed(0)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
