import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { ProductDisplayCard } from "@/shared/presentation/components/ProductDisplayCard";
import { useIncrementalReveal } from "@/shared/presentation/hooks/useIncrementalReveal";
import { useInfiniteScrollTrigger } from "@/shared/presentation/hooks/useInfiniteScrollTrigger";

export interface CatalogCategory {
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
}

export interface CatalogProduct {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
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
  readonly searchTerm: string;
  readonly isLoading: boolean;
  readonly onSearchTermChange: (value: string) => void;
  readonly onCategorySelect: (categoryId: string) => void;
  readonly onProductSelect: (productId: string) => void;
  readonly onOpenCatalogWorkspace: () => void;
}

export function ProductCatalogPanel({
  categories,
  activeCategoryId,
  products,
  searchTerm,
  isLoading,
  onSearchTermChange,
  onCategorySelect,
  onProductSelect,
  onOpenCatalogWorkspace,
}: ProductCatalogPanelProps): JSX.Element {
  const { messages } = useI18n();
  const resetKey = `${activeCategoryId}:${searchTerm.trim().toLowerCase()}:${products.length}`;
  const {
    visibleItems,
    hasMore,
    loadMore,
  } = useIncrementalReveal({
    items: products,
    initialCount: 12,
    step: 12,
    resetKey,
  });
  const {
    isObserverSupported,
    setScrollRoot,
    setSentinel,
  } = useInfiniteScrollTrigger({
    hasMore,
    isLoading: false,
    onLoadMore: loadMore,
    triggerKey: `${resetKey}:${visibleItems.length}`,
  });
  const activeCategoryLabel =
    categories.find((category) => category.id === activeCategoryId)?.label ??
    messages.sales.catalog.allProducts;
  const sectionTitle =
    activeCategoryId === "all" ? messages.sales.catalog.allProducts : activeCategoryLabel;

  return (
    <section
      ref={setScrollRoot}
      className="min-w-0 overflow-y-auto bg-[#f7f7f8] p-5 lg:h-full lg:p-8"
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="whitespace-nowrap text-[2.45rem] font-semibold tracking-tight text-slate-900">
          {messages.sales.catalog.title}
        </h1>
        <label className="flex min-h-[54px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)] lg:w-[300px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder={messages.common.placeholders.searchProducts}
            className="w-full bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
            aria-label={messages.common.placeholders.searchMenuAria}
          />
          <span className="ml-2 text-xl text-slate-400">⌕</span>
        </label>
      </header>

      <div className="mt-8 flex gap-4 overflow-x-auto pb-2">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategorySelect(category.id)}
              className={[
                "min-h-[88px] min-w-[102px] rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-transparent bg-gradient-to-b from-[#3d8cff] to-[#1768e9] text-white shadow-[0_16px_28px_rgba(24,103,233,0.35)]"
                  : "border-slate-200 bg-white text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:bg-slate-50",
              ].join(" ")}
            >
              <p className="text-2xl">{category.emoji}</p>
              <p className="mt-1 text-[1.1rem]">{category.label}</p>
            </button>
          );
        })}
      </div>

      <h2 className="mt-10 text-[2.3rem] font-semibold tracking-tight text-slate-900">
        {sectionTitle}
      </h2>

      {products.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-lg font-semibold text-slate-800">
            {messages.sales.catalog.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {messages.sales.catalog.emptyDescription}
          </p>
          <button
            type="button"
            onClick={() => {
              onOpenCatalogWorkspace();
            }}
            disabled={isLoading}
            className="mt-4 min-h-12 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white"
          >
            {isLoading ? messages.common.states.loading : messages.common.actions.openCatalog}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((product) => (
              <ProductDisplayCard
                key={product.id}
                as="button"
                onClick={() => onProductSelect(product.id)}
                disabled={!product.isAvailable}
                testId={`product-card-${product.id}`}
                media={
                  product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Product images can come from managed storage or dynamic external URLs already accepted in the catalog runtime.
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span aria-hidden className="text-[4.3rem] leading-none">
                      {product.emoji}
                    </span>
                  )
                }
                title={product.name}
                subtitle={product.subtitle}
                titleClassName="text-[1.72rem] leading-[1.05]"
                subtitleClassName="min-h-12 text-base leading-tight"
                footer={
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={[
                        "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold",
                        product.isAvailable
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700",
                      ].join(" ")}
                    >
                      <span className="size-2 rounded-full bg-current" />
                      {product.isAvailable
                        ? messages.common.availability.available
                        : messages.common.availability.unavailable}
                    </span>
                    <span className="text-[2.1rem] leading-none font-bold tracking-tight text-slate-900">
                      ${product.price.toFixed(0)}
                    </span>
                  </div>
                }
              />
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            {hasMore ? (
              <>
                <div
                  ref={setSentinel}
                  data-testid="sales-catalog-infinite-scroll-sentinel"
                  className="h-2 w-full"
                  aria-hidden
                />
                <p
                  data-testid="sales-catalog-infinite-scroll-status"
                  className="text-sm font-medium text-slate-500"
                >
                  {isObserverSupported
                    ? messages.sales.catalog.continueScrolling
                    : messages.sales.catalog.loadingMore}
                </p>
                {!isObserverSupported ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="ml-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {messages.common.actions.loadMore}
                  </button>
                ) : null}
              </>
            ) : (
              <p
                data-testid="sales-catalog-infinite-scroll-status"
                className="text-sm font-medium text-slate-500"
              >
                {messages.sales.catalog.endReached}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
