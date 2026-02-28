"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface ProductListItem {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly stock?: number;
  readonly isActive: boolean;
}

interface ProductListResponse {
  readonly items: readonly ProductListItem[];
}

interface ProductResponse {
  readonly item: ProductListItem;
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface ProductOnboardingPanelProps {
  readonly onProductCreated?: () => Promise<void> | void;
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

export function ProductOnboardingPanel({
  onProductCreated,
}: ProductOnboardingPanelProps): JSX.Element {
  const [name, setName] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("main");
  const [price, setPrice] = useState<string>("10");
  const [cost, setCost] = useState<string>("");
  const [initialStock, setInitialStock] = useState<string>("1");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [products, setProducts] = useState<readonly ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  const categories = useMemo(() => {
    const categorySet = new Set<string>(defaultCategoryOptions);
    for (const product of products) {
      categorySet.add(product.categoryId);
    }
    return Array.from(categorySet.values());
  }, [products]);

  const loadProducts = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/products");
      const payload = (await response.json()) as ProductListResponse;

      if (!response.ok) {
        setIsError(true);
        setFeedback("Failed to load products for onboarding.");
        return;
      }

      setProducts(payload.items);
    } catch {
      setIsError(true);
      setFeedback("Failed to load products for onboarding.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);

    const parsedPrice = Number(price);
    const parsedStock = Number(initialStock);
    const parsedCost = cost.trim().length > 0 ? Number(cost) : undefined;

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setIsError(true);
      setFeedback("Price must be greater than zero.");
      return;
    }

    if (!Number.isFinite(parsedStock) || !Number.isInteger(parsedStock) || parsedStock < 0) {
      setIsError(true);
      setFeedback("Initial stock must be an integer greater than or equal to zero.");
      return;
    }

    if (parsedCost !== undefined && (!Number.isFinite(parsedCost) || parsedCost <= 0)) {
      setIsError(true);
      setFeedback("Cost must be greater than zero when provided.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          categoryId: categoryId.trim(),
          price: parsedPrice,
          cost: parsedCost,
          initialStock: parsedStock,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as ProductResponse | ApiErrorPayload;
      if (!response.ok) {
        setIsError(true);
        setFeedback(resolveApiMessage(payload, "Could not create product."));
        return;
      }

      setIsError(false);
      setFeedback(`Product created: ${(payload as ProductResponse).item.name}`);
      setName("");
      setPrice("10");
      setCost("");
      setInitialStock("1");
      setImageUrl("");
      await loadProducts();
      await onProductCreated?.();
    } catch {
      setIsError(true);
      setFeedback("Could not create product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Guided Product Onboarding
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            UC-002: Create products with minimum fields and optional image.
          </p>
        </div>
      </header>

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Name</span>
          <input
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Empanada"
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Price</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Cost (optional)</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Initial stock</span>
          <input
            type="number"
            min="0"
            step="1"
            value={initialStock}
            onChange={(event) => setInitialStock(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Image URL (optional)</span>
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            {isSubmitting ? "Creating..." : "Create product"}
          </button>
        </div>
      </form>

      {feedback ? (
        <p
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
          <p className="text-sm font-semibold text-slate-700">Recent products</p>
          <button
            type="button"
            onClick={() => {
              void loadProducts();
            }}
            disabled={isLoading}
            className="text-xs font-semibold text-blue-600 disabled:text-slate-400"
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <ul className="max-h-52 space-y-1 overflow-y-auto p-2">
          {products.slice(0, 8).map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700"
            >
              <span className="min-w-0 truncate">
                {product.name} ({product.categoryId})
              </span>
              <span className="ml-2 shrink-0 font-semibold text-slate-900">
                {formatMoney(product.price)}
              </span>
            </li>
          ))}

          {products.length === 0 && !isLoading ? (
            <li className="px-2 py-2 text-xs text-slate-500">No products yet.</li>
          ) : null}
        </ul>
      </div>
    </article>
  );
}
