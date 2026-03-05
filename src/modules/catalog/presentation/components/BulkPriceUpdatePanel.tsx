"use client";

import { useEffect } from "react";

import { showErrorToast, showSuccessToast } from "@/hooks/use-app-toast";
import { useIncrementalReveal } from "@/shared/presentation/hooks/useIncrementalReveal";
import { useInfiniteScrollTrigger } from "@/shared/presentation/hooks/useInfiniteScrollTrigger";
import {
  type BulkPriceUpdateResponse,
  useBulkPriceUpdate,
} from "@/modules/catalog/presentation/hooks/useBulkPriceUpdate";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";

interface BulkPriceUpdatePanelProps {
  readonly onPricesUpdated?: (result: BulkPriceUpdateResponse) => Promise<void> | void;
  readonly refreshToken?: number;
  readonly variant?: "panel" | "dialog";
}

export function BulkPriceUpdatePanel({
  onPricesUpdated,
  refreshToken,
  variant = "panel",
}: BulkPriceUpdatePanelProps): JSX.Element {
  const { messages, formatCurrency, formatDateTime, labelForCategory } = useI18n();
  const {
    categories,
    categoryId,
    feedback,
    isLoadingProducts,
    isSubmitting,
    lastResult,
    mode,
    productNameById,
    products,
    preview,
    apply,
    reloadProducts,
    scopedProducts,
    scopeType,
    selectedProductIds,
    setCategoryId,
    setMode,
    setScopeType,
    setValue,
    shouldBlockByEmptyScope,
    toggleProductSelection,
    value,
  } = useBulkPriceUpdate({
    onPricesUpdated,
    refreshToken,
  });
  const selectionResetKey = products.map((product) => product.id).join(":");
  const {
    visibleItems: visibleSelectionProducts,
    hasMore: hasMoreSelectionProducts,
    loadMore: loadMoreSelectionProducts,
  } = useIncrementalReveal({
    items: products,
    initialCount: 16,
    step: 16,
    resetKey: selectionResetKey,
  });
  const {
    isObserverSupported: isBulkSelectionObserverSupported,
    setScrollRoot: setBulkSelectionScrollRoot,
    setSentinel: setBulkSelectionSentinel,
  } = useInfiniteScrollTrigger({
    enabled: scopeType === "selection",
    hasMore: hasMoreSelectionProducts,
    isLoading: false,
    onLoadMore: loadMoreSelectionProducts,
    triggerKey: `${selectionResetKey}:${visibleSelectionProducts.length}`,
  });

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const payload = {
      description: feedback.message,
      testId: "bulk-feedback",
    };

    if (feedback.type === "error") {
      showErrorToast(payload);
      return;
    }

    showSuccessToast(payload);
  }, [feedback]);

  const containerClassName =
    variant === "panel"
      ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5"
      : "space-y-4";

  return (
    <article className={containerClassName}>
      {variant === "panel" ? (
        <header>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {messages.catalog.bulkPriceUpdate.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {messages.catalog.bulkPriceUpdate.subtitle}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {messages.catalog.bulkPriceUpdate.eligibleProducts(scopedProducts.length)}
          </p>
        </header>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          {messages.catalog.bulkPriceUpdate.eligibleProducts(scopedProducts.length)}
        </p>
      )}

      {isLoadingProducts ? (
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
          {messages.catalog.bulkPriceUpdate.loadingProducts}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.common.labels.scope}
          </span>
          <select
            data-testid="bulk-scope-select"
            value={scopeType}
            onChange={(event) =>
              setScopeType(event.target.value as "all" | "category" | "selection")
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            <option value="all">{messages.catalog.bulkPriceUpdate.scopes.all}</option>
            <option value="category">{messages.catalog.bulkPriceUpdate.scopes.category}</option>
            <option value="selection">
              {messages.catalog.bulkPriceUpdate.scopes.selection}
            </option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.common.labels.mode}
          </span>
          <select
            data-testid="bulk-mode-select"
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "percentage" | "fixed_amount")
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            <option value="percentage">
              {messages.catalog.bulkPriceUpdate.modes.percentage}
            </option>
            <option value="fixed_amount">
              {messages.catalog.bulkPriceUpdate.modes.fixed_amount}
            </option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.common.labels.value}
          </span>
          <input
            data-testid="bulk-value-input"
            type="number"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.common.labels.category}
          </span>
          <select
            data-testid="bulk-category-select"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={scopeType !== "category"}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {labelForCategory(category)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            data-testid="bulk-preview-button"
            type="button"
            onClick={() => {
              void preview();
            }}
            disabled={isSubmitting || shouldBlockByEmptyScope}
            className="min-h-11 rounded-xl border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-700 disabled:border-slate-200 disabled:text-slate-400"
          >
            {messages.common.actions.preview}
          </button>
          <button
            data-testid="bulk-apply-button"
            type="button"
            onClick={() => {
              void apply();
            }}
            disabled={isSubmitting || shouldBlockByEmptyScope}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            {messages.common.actions.apply}
          </button>
        </div>
      </div>

      {shouldBlockByEmptyScope ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          {messages.catalog.bulkPriceUpdate.noProductsForScope}
        </p>
      ) : null}

      {scopeType === "selection" ? (
        <div className="mt-3 rounded-xl border border-slate-200 p-2">
          <p className="px-1 text-xs font-semibold text-slate-600">
            {messages.catalog.bulkPriceUpdate.selectProducts}
          </p>
          <ul
            ref={setBulkSelectionScrollRoot}
            className="mt-2 grid max-h-40 gap-1 overflow-y-auto md:grid-cols-2"
          >
            {visibleSelectionProducts.map((product) => (
              <li key={product.id}>
                <label
                  data-testid={`bulk-selection-item-${product.id}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700"
                >
                  <input
                    data-testid={`bulk-selection-checkbox-${product.id}`}
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                  />
                  <span className="truncate">
                    {product.name} ({formatCurrency(product.price)})
                  </span>
                </label>
              </li>
            ))}
            {hasMoreSelectionProducts ? (
              <li className="md:col-span-2">
                <div
                  ref={setBulkSelectionSentinel}
                  data-testid="bulk-selection-infinite-scroll-sentinel"
                  className="h-2 w-full"
                  aria-hidden
                />
                <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                  <span data-testid="bulk-selection-infinite-scroll-status">
                    {isBulkSelectionObserverSupported
                      ? messages.productsWorkspace.pagination.continueScrolling
                      : messages.catalog.bulkPriceUpdate.selectProducts}
                  </span>
                  {!isBulkSelectionObserverSupported ? (
                    <button
                      type="button"
                      onClick={loadMoreSelectionProducts}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700"
                    >
                      {messages.common.actions.loadMore}
                    </button>
                  ) : null}
                </div>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {lastResult ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
                {messages.catalog.bulkPriceUpdate.auditSummary.status}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {lastResult.previewOnly
                  ? messages.catalog.bulkPriceUpdate.auditSummary.preview
                  : messages.catalog.bulkPriceUpdate.auditSummary.applied}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
                {messages.catalog.bulkPriceUpdate.auditSummary.actor}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{lastResult.appliedBy}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
                {messages.catalog.bulkPriceUpdate.auditSummary.timestamp}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDateTime(lastResult.appliedAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-700">
                  {messages.catalog.bulkPriceUpdate.resultItems}
                </p>
              </div>
              <ul className="max-h-56 space-y-1 overflow-y-auto p-2">
                {lastResult.items.map((item) => (
                  <li
                    key={item.productId}
                    className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700"
                  >
                    <p className="font-semibold text-slate-900">
                      {productNameById.get(item.productId) ??
                        messages.common.fallbacks.unknownProduct}
                    </p>
                    <p>
                      {formatCurrency(item.oldPrice)} → {formatCurrency(item.newPrice)}
                    </p>
                  </li>
                ))}
                {lastResult.items.length === 0 ? (
                  <li className="px-2 py-2 text-xs text-slate-500">
                    {messages.catalog.bulkPriceUpdate.noUpdatedItems}
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-700">
                  {messages.catalog.bulkPriceUpdate.invalidItems}
                </p>
              </div>
              <ul className="max-h-56 space-y-1 overflow-y-auto p-2">
                {lastResult.invalidItems.map((item) => (
                  <li
                    key={`${item.productId}-${item.reason}`}
                    className="rounded-lg bg-rose-50 px-2 py-2 text-xs text-rose-700"
                  >
                    <p className="font-semibold">
                      {productNameById.get(item.productId) ??
                        messages.common.fallbacks.unknownProduct}
                    </p>
                    <p>{item.reason}</p>
                  </li>
                ))}
                {lastResult.invalidItems.length === 0 ? (
                  <li className="px-2 py-2 text-xs text-slate-500">
                    {messages.catalog.bulkPriceUpdate.noInvalidItems}
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {variant === "panel" ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void reloadProducts();
            }}
            className="text-xs font-semibold text-blue-600"
          >
            {messages.common.actions.refresh}
          </button>
        </div>
      ) : null}
    </article>
  );
}
