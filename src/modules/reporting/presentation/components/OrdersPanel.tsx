"use client";

import {
  Banknote,
  CalendarDays,
  Package,
  ReceiptText,
  RefreshCw,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";

interface SalesHistoryLineItem {
  readonly productId: string;
  readonly productName?: string;
  readonly productImageUrl?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

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
  readonly saleItems: readonly SalesHistoryLineItem[];
  readonly createdAt: string;
}

interface SalesHistoryResponse {
  readonly items: readonly SalesHistoryItem[];
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface OrdersPanelProps {
  readonly refreshToken?: number;
}

interface OrdersDialogProps {
  readonly sale: SalesHistoryItem;
  readonly onClose: () => void;
}

interface OrdersSummaryMetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly testId?: string;
  readonly tone: "neutral" | "blue" | "emerald" | "amber";
}

interface SaleTopMetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly testId?: string;
  readonly valueClassName: string;
  readonly valueSizeClassName?: string;
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

function paymentStatusClasses(status: SalesHistoryItem["paymentStatus"]): string {
  switch (status) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "partial":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function resolvePaymentMethodVisual(
  paymentMethod: SalesHistoryItem["paymentMethod"],
): {
  readonly icon: LucideIcon;
  readonly surfaceClassName: string;
  readonly chipClassName: string;
} {
  if (paymentMethod === "cash") {
    return {
      icon: Banknote,
      surfaceClassName:
        "border-emerald-200 bg-[linear-gradient(135deg,rgba(240,253,244,1),rgba(220,252,231,0.92))] text-emerald-700",
      chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    icon: Wallet,
    surfaceClassName:
      "border-blue-200 bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(219,234,254,0.96))] text-blue-700",
    chipClassName: "border-blue-200 bg-blue-50 text-blue-700",
  };
}

function OrdersSummaryMetricCard({
  label,
  value,
  testId,
  tone,
}: OrdersSummaryMetricCardProps): JSX.Element {
  const toneClasses: Record<OrdersSummaryMetricCardProps["tone"], string> = {
    neutral: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };
  const labelToneClasses: Record<OrdersSummaryMetricCardProps["tone"], string> = {
    neutral: "text-slate-500",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  };

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3.5 shadow-[0_10px_20px_rgba(15,23,42,0.04)] md:px-5 md:py-4",
        toneClasses[tone],
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-semibold uppercase tracking-[0.14em]",
          labelToneClasses[tone],
        ].join(" ")}
      >
        {label}
      </p>
      <p
        data-testid={testId}
        className="mt-2 text-[2.05rem] leading-none font-bold tracking-tight md:text-[2.15rem]"
      >
        {value}
      </p>
    </div>
  );
}

