"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";

interface ProductItem {
  readonly id: string;
  readonly name: string;
}

interface ProductListResponse {
  readonly items: readonly ProductItem[];
}

interface StockMovementItem {
  readonly movementId: string;
  readonly productId: string;
  readonly movementType: "inbound" | "outbound" | "adjustment";
  readonly quantity: number;
  readonly unitCost: number;
  readonly occurredAt: string;
  readonly stockOnHandAfter: number;
  readonly weightedAverageUnitCostAfter: number;
  readonly inventoryValueAfter: number;
  readonly reason?: string;
}

interface StockMovementListResponse {
  readonly items: readonly StockMovementItem[];
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface StockMovementPanelProps {
  readonly refreshToken?: number;
}

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

export function StockMovementPanel({
  refreshToken,
}: StockMovementPanelProps): JSX.Element {
  const [products, setProducts] = useState<readonly ProductItem[]>([]);
  const [movements, setMovements] = useState<readonly StockMovementItem[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [movementType, setMovementType] = useState<"inbound" | "outbound" | "adjustment">(
    "inbound",
  );
  const [quantity, setQuantity] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<string>("1");
  const [reason, setReason] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const hasProducts = products.length > 0;
  const productNameById = useMemo(
    () =>
      new Map<string, string>(
        products.map((product) => [product.id, product.name]),
      ),
    [products],
  );

  const loadProducts = useCallback(async (): Promise<void> => {
    const { response, data } = await fetchJsonNoStore<ProductListResponse>(
      "/api/v1/products?activeOnly=true",
    );
    const payload = data;

    if (!response.ok || !payload) {
      throw new Error("Failed to load products.");
    }

    setProducts(payload.items);
    setProductId((current) => {
      if (current && payload.items.some((item) => item.id === current)) {
        return current;
      }
      return payload.items[0]?.id ?? "";
    });
  }, []);

  const loadMovementHistory = useCallback(async (): Promise<void> => {
    const { response, data } = await fetchJsonNoStore<StockMovementListResponse>(
      "/api/v1/stock-movements",
    );
    const payload = data;

    if (!response.ok || !payload) {
      throw new Error("Failed to load stock movements.");
    }

    setMovements(payload.items);
  }, []);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await Promise.all([loadProducts(), loadMovementHistory()]);
    } catch {
      setIsError(true);
      setFeedback("Could not load stock data.");
    } finally {
      setIsLoading(false);
    }
  }, [loadMovementHistory, loadProducts]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);

    const parsedQuantity = Number(quantity);
    const parsedUnitCost = Number(unitCost);

    if (!productId) {
      setIsError(true);
      setFeedback("Select a product first.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setIsError(true);
      setFeedback("Quantity must be greater than zero.");
      return;
    }

    if (
      movementType === "inbound" &&
      (!Number.isFinite(parsedUnitCost) || parsedUnitCost <= 0)
    ) {
      setIsError(true);
      setFeedback("Inbound movement requires unit cost greater than zero.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/stock-movements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          productId,
          movementType,
          quantity: parsedQuantity,
          unitCost: movementType === "inbound" ? parsedUnitCost : undefined,
          reason: reason.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as StockMovementItem | ApiErrorPayload;
      if (!response.ok) {
        setIsError(true);
        setFeedback(resolveApiMessage(payload, "Could not register stock movement."));
        return;
      }

      setIsError(false);
      setFeedback(`Stock movement registered: ${(payload as StockMovementItem).movementType}.`);
      setQuantity("1");
      setReason("");
      await loadMovementHistory();
    } catch {
      setIsError(true);
      setFeedback("Could not register stock movement.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Stock Movement</h2>
        <p className="mt-1 text-sm text-slate-500">
          UC-003: Register inbound/outbound/adjustment with mandatory inbound cost.
        </p>
      </header>

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Product</span>
          <select
            data-testid="inventory-product-select"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={isLoading || !hasProducts}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            {!hasProducts ? <option value="">No products available</option> : null}
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Movement type</span>
          <select
            data-testid="inventory-movement-type-select"
            value={movementType}
            onChange={(event) =>
              setMovementType(event.target.value as "inbound" | "outbound" | "adjustment")
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Quantity</span>
          <input
            data-testid="inventory-quantity-input"
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Unit cost</span>
          <input
            data-testid="inventory-unit-cost-input"
            type="number"
            min="0.01"
            step="0.01"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            disabled={movementType !== "inbound"}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Reason (optional)</span>
          <input
            data-testid="inventory-reason-input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <div className="md:col-span-2">
          <button
            data-testid="inventory-submit-button"
            type="submit"
            disabled={isSubmitting || isLoading || !hasProducts}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            {isSubmitting ? "Saving..." : "Register movement"}
          </button>
        </div>
      </form>

      {!isLoading && !hasProducts ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          No products available yet. Create products from Catalog first, then come back.
        </p>
      ) : null}

      {feedback ? (
        <p
          data-testid="inventory-feedback"
          className={[
            "mt-3 rounded-xl px-3 py-2 text-sm font-medium",
            isError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {feedback}
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-700">Recent stock movements</p>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              void loadData();
            }}
            className="text-xs font-semibold text-blue-600 disabled:text-slate-400"
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <ul className="max-h-52 space-y-1 overflow-y-auto p-2">
          {movements.slice(0, 8).map((movement) => (
            <li
              key={movement.movementId}
              data-testid={`inventory-history-item-${movement.movementId}`}
              className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700"
            >
              <p className="font-semibold text-slate-900">
                {movement.movementType} • qty {movement.quantity} • stock {movement.stockOnHandAfter}
              </p>
              <p className="mt-1">
                Product {productNameById.get(movement.productId) ?? "Unknown product"} • cost{" "}
                {movement.unitCost.toFixed(2)}
              </p>
            </li>
          ))}

          {movements.length === 0 ? (
            <li className="px-2 py-2 text-xs text-slate-500">No movement events yet.</li>
          ) : null}
        </ul>
      </div>
    </article>
  );
}
