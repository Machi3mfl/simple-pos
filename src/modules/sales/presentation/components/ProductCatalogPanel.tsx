import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  readonly stock: number;
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

const alphabetLetters = Array.from({ length: 26 }, (_, index) =>
  String.fromCharCode(65 + index),
);
const categoryLabelLimit = 10;

function resolveCatalogLetter(name: string): string {
  const normalizedName = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const firstLetter = normalizedName.charAt(0);

  return /^[A-Z]$/.test(firstLetter) ? firstLetter : "#";
}

function truncateCategoryLabel(label: string): string {
  const trimmedLabel = label.trim();
  if (trimmedLabel.length <= categoryLabelLimit) {
    return trimmedLabel;
  }

  return `${trimmedLabel.slice(0, categoryLabelLimit)}...`;
}

function formatStockCount(stock: number): string {
  if (Number.isInteger(stock)) {
    return String(stock);
  }

  return stock.toFixed(2).replace(/\.?0+$/, "");
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
  const sortedProducts = useMemo(
    () =>
      [...products].sort((left, right) =>
        left.name.localeCompare(right.name, "es", {
          sensitivity: "base",
          numeric: true,
        }),
      ),
    [products],
  );
  const resetKey = `${activeCategoryId}:${searchTerm.trim().toLowerCase()}:${sortedProducts.length}`;
  const {
    visibleItems,
    hasMore,
    visibleCount,
    loadMore,
    revealCount,
  } = useIncrementalReveal({
    items: sortedProducts,
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
  const [scrollRootElement, setScrollRootElement] = useState<HTMLElement | null>(null);
  const [activeLetter, setActiveLetter] = useState<string>(alphabetLetters[0]);
  const [pendingScrollTargetId, setPendingScrollTargetId] = useState<string | null>(null);
  const [showScrollToTopButton, setShowScrollToTopButton] = useState<boolean>(false);
  const productAnchorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const letterScrollAnimationFrameRef = useRef<number | null>(null);
  const activeCategoryLabel =
    categories.find((category) => category.id === activeCategoryId)?.label ??
    messages.sales.catalog.allProducts;
  const sectionTitle =
    activeCategoryId === "all" ? messages.sales.catalog.allProducts : activeCategoryLabel;
  const availableLetters = useMemo(
    () =>
      new Set(
        sortedProducts
          .map((product) => resolveCatalogLetter(product.name))
          .filter((letter) => alphabetLetters.includes(letter)),
      ),
    [sortedProducts],
  );

  const syncActiveLetter = useCallback((): void => {
    if (visibleItems.length === 0) {
      setActiveLetter(alphabetLetters[0]);
      return;
    }

    if (!scrollRootElement) {
      setActiveLetter(resolveCatalogLetter(visibleItems[0].name));
      return;
    }

    const anchorTop = scrollRootElement.scrollTop + 32;
    let nextActiveLetter = resolveCatalogLetter(visibleItems[0].name);

    for (const product of visibleItems) {
      const anchor = productAnchorRefs.current[product.id];
      if (!anchor) {
        continue;
      }

      const topWithinScrollRoot =
        anchor.getBoundingClientRect().top -
        scrollRootElement.getBoundingClientRect().top +
        scrollRootElement.scrollTop;

      if (topWithinScrollRoot <= anchorTop) {
        nextActiveLetter = resolveCatalogLetter(product.name);
        continue;
      }

      break;
    }

    setActiveLetter((current) =>
      current === nextActiveLetter ? current : nextActiveLetter,
    );
  }, [scrollRootElement, visibleItems]);

  const handleScrollRootRef = useCallback(
    (node: HTMLElement | null): void => {
      setScrollRoot(node);
      setScrollRootElement(node);
    },
    [setScrollRoot],
  );

  const handleLetterSelect = useCallback(
    (letter: string): void => {
      const targetIndex = sortedProducts.findIndex(
        (product) => resolveCatalogLetter(product.name) === letter,
      );
      if (targetIndex === -1) {
        return;
      }

      revealCount(targetIndex + 1);
      setActiveLetter(letter);
      setPendingScrollTargetId(sortedProducts[targetIndex]?.id ?? null);
    },
    [revealCount, sortedProducts],
  );

  const handleScrollToTop = useCallback((): void => {
    if (!scrollRootElement) {
      return;
    }

    if (letterScrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(letterScrollAnimationFrameRef.current);
      letterScrollAnimationFrameRef.current = null;
    }

    setPendingScrollTargetId(null);
    scrollRootElement.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [scrollRootElement]);

  useEffect(() => {
    if (pendingScrollTargetId) {
      return;
    }

    syncActiveLetter();
  }, [pendingScrollTargetId, syncActiveLetter, visibleCount]);

  useEffect(() => {
    if (!scrollRootElement) {
      return;
    }

    const handleScroll = (): void => {
      setShowScrollToTopButton(scrollRootElement.scrollTop > 360);

      if (pendingScrollTargetId) {
        return;
      }

      syncActiveLetter();
    };

    handleScroll();
    scrollRootElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollRootElement.removeEventListener("scroll", handleScroll);
    };
  }, [pendingScrollTargetId, scrollRootElement, syncActiveLetter]);

  useEffect(() => {
    if (!pendingScrollTargetId || !scrollRootElement) {
      return;
    }

    const targetAnchor = productAnchorRefs.current[pendingScrollTargetId];
    if (!targetAnchor) {
      return;
    }

    const targetTop =
      targetAnchor.getBoundingClientRect().top -
      scrollRootElement.getBoundingClientRect().top +
      scrollRootElement.scrollTop -
      24;

    const boundedTargetTop = Math.max(0, targetTop);
    const startedAt = performance.now();

    const finishScroll = (): void => {
      if (letterScrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(letterScrollAnimationFrameRef.current);
        letterScrollAnimationFrameRef.current = null;
      }

      setPendingScrollTargetId((current) =>
        current === pendingScrollTargetId ? null : current,
      );
      syncActiveLetter();
    };

    const checkScrollCompletion = (): void => {
      if (!scrollRootElement) {
        finishScroll();
        return;
      }

      const delta = Math.abs(scrollRootElement.scrollTop - boundedTargetTop);
      if (delta <= 6 || performance.now() - startedAt >= 900) {
        finishScroll();
        return;
      }

      letterScrollAnimationFrameRef.current = requestAnimationFrame(checkScrollCompletion);
    };

    scrollRootElement.scrollTo({
      top: boundedTargetTop,
      behavior: "smooth",
    });
    letterScrollAnimationFrameRef.current = requestAnimationFrame(checkScrollCompletion);

    return () => {
      if (letterScrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(letterScrollAnimationFrameRef.current);
        letterScrollAnimationFrameRef.current = null;
      }
    };
  }, [pendingScrollTargetId, scrollRootElement, syncActiveLetter, visibleItems.length]);

  return (
    <section
      ref={handleScrollRootRef}
      data-testid="sales-catalog-scroll-root"
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

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 pr-1">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;
          const compactLabel = truncateCategoryLabel(category.label);

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategorySelect(category.id)}
              title={category.label}
              className={[
                "flex min-h-[4.5rem] w-[7.25rem] max-w-[7.25rem] flex-none flex-col items-center justify-center rounded-[1.15rem] border px-2 py-1.5 text-xs font-semibold transition",
                isActive
                  ? "border-transparent bg-gradient-to-b from-[#3d8cff] to-[#1768e9] text-white shadow-[0_8px_16px_rgba(24,103,233,0.22)]"
                  : "border-slate-200 bg-white text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.04)] hover:bg-slate-50",
              ].join(" ")}
            >
              <p className="text-[1.15rem] leading-none">{category.emoji}</p>
              <p className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[0.98rem] leading-none tracking-[-0.01em]">
                {compactLabel}
              </p>
            </button>
          );
        })}
      </div>

      <h2 className="mt-6 text-[2.3rem] font-semibold tracking-tight text-slate-900">
        {sectionTitle}
      </h2>
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 pr-1">
        {alphabetLetters.map((letter) => {
          const isActive = activeLetter === letter;
          const isAvailable = availableLetters.has(letter);

          return (
            <button
              key={letter}
              type="button"
              data-testid={`sales-catalog-letter-${letter}`}
              aria-pressed={isActive}
              disabled={!isAvailable}
              onClick={() => handleLetterSelect(letter)}
              className={[
                "flex size-10 flex-none items-center justify-center rounded-xl border text-sm font-semibold transition",
                isActive
                  ? "border-transparent bg-gradient-to-b from-[#3d8cff] to-[#1768e9] text-white shadow-[0_10px_22px_rgba(24,103,233,0.28)]"
                  : isAvailable
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-slate-200 bg-slate-100 text-slate-300",
              ].join(" ")}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {sortedProducts.length === 0 ? (
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
              <div
                key={product.id}
                ref={(node) => {
                  productAnchorRefs.current[product.id] = node;
                }}
                className="scroll-mt-6"
              >
                <ProductDisplayCard
                  as="button"
                  onClick={() => onProductSelect(product.id)}
                  disabled={!product.isAvailable}
                  testId={`product-card-${product.id}`}
                  contentClassName="min-h-[19.75rem] gap-3 px-5 pt-5 pb-2"
                  mediaClassName="h-[8.75rem] rounded-[1.55rem] bg-transparent p-0 lg:h-[9.25rem]"
                  textSectionClassName="min-h-[4rem] gap-1"
                  lowerSectionClassName="gap-1.5"
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
                  titleClassName="text-[1.32rem] leading-[1.08] [display:-webkit-box] overflow-hidden text-ellipsis [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                  subtitleClassName="text-[0.92rem] leading-tight"
                  footer={
                    <div className="flex items-end justify-between gap-3">
                      <span
                        className={[
                          "inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold",
                          product.isAvailable
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700",
                        ].join(" ")}
                      >
                        <span className="size-2 rounded-full bg-current" />
                        {product.isAvailable
                          ? `${messages.common.availability.available} ${formatStockCount(product.stock)}`
                          : messages.common.availability.unavailable}
                      </span>
                      <span className="shrink-0 text-[1.65rem] leading-[0.95] font-bold tracking-tight text-slate-900">
                        ${product.price.toFixed(0)}
                      </span>
                    </div>
                  }
                />
              </div>
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

      {showScrollToTopButton ? (
        <div className="sticky bottom-5 z-20 mt-4 flex justify-end pr-1 pointer-events-none">
          <button
            type="button"
            data-testid="sales-catalog-scroll-to-top-button"
            onClick={handleScrollToTop}
            aria-label="Volver arriba"
            title="Volver arriba"
            className="pointer-events-auto inline-flex size-12 items-center justify-center rounded-2xl border border-white/60 bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] text-white shadow-[0_14px_26px_rgba(28,109,234,0.28)] transition hover:translate-y-[-1px]"
          >
            <ArrowUp className="size-5" strokeWidth={2.8} aria-hidden />
          </button>
        </div>
      ) : null}
    </section>
  );
}