function SaleTopMetricCard({
  label,
  value,
  testId,
  valueClassName,
  valueSizeClassName,
}: SaleTopMetricCardProps): JSX.Element {
  return (
    <div className="rounded-[1.45rem] border border-slate-200 bg-slate-100 px-4 py-3 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] md:px-4 md:py-3.5 lg:text-right">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        data-testid={testId}
        className={[
          valueSizeClassName ??
            "mt-2 text-[1.85rem] leading-none font-bold tracking-tight md:text-[2rem]",
          valueClassName,
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function formatCompactCurrency(
  amount: number,
  formatCurrency: (value: number) => string,
): string {
  const formatted = formatCurrency(amount);
  return formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
}

function OrdersDialog({ sale, onClose }: OrdersDialogProps): JSX.Element {
  const {
    messages,
    formatCurrency,
    formatDateTime,
    labelForPaymentMethod,
    labelForPaymentStatus,
  } = useI18n();
  const paymentMethodVisual = resolvePaymentMethodVisual(sale.paymentMethod);
  const PaymentMethodIcon = paymentMethodVisual.icon;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          data-testid="orders-sale-detail-modal"
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[56rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="shrink-0 border-b border-slate-200/80 px-5 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start gap-3">
                  <div
                    className={[
                      "flex size-14 shrink-0 items-center justify-center rounded-2xl border",
                      paymentMethodVisual.surfaceClassName,
                    ].join(" ")}
                  >
                    <PaymentMethodIcon className="size-7" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {messages.shell.nav.sales}
                      </p>
                      <span
                        className={[
                          "inline-flex rounded-full border px-3 py-1 text-[0.78rem] font-semibold",
                          paymentStatusClasses(sale.paymentStatus),
                        ].join(" ")}
                      >
                        {labelForPaymentStatus(sale.paymentStatus)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-900 md:text-[2.1rem]">
                      {sale.paymentMethod === "cash"
                        ? messages.common.paymentMethods.cashSale
                        : messages.common.paymentMethods.onAccountSale}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                        <CalendarDays className="size-4 text-slate-400" aria-hidden />
                        {formatDateTime(sale.createdAt)}
                      </span>
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium",
                          paymentMethodVisual.chipClassName,
                        ].join(" ")}
                      >
                        <PaymentMethodIcon className="size-4" aria-hidden />
                        {labelForPaymentMethod(sale.paymentMethod)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                        <Package className="size-4 text-slate-400" aria-hidden />
                        {sale.itemCount} {messages.common.labels.items.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.45rem] bg-slate-100 px-4 py-2.5 text-left lg:min-w-[13.25rem] lg:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {messages.common.labels.total}
                </p>
                <p className="mt-2 text-[1.85rem] leading-none font-bold tracking-tight text-slate-900 md:text-[1.95rem]">
                  {formatCurrency(sale.total)}
                </p>
              </div>
            </div>
          </header>

          <div className="min-h-0 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
            <div className="grid gap-3 md:grid-cols-3">
              <SaleTopMetricCard
                label={messages.common.labels.total}
                value={formatCurrency(sale.total)}
                valueClassName="text-slate-900"
              />
              <SaleTopMetricCard
                label={messages.common.labels.collected}
                value={formatCurrency(sale.amountPaid)}
                valueClassName="text-emerald-800"
              />
              <SaleTopMetricCard
                label={messages.common.labels.outstanding}
                value={formatCurrency(sale.outstandingAmount)}
                valueClassName="text-amber-800"
              />
            </div>

            <div className="mt-4 rounded-[1.7rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {messages.common.labels.customer}
              </p>
              <p className="mt-2 text-[1.25rem] font-semibold tracking-tight text-slate-900">
                {sale.customerName ?? messages.common.fallbacks.walkInCustomer}
              </p>
            </div>

            <section className="mt-4 rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
              <div className="border-b border-slate-200 px-4 py-4">
                <p className="text-[1.2rem] font-semibold tracking-tight text-slate-900">
                  {messages.common.labels.items}
                </p>
              </div>

              <ul className="space-y-3 p-4">
                {sale.saleItems.map((item) => (
                  <li
                    key={`${sale.saleId}-${item.productId}`}
                    data-testid={`orders-sale-detail-item-${sale.saleId}-${item.productId}`}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] bg-white">
                        {item.productImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Order detail cards reuse stored product images and supported external URLs already used in catalog/cart.
                          <img
                            src={item.productImageUrl}
                            alt={item.productName ?? messages.common.fallbacks.unknownProduct}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Package className="size-8 text-slate-300" aria-hidden />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[1.08rem] font-semibold tracking-tight text-slate-900">
                          {item.productName ?? messages.common.fallbacks.unknownProduct}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                            {item.quantity} x {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {messages.common.labels.total}
                        </p>
                        <p className="mt-2 text-[1.45rem] leading-none font-bold tracking-tight text-slate-900">
                          {formatCurrency(item.lineTotal)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <FloatingModalCloseButton
            onClick={onClose}
            ariaLabel={messages.common.actions.close}
          />
        </div>
      </div>
    </div>
  );
}

export function OrdersPanel({
  refreshToken,
}: OrdersPanelProps): JSX.Element {
  const {
    messages,
    formatCurrency,
    formatDateTime,
    labelForPaymentMethod,
    labelForPaymentStatus,
  } = useI18n();
  const [salesHistory, setSalesHistory] = useState<readonly SalesHistoryItem[]>([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    "all" | "cash" | "on_account"
  >("all");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSale, setActiveSale] = useState<SalesHistoryItem | null>(null);

  const loadOrders = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const { response, data } = await fetchJsonNoStore<
        SalesHistoryResponse | ApiErrorPayload
      >("/api/v1/reports/sales-history");

      if (!response.ok || !data) {
        throw new Error(resolveApiMessage(data, messages.orders.loadError));
      }

      setSalesHistory((data as SalesHistoryResponse).items);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : messages.orders.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [messages.orders.loadError]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, refreshToken]);

  useEffect(() => {
    if (!activeSale) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setActiveSale(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeSale]);

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

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] lg:p-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-[52rem]">
          <h2 className="text-[2.4rem] font-semibold leading-[0.94] tracking-tight text-slate-900 sm:text-[2.8rem]">
            {messages.orders.title}
          </h2>
          <p className="mt-3 max-w-[48rem] text-[1.05rem] leading-7 text-slate-500">
            {messages.orders.subtitle}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[27rem]">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {messages.common.labels.paymentMethod}
            </span>
            <select
              data-testid="orders-payment-method-filter"
              value={paymentMethodFilter}
              onChange={(event) =>
                setPaymentMethodFilter(
                  event.target.value as "all" | "cash" | "on_account",
                )
              }
              className="min-h-[3.85rem] rounded-2xl border border-slate-300 bg-white px-4 text-[1.05rem] font-medium text-slate-800 outline-none transition focus:border-blue-400"
            >
              <option value="all">{messages.common.paymentMethods.all}</option>
              <option value="cash">{messages.common.paymentMethods.cash}</option>
              <option value="on_account">{messages.common.paymentMethods.on_account}</option>
            </select>
          </label>

          <button
            data-testid="orders-refresh-button"
            type="button"
            onClick={() => {
              void loadOrders();
            }}
            disabled={isLoading}
            className="mt-auto inline-flex min-h-[3.85rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[1rem] font-semibold text-white shadow-[0_16px_24px_rgba(30,98,227,0.32)] disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? messages.common.states.refreshing : messages.common.actions.refresh}
          </button>
        </div>
      </header>

      {loadError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {loadError}
        </div>
      ) : null}

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OrdersSummaryMetricCard
          label={messages.shell.nav.sales}
          value={String(visibleSales.length)}
          testId="orders-total-count"
          tone="neutral"
        />
        <OrdersSummaryMetricCard
          label={messages.common.labels.revenue}
          value={formatCurrency(totalRevenue)}
          testId="orders-total-revenue"
          tone="blue"
        />
        <OrdersSummaryMetricCard
          label={messages.common.labels.collected}
          value={formatCurrency(totalCollected)}
          testId="orders-total-collected"
          tone="emerald"
        />
        <OrdersSummaryMetricCard
          label={messages.common.labels.outstanding}
          value={formatCurrency(totalOutstanding)}
          testId="orders-total-outstanding"
          tone="amber"
        />
      </section>

      <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-4 py-4 lg:px-5">
          <p className="text-[1.4rem] font-semibold tracking-tight text-slate-900">
            {messages.orders.recordedSales}
          </p>
        </div>

        <ul className="max-h-[36rem] space-y-4 overflow-y-auto p-4 [scrollbar-gutter:stable] lg:p-5">
          {visibleSales.map((sale) => {
            const paymentMethodVisual = resolvePaymentMethodVisual(sale.paymentMethod);
            const PaymentMethodIcon = paymentMethodVisual.icon;

            return (
              <li key={sale.saleId}>
                <button
                  type="button"
                  data-testid={`orders-sale-item-${sale.saleId}`}
                  onClick={() => setActiveSale(sale)}
                  className="w-full rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.95))] px-4 py-4 text-left shadow-[0_16px_30px_rgba(15,23,42,0.06)] transition hover:border-blue-300 hover:shadow-[0_18px_32px_rgba(15,23,42,0.1)] md:px-5 md:py-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-3">
                        <div
                          className={[
                            "flex size-14 shrink-0 items-center justify-center rounded-2xl border",
                            paymentMethodVisual.surfaceClassName,
                          ].join(" ")}
                        >
                          <PaymentMethodIcon className="size-7" aria-hidden />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[1.35rem] font-semibold leading-tight tracking-tight text-slate-900 md:text-[1.5rem]">
                              {sale.paymentMethod === "cash"
                                ? messages.common.paymentMethods.cashSale
                                : messages.common.paymentMethods.onAccountSale}
                            </p>
                            <span
                              data-testid={`orders-sale-status-${sale.saleId}`}
                              className={[
                                "inline-flex rounded-full border px-3 py-1 text-[0.78rem] font-semibold",
                                paymentStatusClasses(sale.paymentStatus),
                              ].join(" ")}
                            >
                              {labelForPaymentStatus(sale.paymentStatus)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                              <CalendarDays className="size-4 text-slate-400" aria-hidden />
                              {formatDateTime(sale.createdAt)}
                            </span>
                            <span
                              className={[
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium",
                                paymentMethodVisual.chipClassName,
                              ].join(" ")}
                            >
                              <PaymentMethodIcon className="size-4" aria-hidden />
                              {labelForPaymentMethod(sale.paymentMethod)}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                              <Package className="size-4 text-slate-400" aria-hidden />
                              {sale.itemCount} {messages.common.labels.items.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="grid gap-3 md:grid-cols-3 xl:min-w-[31rem]">
                      <SaleTopMetricCard
                        label={messages.common.labels.collected}
                        value={formatCompactCurrency(sale.amountPaid, formatCurrency)}
                        valueSizeClassName="mt-2 text-[1.4rem] leading-none font-bold tracking-tight md:text-[1.55rem]"
                        valueClassName="text-emerald-800"
                      />
                      <SaleTopMetricCard
                        label={messages.common.labels.outstanding}
                        value={formatCompactCurrency(sale.outstandingAmount, formatCurrency)}
                        testId={`orders-sale-outstanding-${sale.saleId}`}
                        valueSizeClassName="mt-2 text-[1.4rem] leading-none font-bold tracking-tight md:text-[1.55rem]"
                        valueClassName="text-amber-800"
                      />
                      <SaleTopMetricCard
                        label={messages.common.labels.total}
                        value={formatCompactCurrency(sale.total, formatCurrency)}
                        valueSizeClassName="mt-2 text-[1.4rem] leading-none font-bold tracking-tight md:text-[1.55rem]"
                        valueClassName="text-slate-900"
                      />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}

          {visibleSales.length === 0 ? (
            <li className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <ReceiptText className="mx-auto size-10 text-slate-300" aria-hidden />
              <p className="mt-4 text-[1.1rem] font-semibold text-slate-700">
                {messages.orders.noSalesForFilter}
              </p>
            </li>
          ) : null}
        </ul>
      </section>

      {activeSale ? (
        <OrdersDialog sale={activeSale} onClose={() => setActiveSale(null)} />
      ) : null}
    </article>
  );
}
