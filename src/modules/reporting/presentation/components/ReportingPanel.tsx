"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface SalesHistoryItem {
  readonly saleId: string;
  readonly paymentMethod: "cash" | "on_account";
  readonly customerId?: string;
  readonly total: number;
  readonly itemCount: number;
  readonly createdAt: string;
}

interface SalesHistoryResponse {
  readonly items: readonly SalesHistoryItem[];
}

interface TopProductItem {
  readonly productId: string;
  readonly name: string;
  readonly quantitySold: number;
  readonly revenue: number;
}

interface TopProductsResponse {
  readonly items: readonly TopProductItem[];
}

interface ProfitSummary {
  readonly revenue: number;
  readonly cost: number;
  readonly profit: number;
}

interface ApiErrorPayload {
  readonly message?: string;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
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

export function ReportingPanel(): JSX.Element {
  const [periodStart, setPeriodStart] = useState<string>(() =>
    toDateInputValue(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)),
  );
  const [periodEnd, setPeriodEnd] = useState<string>(() => toDateInputValue(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<"all" | "cash" | "on_account">("all");

  const [salesHistory, setSalesHistory] = useState<readonly SalesHistoryItem[]>([]);
  const [topProducts, setTopProducts] = useState<readonly TopProductItem[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (periodStart) {
      searchParams.set("periodStart", periodStart);
    }
    if (periodEnd) {
      searchParams.set("periodEnd", periodEnd);
    }
    if (paymentMethod !== "all") {
      searchParams.set("paymentMethod", paymentMethod);
    }
    return searchParams.toString();
  }, [paymentMethod, periodEnd, periodStart]);

  const loadReports = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const [salesResponse, topProductsResponse, profitSummaryResponse] = await Promise.all([
        fetch(`/api/v1/reports/sales-history?${queryString}`),
        fetch(`/api/v1/reports/top-products?${queryString}`),
        fetch(`/api/v1/reports/profit-summary?${queryString}`),
      ]);

      const [salesPayload, topPayload, profitPayload] = (await Promise.all([
        salesResponse.json(),
        topProductsResponse.json(),
        profitSummaryResponse.json(),
      ])) as [SalesHistoryResponse | ApiErrorPayload, TopProductsResponse | ApiErrorPayload, ProfitSummary | ApiErrorPayload];

      if (!salesResponse.ok) {
        throw new Error(resolveApiMessage(salesPayload, "Could not load sales history."));
      }
      if (!topProductsResponse.ok) {
        throw new Error(resolveApiMessage(topPayload, "Could not load top products."));
      }
      if (!profitSummaryResponse.ok) {
        throw new Error(resolveApiMessage(profitPayload, "Could not load profit summary."));
      }

      setSalesHistory((salesPayload as SalesHistoryResponse).items);
      setTopProducts((topPayload as TopProductsResponse).items);
      setProfitSummary(profitPayload as ProfitSummary);
      setIsError(false);
    } catch (error: unknown) {
      setIsError(true);
      setFeedback(error instanceof Error ? error.message : "Could not load reporting data.");
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function handleFilterSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (periodStart && periodEnd && periodStart > periodEnd) {
      setIsError(true);
      setFeedback("periodStart must be earlier than or equal to periodEnd.");
      return;
    }

    await loadReports();
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Sales History and Analytics
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          UC-004: Explore sales history, top products, and profit summary.
        </p>
      </header>

      <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleFilterSubmit}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Period start</span>
          <input
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Period end</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Payment method</span>
          <select
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as "all" | "cash" | "on_account")
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            <option value="all">All</option>
            <option value="cash">Cash</option>
            <option value="on_account">On account</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isLoading}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            {isLoading ? "Loading..." : "Apply filters"}
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

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">Revenue</p>
          <p className="text-lg font-semibold text-slate-900">
            {profitSummary ? formatMoney(profitSummary.revenue) : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">Cost</p>
          <p className="text-lg font-semibold text-slate-900">
            {profitSummary ? formatMoney(profitSummary.cost) : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">Profit</p>
          <p className="text-lg font-semibold text-slate-900">
            {profitSummary ? formatMoney(profitSummary.profit) : "-"}
          </p>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-700">Sales history</p>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto p-2">
            {salesHistory.map((sale) => (
              <li key={sale.saleId} className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  {sale.paymentMethod} • {formatMoney(sale.total)} • {sale.itemCount} items
                </p>
                <p className="mt-1">
                  Sale {sale.saleId.slice(0, 8)}
                  {sale.customerId ? ` • Customer ${sale.customerId.slice(0, 8)}` : ""}
                </p>
              </li>
            ))}
            {salesHistory.length === 0 ? (
              <li className="px-2 py-2 text-xs text-slate-500">No sales in selected range.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-700">Top products</p>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto p-2">
            {topProducts.map((item) => (
              <li key={item.productId} className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  {item.name} • qty {item.quantitySold}
                </p>
                <p className="mt-1">Revenue {formatMoney(item.revenue)}</p>
              </li>
            ))}
            {topProducts.length === 0 ? (
              <li className="px-2 py-2 text-xs text-slate-500">No top-product data yet.</li>
            ) : null}
          </ul>
        </div>
      </section>
    </article>
  );
}
