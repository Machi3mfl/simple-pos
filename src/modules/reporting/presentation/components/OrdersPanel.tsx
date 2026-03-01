"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";

interface SalesHistoryItem {
  readonly saleId: string;
  readonly paymentMethod: "cash" | "on_account";
  readonly paymentStatus: "paid" | "partial" | "pending";
  readonly customerId?: string;
  readonly customerName?: string;
  readonly total: number;
  readonly amountPaid: number;
  readonly outstandingAmount: number;
  readonly itemCount: number;
  readonly createdAt: string;
}

interface SalesHistoryResponse {
  readonly items: readonly SalesHistoryItem[];
}

interface DebtPaymentResponse {
  readonly paymentId: string;
  readonly amount: number;
  readonly orderId?: string;
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface OrdersPanelProps {
  readonly refreshToken?: number;
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

function paymentStatusLabel(status: SalesHistoryItem["paymentStatus"]): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    default:
      return "Pending";
  }
}

function paymentStatusClasses(status: SalesHistoryItem["paymentStatus"]): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "partial":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

export function OrdersPanel({
  refreshToken,
}: OrdersPanelProps): JSX.Element {
  const [salesHistory, setSalesHistory] = useState<readonly SalesHistoryItem[]>([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    "all" | "cash" | "on_account"
  >("all");
  const [partialPaymentAmountBySaleId, setPartialPaymentAmountBySaleId] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submittingSaleId, setSubmittingSaleId] = useState<string | null>(null);

  const loadOrders = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const { response, data } = await fetchJsonNoStore<
        SalesHistoryResponse | ApiErrorPayload
      >("/api/v1/reports/sales-history");

      if (!response.ok || !data) {
        throw new Error(resolveApiMessage(data, "Could not load orders snapshot."));
      }

      setSalesHistory((data as SalesHistoryResponse).items);
      setIsError(false);
    } catch (error: unknown) {
      setIsError(true);
      setFeedback(error instanceof Error ? error.message : "Could not load orders snapshot.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, refreshToken]);

  const visibleSales = useMemo(() => {
    if (paymentMethodFilter === "all") {
      return salesHistory;
    }

    return salesHistory.filter((sale) => sale.paymentMethod === paymentMethodFilter);
  }, [paymentMethodFilter, salesHistory]);

  const totalRevenue = useMemo(
    () => visibleSales.reduce((sum, sale) => sum + sale.total, 0),
    [visibleSales],
  );
  const totalCollected = useMemo(
    () => visibleSales.reduce((sum, sale) => sum + sale.amountPaid, 0),
    [visibleSales],
  );
  const totalOutstanding = useMemo(
    () => visibleSales.reduce((sum, sale) => sum + sale.outstandingAmount, 0),
    [visibleSales],
  );

  async function handleRegisterPartialPayment(sale: SalesHistoryItem): Promise<void> {
    if (!sale.customerId) {
      setIsError(true);
      setFeedback("This order is not linked to a customer.");
      return;
    }

    const rawAmount = partialPaymentAmountBySaleId[sale.saleId] ?? "";
    const parsedAmount = Number(rawAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setIsError(true);
      setFeedback("Partial payment amount must be greater than zero.");
      return;
    }

    if (parsedAmount > sale.outstandingAmount) {
      setIsError(true);
      setFeedback("Partial payment cannot exceed the remaining balance for this order.");
      return;
    }

    setSubmittingSaleId(sale.saleId);
    setFeedback(null);

    try {
      const response = await fetch("/api/v1/debt-payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          customerId: sale.customerId,
          orderId: sale.saleId,
          amount: Number(parsedAmount.toFixed(2)),
          paymentMethod: "cash",
        }),
      });

      const payload = (await response.json()) as DebtPaymentResponse | ApiErrorPayload;

      if (!response.ok) {
        setIsError(true);
        setFeedback(resolveApiMessage(payload, "Could not register order payment."));
        return;
      }

      setPartialPaymentAmountBySaleId((current) => ({
        ...current,
        [sale.saleId]: "",
      }));
      const successMessage =
        `Payment registered for ${sale.saleId}: ${formatMoney(
          (payload as DebtPaymentResponse).amount,
        )}.`;
      await loadOrders();
      setIsError(false);
      setFeedback(successMessage);
    } catch {
      setIsError(true);
      setFeedback("Could not register order payment.");
    } finally {
      setSubmittingSaleId(null);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Orders Snapshot
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review every recorded sale, the amount already collected, and any remaining balance.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Payment method</span>
            <select
              data-testid="orders-payment-method-filter"
              value={paymentMethodFilter}
              onChange={(event) =>
                setPaymentMethodFilter(
                  event.target.value as "all" | "cash" | "on_account",
                )
              }
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
            >
              <option value="all">All</option>
              <option value="cash">Cash</option>
              <option value="on_account">On account</option>
            </select>
          </label>

          <button
            data-testid="orders-refresh-button"
            type="button"
            onClick={() => {
              void loadOrders();
            }}
            disabled={isLoading}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            {isLoading ? "Refreshing..." : "Refresh snapshot"}
          </button>
        </div>
      </header>

      {feedback ? (
        <p
          data-testid="orders-feedback"
          className={[
            "mt-3 rounded-xl px-3 py-2 text-sm font-medium",
            isError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {feedback}
        </p>
      ) : null}

      <section className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">Orders</p>
          <p data-testid="orders-total-count" className="text-lg font-semibold text-slate-900">
            {visibleSales.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">Revenue</p>
          <p data-testid="orders-total-revenue" className="text-lg font-semibold text-slate-900">
            {formatMoney(totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">Collected</p>
          <p
            data-testid="orders-total-collected"
            className="text-lg font-semibold text-slate-900"
          >
            {formatMoney(totalCollected)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">Outstanding</p>
          <p
            data-testid="orders-total-outstanding"
            className="text-lg font-semibold text-slate-900"
          >
            {formatMoney(totalOutstanding)}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-700">Recorded sales</p>
        </div>

        <ul className="max-h-[32rem] space-y-2 overflow-y-auto p-3">
          {visibleSales.map((sale) => (
            <li
              key={sale.saleId}
              data-testid={`orders-sale-item-${sale.saleId}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {sale.paymentMethod === "cash" ? "Cash sale" : "On-account sale"}
                    </p>
                    <span
                      data-testid={`orders-sale-status-${sale.saleId}`}
                      className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-[0.72rem] font-semibold",
                        paymentStatusClasses(sale.paymentStatus),
                      ].join(" ")}
                    >
                      {paymentStatusLabel(sale.paymentStatus)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(sale.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-base font-semibold text-slate-900">
                    {formatMoney(sale.total)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{sale.itemCount} items</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                <p>
                  <span className="font-semibold text-slate-900">Sale ID:</span> {sale.saleId}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Method:</span>{" "}
                  {sale.paymentMethod}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Customer:</span>{" "}
                  {sale.customerName ?? "Walk-in"}
                </p>
              </div>

              <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                <div className="rounded-lg bg-white px-3 py-2">
                  <p className="font-semibold text-slate-500">Total</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatMoney(sale.total)}
                  </p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <p className="font-semibold text-slate-500">Collected</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatMoney(sale.amountPaid)}
                  </p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <p className="font-semibold text-slate-500">Outstanding</p>
                  <p
                    data-testid={`orders-sale-outstanding-${sale.saleId}`}
                    className="mt-1 text-sm font-semibold text-slate-900"
                  >
                    {formatMoney(sale.outstandingAmount)}
                  </p>
                </div>
              </div>

              {sale.paymentMethod === "on_account" && sale.outstandingAmount > 0 ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold text-slate-600">Register partial payment</p>
                  <div className="mt-2 flex flex-col gap-2 md:flex-row">
                    <input
                      data-testid={`orders-partial-payment-amount-input-${sale.saleId}`}
                      type="number"
                      min="0.01"
                      max={sale.outstandingAmount.toFixed(2)}
                      step="0.01"
                      placeholder="Amount"
                      value={partialPaymentAmountBySaleId[sale.saleId] ?? ""}
                      onChange={(event) =>
                        setPartialPaymentAmountBySaleId((current) => ({
                          ...current,
                          [sale.saleId]: event.target.value,
                        }))
                      }
                      disabled={submittingSaleId === sale.saleId}
                      className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 disabled:bg-slate-100"
                    />
                    <button
                      data-testid={`orders-partial-payment-button-${sale.saleId}`}
                      type="button"
                      onClick={() => {
                        void handleRegisterPartialPayment(sale);
                      }}
                      disabled={submittingSaleId === sale.saleId}
                      className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
                    >
                      {submittingSaleId === sale.saleId ? "Applying..." : "Apply payment"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Apply a payment directly to this order without leaving the snapshot.
                  </p>
                </div>
              ) : null}
            </li>
          ))}

          {visibleSales.length === 0 ? (
            <li className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              No sales recorded yet for this filter.
            </li>
          ) : null}
        </ul>
      </section>
    </article>
  );
}
