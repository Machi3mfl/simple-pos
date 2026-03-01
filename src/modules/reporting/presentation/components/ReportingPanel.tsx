"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";

interface SalesHistoryItem {
  readonly saleId: string;
  readonly paymentMethod: "cash" | "on_account";
  readonly customerId?: string;
  readonly customerName?: string;
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
  const {
    messages,
    formatCurrency,
    formatDateTime,
    labelForPaymentMethod,
  } = useI18n();
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
        throw new Error(resolveApiMessage(salesPayload, messages.reporting.loadSalesError));
      }
      if (!topProductsResponse.ok) {
        throw new Error(
          resolveApiMessage(topPayload, messages.reporting.loadTopProductsError),
        );
      }
      if (!profitSummaryResponse.ok) {
        throw new Error(resolveApiMessage(profitPayload, messages.reporting.loadProfitError));
      }

      setSalesHistory((salesPayload as SalesHistoryResponse).items);
      setTopProducts((topPayload as TopProductsResponse).items);
      setProfitSummary(profitPayload as ProfitSummary);
      setIsError(false);
    } catch (error: unknown) {
      setIsError(true);
      setFeedback(
        error instanceof Error ? error.message : messages.reporting.loadReportingError,
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    messages.reporting.loadProfitError,
    messages.reporting.loadReportingError,
    messages.reporting.loadSalesError,
    messages.reporting.loadTopProductsError,
    queryString,
  ]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function handleFilterSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (periodStart && periodEnd && periodStart > periodEnd) {
      setIsError(true);
      setFeedback(messages.reporting.invalidPeriodRange);
      return;
    }

    await loadReports();
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {messages.reporting.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {messages.reporting.subtitle}
        </p>
      </header>

      <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleFilterSubmit}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.common.labels.periodStart}
          </span>
          <input
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.common.labels.periodEnd}
          </span>
          <input
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.common.labels.paymentMethod}
          </span>
          <select
            data-testid="reporting-payment-method-select"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as "all" | "cash" | "on_account")
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            <option value="all">{messages.common.paymentMethods.all}</option>
            <option value="cash">{messages.common.paymentMethods.cash}</option>
            <option value="on_account">{messages.common.paymentMethods.on_account}</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            data-testid="reporting-apply-filters-button"
            type="submit"
            disabled={isLoading}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            {isLoading ? messages.common.states.loading : messages.common.actions.applyFilters}
          </button>
        </div>
      </form>

      {feedback ? (
        <p
          data-testid="reporting-feedback"
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
          <p className="text-xs font-semibold text-slate-500">
            {messages.common.labels.revenue}
          </p>
          <p data-testid="reporting-revenue-value" className="text-lg font-semibold text-slate-900">
            {profitSummary ? formatCurrency(profitSummary.revenue) : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">
            {messages.common.labels.cost}
          </p>
          <p data-testid="reporting-cost-value" className="text-lg font-semibold text-slate-900">
            {profitSummary ? formatCurrency(profitSummary.cost) : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">
            {messages.common.labels.profit}
          </p>
          <p data-testid="reporting-profit-value" className="text-lg font-semibold text-slate-900">
            {profitSummary ? formatCurrency(profitSummary.profit) : "-"}
          </p>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-700">
              {messages.reporting.salesHistory}
            </p>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto p-2">
            {salesHistory.map((sale) => (
              <li
                key={sale.saleId}
                data-testid={`reporting-sales-item-${sale.saleId}`}
                className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700"
              >
                <p className="font-semibold text-slate-900">
                  {labelForPaymentMethod(sale.paymentMethod)} • {formatCurrency(sale.total)} •{" "}
                  {sale.itemCount} {messages.common.labels.items.toLowerCase()}
                </p>
                <p className="mt-1">
                  {formatDateTime(sale.createdAt)}
                  {sale.customerName
                    ? ` • ${messages.reporting.customerLabel(sale.customerName)}`
                    : ""}
                </p>
              </li>
            ))}
            {salesHistory.length === 0 ? (
              <li className="px-2 py-2 text-xs text-slate-500">
                {messages.reporting.noSalesInRange}
              </li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-700">
              {messages.reporting.topProducts}
            </p>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto p-2">
            {topProducts.map((item) => (
              <li
                key={item.productId}
                data-testid={`reporting-top-product-item-${item.productId}`}
                className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700"
              >
                <p className="font-semibold text-slate-900">
                  {item.name} • {messages.reporting.quantitySold(item.quantitySold)}
                </p>
                <p className="mt-1">
                  {messages.reporting.revenueLabel(formatCurrency(item.revenue))}
                </p>
              </li>
            ))}
            {topProducts.length === 0 ? (
              <li className="px-2 py-2 text-xs text-slate-500">
                {messages.reporting.noTopProducts}
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </article>
  );
}
