"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";

interface ProductListItem {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
}

interface ProductListResponse {
  readonly items: readonly ProductListItem[];
}

interface BulkPriceUpdateResultItem {
  readonly productId: string;
  readonly oldPrice: number;
  readonly newPrice: number;
}

interface BulkPriceUpdateInvalidItem {
  readonly productId: string;
  readonly reason: string;
}

interface BulkPriceUpdateResponse {
  readonly batchId: string;
  readonly updatedCount: number;
  readonly items: readonly BulkPriceUpdateResultItem[];
  readonly appliedAt: string;
  readonly previewOnly: boolean;
  readonly appliedBy: string;
  readonly invalidItems: readonly BulkPriceUpdateInvalidItem[];
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface BulkPriceUpdatePanelProps {
  readonly onPricesUpdated?: () => Promise<void> | void;
  readonly refreshToken?: number;
}

const defaultCategoryOptions = ["main", "drink", "snack", "dessert", "other"];

function resolveApiMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof (payload as ApiErrorPayload).message === "string"
  ) {
    return (payload as ApiErrorPayload).message as string;
  }

  return fallback;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function BulkPriceUpdatePanel({
  onPricesUpdated,
  refreshToken,
}: BulkPriceUpdatePanelProps): JSX.Element {
  const [products, setProducts] = useState<readonly ProductListItem[]>([]);
  const [scopeType, setScopeType] = useState<"all" | "category" | "selection">("category");
  const [categoryId, setCategoryId] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<readonly string[]>([]);
  const [mode, setMode] = useState<"percentage" | "fixed_amount">("percentage");
  const [value, setValue] = useState<string>("10");
  const [lastResult, setLastResult] = useState<BulkPriceUpdateResponse | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const productNameById = useMemo(
    () =>
      new Map<string, string>(
        products.map((product) => [product.id, product.name]),
      ),
    [products],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const categoryId of defaultCategoryOptions) {
      set.add(categoryId);
    }
    for (const product of products) {
      set.add(product.categoryId);
    }
    return Array.from(set.values());
  }, [products]);

  const scopedProducts = useMemo(() => {
    if (scopeType === "all") {
      return products;
    }

    if (scopeType === "category") {
      return products.filter((product) => product.categoryId === categoryId);
    }

    const selected = new Set(selectedProductIds);
    return products.filter((product) => selected.has(product.id));
  }, [products, scopeType, categoryId, selectedProductIds]);

  const hasValidScopeSelection = useMemo(() => {
    if (scopeType === "selection") {
      return selectedProductIds.length > 0;
    }

    if (scopeType === "category") {
      return categoryId.trim().length > 0;
    }

    return true;
  }, [scopeType, selectedProductIds, categoryId]);

  const shouldBlockByEmptyScope = hasValidScopeSelection && scopedProducts.length === 0;

  const loadProducts = useCallback(async (): Promise<void> => {
    setIsLoadingProducts(true);
    try {
      const { response, data } = await fetchJsonNoStore<ProductListResponse>(
        "/api/v1/products?activeOnly=true",
      );
      const payload = data;

      if (!response.ok || !payload) {
        throw new Error("Failed to load products for repricing.");
      }

      setProducts(payload.items);
      setCategoryId((current) => {
        const normalizedCurrent = current.trim();
        const knownCategories = new Set<string>([
          ...defaultCategoryOptions,
          ...payload.items.map((item) => item.categoryId),
        ]);

        if (normalizedCurrent.length > 0 && knownCategories.has(normalizedCurrent)) {
          return current;
        }

        return payload.items[0]?.categoryId ?? defaultCategoryOptions[0];
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts, refreshToken]);

  useEffect(() => {
    if (categories.length > 0 && (categoryId.trim().length === 0 || !categories.includes(categoryId))) {
      setCategoryId(categories[0]);
    }
  }, [categories, categoryId]);

  function toggleProductSelection(productId: string): void {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }
      return [...current, productId];
    });
  }

  function buildScope():
    | { readonly type: "all" }
    | { readonly type: "category"; readonly categoryId: string }
    | { readonly type: "selection"; readonly productIds: readonly string[] } {
    if (scopeType === "all") {
      return { type: "all" };
    }

    if (scopeType === "category") {
      return {
        type: "category",
        categoryId,
      };
    }

    return {
      type: "selection",
      productIds: selectedProductIds,
    };
  }

  async function executeRequest(previewOnly: boolean): Promise<void> {
    setFeedback(null);
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
      setIsError(true);
      setFeedback("Update value must be a valid number.");
      return;
    }

    if (scopeType === "category" && !categoryId) {
      setIsError(true);
      setFeedback("Select a category for category scope.");
      return;
    }

    if (scopeType === "selection" && selectedProductIds.length === 0) {
      setIsError(true);
      setFeedback("Select at least one product for selection scope.");
      return;
    }

    if (shouldBlockByEmptyScope) {
      setIsError(true);
      setFeedback("No products found for the selected scope. Create or select products first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/products/price-batches", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-id": "ui-admin",
        },
        body: JSON.stringify({
          scope: buildScope(),
          mode,
          value: parsedValue,
          previewOnly,
        }),
      });

      const payload = (await response.json()) as BulkPriceUpdateResponse | ApiErrorPayload;

      if (!response.ok) {
        setIsError(true);
        setFeedback(resolveApiMessage(payload, "Bulk price update failed."));
        setLastResult(null);
        return;
      }

      setLastResult(payload as BulkPriceUpdateResponse);
      setIsError(false);
      setFeedback(
        previewOnly
          ? `Preview ready: ${(payload as BulkPriceUpdateResponse).items.length} rows.`
          : `Batch applied: ${(payload as BulkPriceUpdateResponse).updatedCount} products updated.`,
      );

      if (!previewOnly) {
        await loadProducts();
        await onPricesUpdated?.();
      }
    } catch {
      setIsError(true);
      setFeedback("Bulk price update failed.");
      setLastResult(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Bulk Price Update</h2>
        <p className="mt-1 text-sm text-slate-500">
          UC-009: Preview and apply percentage/fixed updates with audit-ready output.
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Eligible products in current scope: {scopedProducts.length}
        </p>
      </header>

      {isLoadingProducts ? (
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
          Loading products and categories...
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Scope</span>
          <select
            data-testid="bulk-scope-select"
            value={scopeType}
            onChange={(event) =>
              setScopeType(event.target.value as "all" | "category" | "selection")
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            <option value="all">All products</option>
            <option value="category">By category</option>
            <option value="selection">Selected products</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Mode</span>
          <select
            data-testid="bulk-mode-select"
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "percentage" | "fixed_amount")
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed amount</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Value</span>
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
          <span className="text-xs font-semibold text-slate-600">Category</span>
          <select
            data-testid="bulk-category-select"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={scopeType !== "category"}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            data-testid="bulk-preview-button"
            type="button"
            onClick={() => {
              void executeRequest(true);
            }}
            disabled={isSubmitting || shouldBlockByEmptyScope}
            className="min-h-11 rounded-xl border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-700 disabled:border-slate-200 disabled:text-slate-400"
          >
            Preview
          </button>
          <button
            data-testid="bulk-apply-button"
            type="button"
            onClick={() => {
              void executeRequest(false);
            }}
            disabled={isSubmitting || shouldBlockByEmptyScope}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            Apply
          </button>
        </div>
      </div>

      {shouldBlockByEmptyScope ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          No products available for this scope yet. Create products in the onboarding panel or
          change scope.
        </p>
      ) : null}

      {scopeType === "selection" ? (
        <div className="mt-3 rounded-xl border border-slate-200 p-2">
          <p className="px-1 text-xs font-semibold text-slate-600">Select products</p>
          <ul className="mt-2 grid max-h-40 gap-1 overflow-y-auto md:grid-cols-2">
            {products.map((product) => (
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
                    {product.name} ({formatMoney(product.price)})
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {feedback ? (
        <p
          data-testid="bulk-feedback"
          className={[
            "mt-3 rounded-xl px-3 py-2 text-sm font-medium",
            isError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {feedback}
        </p>
      ) : null}

      {lastResult ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">Result items</p>
            </div>
            <ul className="max-h-56 space-y-1 overflow-y-auto p-2">
              {lastResult.items.map((item) => (
                <li key={item.productId} className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">
                    {productNameById.get(item.productId) ?? "Unknown product"}
                  </p>
                  <p>
                    {formatMoney(item.oldPrice)} → {formatMoney(item.newPrice)}
                  </p>
                </li>
              ))}
              {lastResult.items.length === 0 ? (
                <li className="px-2 py-2 text-xs text-slate-500">No updated items in this result.</li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">Invalid items</p>
            </div>
            <ul className="max-h-56 space-y-1 overflow-y-auto p-2">
              {lastResult.invalidItems.map((item) => (
                <li key={`${item.productId}-${item.reason}`} className="rounded-lg bg-rose-50 px-2 py-2 text-xs text-rose-700">
                  <p className="font-semibold">
                    {productNameById.get(item.productId) ?? "Unknown product"}
                  </p>
                  <p>{item.reason}</p>
                </li>
              ))}
              {lastResult.invalidItems.length === 0 ? (
                <li className="px-2 py-2 text-xs text-slate-500">No invalid items.</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </article>
  );
}
