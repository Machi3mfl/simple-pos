"use client";

import {
  Activity,
  BanknoteArrowUp,
  Boxes,
  CreditCard,
  HandCoins,
  PackageSearch,
  ReceiptText,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import { cn } from "@/lib/utils";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";

type PaymentMethodFilter = "all" | "cash" | "on_account";
type PaymentStatus = "paid" | "partial" | "pending";
type MetricTone = "neutral" | "blue" | "emerald" | "amber";

interface SalesHistoryItem {
  readonly saleId: string;
  readonly paymentMethod: "cash" | "on_account";
  readonly customerId?: string;
  readonly customerName?: string;
  readonly total: number;
  readonly amountPaid: number;
  readonly outstandingAmount: number;
  readonly paymentStatus: PaymentStatus;
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

interface ProductsWorkspaceSummaryResponse {
  readonly totalItems: number;
  readonly summary: {
    readonly withStock: number;
    readonly lowStock: number;
    readonly outOfStock: number;
    readonly stockValue: number;
  };
}

interface ReceivableSnapshotItem {
  readonly customerId: string;
  readonly customerName: string;
  readonly outstandingBalance: number;
  readonly totalDebtAmount: number;
  readonly totalPaidAmount: number;
  readonly openOrderCount: number;
  readonly lastActivityAt: string;
}

interface ReceivablesSnapshotResponse {
  readonly items: readonly ReceivableSnapshotItem[];
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface TrendChartPoint {
  readonly dayKey: string;
  readonly label: string;
  readonly revenue: number;
  readonly collected: number;
  readonly outstanding: number;
}

interface PaymentMixPoint {
  readonly key: "cash" | "on_account";
  readonly label: string;
  readonly value: number;
  readonly orderCount: number;
}

interface InventoryHealthPoint {
  readonly key: "withStock" | "lowStock" | "outOfStock";
  readonly label: string;
  readonly value: number;
}

interface InsightItem {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly tone: MetricTone;
}

const percentageFormatter = new Intl.NumberFormat("es-AR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

const metricCardToneClassNames: Record<
  MetricTone,
  {
    readonly card: string;
    readonly value: string;
    readonly icon: string;
  }
> = {
  neutral: {
    card: "border-slate-200 bg-white",
    value: "text-slate-950",
    icon: "bg-slate-100 text-slate-600",
  },
  blue: {
    card: "border-blue-200 bg-blue-50/80",
    value: "text-blue-700",
    icon: "bg-blue-100 text-blue-700",
  },
  emerald: {
    card: "border-emerald-200 bg-emerald-50/80",
    value: "text-emerald-700",
    icon: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    card: "border-amber-200 bg-amber-50/90",
    value: "text-amber-700",
    icon: "bg-amber-100 text-amber-700",
  },
};

const dailyTrendChartConfig = {
  revenue: {
    label: "Facturación",
    color: "#2f6bff",
  },
  collected: {
    label: "Cobrado",
    color: "#0f8a62",
  },
  outstanding: {
    label: "Pendiente",
    color: "#c26512",
  },
} satisfies ChartConfig;

const paymentMixChartConfig = {
  cash: {
    label: "Efectivo",
    color: "#2f6bff",
  },
  on_account: {
    label: "Cuenta corriente",
    color: "#c26512",
  },
} satisfies ChartConfig;

const inventoryHealthChartConfig = {
  withStock: {
    label: "Con stock",
    color: "#0f8a62",
  },
  lowStock: {
    label: "Stock bajo",
    color: "#d4a017",
  },
  outOfStock: {
    label: "Sin stock",
    color: "#d14d72",
  },
} satisfies ChartConfig;

const topProductsChartConfig = {
  revenue: {
    label: "Facturación",
    color: "#2f6bff",
  },
} satisfies ChartConfig;

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

function buildEndpoint(pathname: string, queryString: string): string {
  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function formatShortDayLabel(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function truncateLabel(value: string, maxLength = 26): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function formatPercent(value: number): string {
  return percentageFormatter.format(Number.isFinite(value) ? value : 0);
}

function buildDailyTrendData(items: readonly SalesHistoryItem[]): readonly TrendChartPoint[] {
  const aggregateByDay = new Map<
    string,
    { revenue: number; collected: number; outstanding: number }
  >();

  items.forEach((item) => {
    const dayKey = item.createdAt.slice(0, 10);
    const current = aggregateByDay.get(dayKey) ?? {
      revenue: 0,
      collected: 0,
      outstanding: 0,
    };

    current.revenue += item.total;
    current.collected += item.amountPaid;
    current.outstanding += item.outstandingAmount;
    aggregateByDay.set(dayKey, current);
  });

  return Array.from(aggregateByDay.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dayKey, current]) => ({
      dayKey,
      label: formatShortDayLabel(dayKey),
      revenue: roundMoney(current.revenue),
      collected: roundMoney(current.collected),
      outstanding: roundMoney(current.outstanding),
    }));
}

function buildPaymentMixData(
  items: readonly SalesHistoryItem[],
  labelForPaymentMethod: (value: "cash" | "on_account") => string,
): readonly PaymentMixPoint[] {
  const aggregate = new Map<"cash" | "on_account", { value: number; orderCount: number }>();

  items.forEach((item) => {
    const current = aggregate.get(item.paymentMethod) ?? {
      value: 0,
      orderCount: 0,
    };

    current.value += item.total;
    current.orderCount += 1;
    aggregate.set(item.paymentMethod, current);
  });

  return (["cash", "on_account"] as const)
    .map((key) => ({
      key,
      label: labelForPaymentMethod(key),
      value: roundMoney(aggregate.get(key)?.value ?? 0),
      orderCount: aggregate.get(key)?.orderCount ?? 0,
    }))
    .filter((item) => item.value > 0 || item.orderCount > 0);
}

function buildInventoryHealthData(
  summary: ProductsWorkspaceSummaryResponse["summary"] | null,
  messages: ReturnType<typeof useI18n>["messages"],
): readonly InventoryHealthPoint[] {
  if (!summary) {
    return [];
  }

  return [
    {
      key: "withStock",
      label: messages.productsWorkspace.summary.withStock,
      value: summary.withStock,
    },
    {
      key: "lowStock",
      label: messages.productsWorkspace.summary.lowStock,
      value: summary.lowStock,
    },
    {
      key: "outOfStock",
      label: messages.productsWorkspace.summary.outOfStock,
      value: summary.outOfStock,
    },
  ];
}

function buildInsights(input: {
  readonly revenue: number;
  readonly currentCredit: number;
  readonly inventoryRiskCount: number;
  readonly topProduct?: TopProductItem;
  readonly messages: ReturnType<typeof useI18n>["messages"];
}): readonly InsightItem[] {
  const creditShare =
    input.revenue > 0 ? input.currentCredit / input.revenue : input.currentCredit > 0 ? 1 : 0;
  const topProductShare =
    input.topProduct && input.revenue > 0 ? input.topProduct.revenue / input.revenue : 0;

  return [
    {
      id: "credit",
      title: input.messages.reporting.currentCreditMetric,
      body:
        input.currentCredit <= 0
          ? input.messages.receivables.noDebtors
          : creditShare > 0.35
            ? input.messages.reporting.insightCreditRisk(
                formatPercent(creditShare),
                `$${input.currentCredit.toFixed(2)}`,
              )
            : input.messages.reporting.insightCreditHealthy(
                formatPercent(creditShare),
                `$${input.currentCredit.toFixed(2)}`,
              ),
      tone: input.currentCredit <= 0 ? "emerald" : creditShare > 0.35 ? "amber" : "blue",
    },
    {
      id: "inventory",
      title: input.messages.reporting.inventoryRiskMetric,
      body:
        input.inventoryRiskCount > 0
          ? input.messages.reporting.insightInventoryRisk(input.inventoryRiskCount)
          : input.messages.reporting.insightInventoryHealthy,
      tone: input.inventoryRiskCount > 0 ? "amber" : "emerald",
    },
    {
      id: "concentration",
      title: input.messages.reporting.topProducts,
      body:
        input.topProduct && topProductShare > 0.45
          ? input.messages.reporting.insightTopProductConcentration(
              input.topProduct.name,
              formatPercent(topProductShare),
            )
          : input.topProduct
            ? input.messages.reporting.insightTopProductDiversified(
                input.topProduct.name,
                formatPercent(topProductShare),
              )
            : input.messages.reporting.noTopProducts,
      tone: input.topProduct && topProductShare > 0.45 ? "blue" : "neutral",
    },
  ];
}

function EmptyChartState({ message }: { readonly message: string }): JSX.Element {
  return (
    <div className="flex h-full min-h-[12rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
      {message}
    </div>
  );
}

function SnapshotMetricCard({
  title,
  value,
  description,
  tone = "neutral",
  icon: Icon,
  testId,
}: {
  readonly title: string;
  readonly value: React.ReactNode;
  readonly description?: string;
  readonly tone?: MetricTone;
  readonly icon: typeof TrendingUp;
  readonly testId?: string;
}): JSX.Element {
  const toneClasses = metricCardToneClassNames[tone];

  return (
    <div
      className={cn(
        "rounded-[1.75rem] border px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
        toneClasses.card,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p
            data-testid={testId}
            className={cn(
              "mt-3 text-[2.45rem] leading-none font-bold tracking-tight",
              toneClasses.value,
            )}
          >
            {value}
          </p>
          {description ? (
            <p className="mt-2 text-sm leading-snug text-slate-500">{description}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            toneClasses.icon,
          )}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function SecondaryStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function InsightCard({ item }: { readonly item: InsightItem }): JSX.Element {
  const toneClasses = metricCardToneClassNames[item.tone];

  return (
    <div className={cn("rounded-[1.5rem] border px-4 py-4", toneClasses.card)}>
      <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {item.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.body}</p>
    </div>
  );
}

export function ReportingPanel(): JSX.Element {
  const { messages, formatCurrency, formatDateTime, labelForPaymentMethod } = useI18n();
  const [periodStart, setPeriodStart] = useState<string>(() =>
    toDateInputValue(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)),
  );
  const [periodEnd, setPeriodEnd] = useState<string>(() => toDateInputValue(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodFilter>("all");

  const [salesHistory, setSalesHistory] = useState<readonly SalesHistoryItem[]>([]);
  const [topProducts, setTopProducts] = useState<readonly TopProductItem[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
  const [productsSummary, setProductsSummary] = useState<ProductsWorkspaceSummaryResponse | null>(
    null,
  );
  const [receivablesSnapshot, setReceivablesSnapshot] = useState<
    readonly ReceivableSnapshotItem[]
  >([]);

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
      const [
        salesResult,
        topProductsResult,
        profitResult,
        productsSnapshotResult,
        receivablesResult,
      ] = await Promise.all([
        fetchJsonNoStore<SalesHistoryResponse | ApiErrorPayload>(
          buildEndpoint("/api/v1/reports/sales-history", queryString),
        ),
        fetchJsonNoStore<TopProductsResponse | ApiErrorPayload>(
          buildEndpoint("/api/v1/reports/top-products", queryString),
        ),
        fetchJsonNoStore<ProfitSummary | ApiErrorPayload>(
          buildEndpoint("/api/v1/reports/profit-summary", queryString),
        ),
        fetchJsonNoStore<ProductsWorkspaceSummaryResponse | ApiErrorPayload>(
          "/api/v1/products/workspace?activeOnly=true&page=1&pageSize=1",
        ),
        fetchJsonNoStore<ReceivablesSnapshotResponse | ApiErrorPayload>("/api/v1/receivables"),
      ]);

      if (!salesResult.response.ok) {
        throw new Error(resolveApiMessage(salesResult.data, messages.reporting.loadSalesError));
      }

      if (!topProductsResult.response.ok) {
        throw new Error(
          resolveApiMessage(topProductsResult.data, messages.reporting.loadTopProductsError),
        );
      }

      if (!profitResult.response.ok) {
        throw new Error(resolveApiMessage(profitResult.data, messages.reporting.loadProfitError));
      }

      if (!productsSnapshotResult.response.ok) {
        throw new Error(
          resolveApiMessage(
            productsSnapshotResult.data,
            messages.reporting.loadProductsSnapshotError,
          ),
        );
      }

      if (!receivablesResult.response.ok) {
        throw new Error(
          resolveApiMessage(
            receivablesResult.data,
            messages.reporting.loadReceivablesSnapshotError,
          ),
        );
      }

      setSalesHistory((salesResult.data as SalesHistoryResponse | null)?.items ?? []);
      setTopProducts((topProductsResult.data as TopProductsResponse | null)?.items ?? []);
      setProfitSummary((profitResult.data as ProfitSummary | null) ?? null);
      setProductsSummary((productsSnapshotResult.data as ProductsWorkspaceSummaryResponse | null) ?? null);
      setReceivablesSnapshot(
        (receivablesResult.data as ReceivablesSnapshotResponse | null)?.items ?? [],
      );
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
    messages.reporting.loadProductsSnapshotError,
    messages.reporting.loadProfitError,
    messages.reporting.loadReceivablesSnapshotError,
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

  const sortedRecentSales = useMemo(
    () =>
      [...salesHistory]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .slice(0, 6),
    [salesHistory],
  );

  const totalSalesCount = salesHistory.length;
  const collectedAmount = useMemo(
    () => roundMoney(salesHistory.reduce((sum, sale) => sum + sale.amountPaid, 0)),
    [salesHistory],
  );
  const periodOutstandingAmount = useMemo(
    () => roundMoney(salesHistory.reduce((sum, sale) => sum + sale.outstandingAmount, 0)),
    [salesHistory],
  );
  const currentCreditAmount = useMemo(
    () =>
      roundMoney(
        receivablesSnapshot.reduce((sum, customer) => sum + customer.outstandingBalance, 0),
      ),
    [receivablesSnapshot],
  );
  const debtorCount = receivablesSnapshot.length;
  const openOrderCount = useMemo(
    () =>
      receivablesSnapshot.reduce((sum, customer) => sum + customer.openOrderCount, 0),
    [receivablesSnapshot],
  );
  const averageTicket = useMemo(
    () =>
      profitSummary && totalSalesCount > 0
        ? roundMoney(profitSummary.revenue / totalSalesCount)
        : 0,
    [profitSummary, totalSalesCount],
  );
  const grossMargin = useMemo(
    () =>
      profitSummary && profitSummary.revenue > 0
        ? profitSummary.profit / profitSummary.revenue
        : 0,
    [profitSummary],
  );
  const inventoryRiskCount =
    (productsSummary?.summary.lowStock ?? 0) + (productsSummary?.summary.outOfStock ?? 0);

  const dailyTrendData = useMemo(() => buildDailyTrendData(salesHistory), [salesHistory]);
  const paymentMixData = useMemo(
    () => buildPaymentMixData(salesHistory, labelForPaymentMethod),
    [labelForPaymentMethod, salesHistory],
  );
  const inventoryHealthData = useMemo(
    () => buildInventoryHealthData(productsSummary?.summary ?? null, messages),
    [messages, productsSummary],
  );
  const topProductsChartData = useMemo(
    () =>
      topProducts
        .slice(0, 5)
        .map((item) => ({
          ...item,
          shortName: truncateLabel(item.name, 24),
        }))
        .reverse(),
    [topProducts],
  );
  const insights = useMemo(
    () =>
      buildInsights({
        revenue: profitSummary?.revenue ?? 0,
        currentCredit: currentCreditAmount,
        inventoryRiskCount,
        topProduct: topProducts[0],
        messages,
      }),
    [currentCreditAmount, inventoryRiskCount, messages, profitSummary?.revenue, topProducts],
  );

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] lg:p-6">
      <header className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,430px)] xl:items-start">
        <div>
          <h2 className="text-[3.2rem] leading-[0.95] font-semibold tracking-tight text-slate-950">
            {messages.reporting.title}
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-500">
            {messages.reporting.subtitle}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              <Activity size={16} className="text-slate-400" />
              {messages.reporting.periodSnapshotTitle}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              <Boxes size={16} className="text-slate-400" />
              {messages.reporting.currentStateTitle}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              <CreditCard size={16} className="text-slate-400" />
              {labelForPaymentMethod(paymentMethod === "all" ? "cash" : paymentMethod)}
              {paymentMethod === "all" ? ` + ${labelForPaymentMethod("on_account")}` : ""}
            </div>
          </div>
        </div>

        <form
          className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
          onSubmit={handleFilterSubmit}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">
                {messages.common.labels.periodStart}
              </span>
              <input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                className="min-h-[3.35rem] rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-800 outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">
                {messages.common.labels.periodEnd}
              </span>
              <input
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className="min-h-[3.35rem] rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-800 outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">
                {messages.common.labels.paymentMethod}
              </span>
              <select
                data-testid="reporting-payment-method-select"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as PaymentMethodFilter)
                }
                className="min-h-[3.35rem] rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-800 outline-none transition focus:border-blue-400"
              >
                <option value="all">{messages.common.paymentMethods.all}</option>
                <option value="cash">{messages.common.paymentMethods.cash}</option>
                <option value="on_account">{messages.common.paymentMethods.on_account}</option>
              </select>
            </label>

            <button
              data-testid="reporting-apply-filters-button"
              type="submit"
              disabled={isLoading}
              className="mt-auto min-h-[3.35rem] rounded-2xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-5 text-base font-semibold text-white shadow-[0_12px_24px_rgba(23,104,232,0.34)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? messages.common.states.loading : messages.common.actions.applyFilters}
            </button>
          </div>
        </form>
      </header>

      {feedback ? (
        <p
          data-testid="reporting-feedback"
          className={cn(
            "mt-4 rounded-2xl px-4 py-3 text-sm font-medium",
            isError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
          )}
        >
          {feedback}
        </p>
      ) : null}

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {messages.reporting.periodSnapshotTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Lectura del período filtrado para facturación, costo y resultado.
            </p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          <SnapshotMetricCard
            title={messages.reporting.salesCountMetric}
            value={integerFormatter.format(totalSalesCount)}
            description={`${integerFormatter.format(totalSalesCount)} tickets en el período`}
            tone="neutral"
            icon={ReceiptText}
            testId="reporting-sales-count-value"
          />
          <SnapshotMetricCard
            title={messages.common.labels.revenue}
            value={profitSummary ? formatCurrency(profitSummary.revenue) : "-"}
            description="Volumen bruto vendido dentro del filtro actual."
            tone="blue"
            icon={TrendingUp}
            testId="reporting-revenue-value"
          />
          <SnapshotMetricCard
            title={messages.common.labels.cost}
            value={profitSummary ? formatCurrency(profitSummary.cost) : "-"}
            description="Costo consumido por las ventas del período."
            tone="neutral"
            icon={PackageSearch}
            testId="reporting-cost-value"
          />
          <SnapshotMetricCard
            title={messages.common.labels.profit}
            value={profitSummary ? formatCurrency(profitSummary.profit) : "-"}
            description="Resultado bruto antes de gastos operativos."
            tone="emerald"
            icon={BanknoteArrowUp}
            testId="reporting-profit-value"
          />
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {messages.reporting.currentStateTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Cruce de caja, crédito e inventario para entender la posición operativa actual.
            </p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          <SnapshotMetricCard
            title={messages.reporting.marginMetric}
            value={profitSummary ? formatPercent(grossMargin) : "-"}
            description={`Ticket promedio ${formatCurrency(averageTicket)}`}
            tone="neutral"
            icon={Activity}
            testId="reporting-margin-value"
          />
          <SnapshotMetricCard
            title={messages.reporting.collectedMetric}
            value={formatCurrency(collectedAmount)}
            description={`Pendiente del período ${formatCurrency(periodOutstandingAmount)}`}
            tone="blue"
            icon={HandCoins}
            testId="reporting-collected-value"
          />
          <SnapshotMetricCard
            title={messages.reporting.currentCreditMetric}
            value={formatCurrency(currentCreditAmount)}
            description={`${integerFormatter.format(debtorCount)} deudores · ${integerFormatter.format(openOrderCount)} pedidos abiertos`}
            tone={currentCreditAmount > 0 ? "amber" : "emerald"}
            icon={Wallet}
            testId="reporting-current-credit-value"
          />
          <SnapshotMetricCard
            title={messages.reporting.stockValueMetric}
            value={productsSummary ? formatCurrency(productsSummary.summary.stockValue) : "-"}
            description={`${messages.productsWorkspace.summary.withStock}: ${integerFormatter.format(productsSummary?.summary.withStock ?? 0)} · ${messages.reporting.inventoryRiskMetric}: ${integerFormatter.format(inventoryRiskCount)}`}
            tone="emerald"
            icon={Boxes}
            testId="reporting-stock-value"
          />
        </div>
      </section>

      <section className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {messages.reporting.dailyTrendTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {messages.reporting.dailyTrendDescription}
            </p>
          </div>

          {dailyTrendData.length === 0 ? (
            <EmptyChartState message={messages.reporting.noTrendData} />
          ) : (
            <ChartContainer config={dailyTrendChartConfig} className="h-[320px] w-full">
              <AreaChart data={dailyTrendData} margin={{ left: 10, right: 10, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis tickLine={false} axisLine={false} width={74} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent className="pt-3" />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  fill="var(--color-revenue)"
                  fillOpacity={0.16}
                  strokeWidth={2.4}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="var(--color-collected)"
                  fill="var(--color-collected)"
                  fillOpacity={0.1}
                  strokeWidth={2.2}
                />
                <Area
                  type="monotone"
                  dataKey="outstanding"
                  stroke="var(--color-outstanding)"
                  fill="var(--color-outstanding)"
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="mb-4">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                {messages.reporting.paymentMixTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {messages.reporting.paymentMixDescription}
              </p>
            </div>

            {paymentMixData.length === 0 ? (
              <EmptyChartState message={messages.reporting.noPaymentMixData} />
            ) : (
              <div className="grid items-center gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <ChartContainer config={paymentMixChartConfig} className="h-[240px] w-full">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(Number(value))}
                          hideLabel
                        />
                      }
                    />
                    <Pie
                      data={paymentMixData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={5}
                    >
                      {paymentMixData.map((item) => (
                        <Cell
                          key={item.key}
                          fill={`var(--color-${item.key})`}
                          stroke="white"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="space-y-3">
                  {paymentMixData.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: `var(--color-${item.key})` }}
                            aria-hidden
                          />
                          <span className="text-sm font-semibold text-slate-700">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-500">
                          {messages.reporting.paymentMixOrders(item.orderCount)}
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                        {formatCurrency(item.value)}
                      </p>
                    </div>
                  ))}

                  <SecondaryStat
                    label={messages.reporting.averageTicketMetric}
                    value={formatCurrency(averageTicket)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="mb-4">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                {messages.reporting.inventoryHealthTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {messages.reporting.inventoryHealthDescription}
              </p>
            </div>

            {inventoryHealthData.length === 0 ? (
              <EmptyChartState message={messages.reporting.noInventoryHealthData} />
            ) : (
              <>
                <ChartContainer config={inventoryHealthChartConfig} className="h-[220px] w-full">
                  <BarChart data={inventoryHealthData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => integerFormatter.format(Number(value))} />}
                    />
                    <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                      {inventoryHealthData.map((item) => (
                        <Cell
                          key={item.key}
                          fill={`var(--color-${item.key})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {inventoryHealthData.map((item) => (
                    <SecondaryStat
                      key={item.key}
                      label={item.label}
                      value={messages.reporting.inventoryHealthValue(item.value)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {messages.reporting.topProducts}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {messages.reporting.topProductsDescription}
            </p>
          </div>

          {topProductsChartData.length === 0 ? (
            <EmptyChartState message={messages.reporting.noTopProducts} />
          ) : (
            <>
              <ChartContainer config={topProductsChartConfig} className="h-[280px] w-full">
                <BarChart
                  data={topProductsChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 10, top: 6, bottom: 6 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} hide />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                        hideLabel
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 14, 14, 0]} />
                </BarChart>
              </ChartContainer>

              <div className="mt-4 space-y-3">
                {topProducts.slice(0, 5).map((item) => (
                  <div
                    key={item.productId}
                    data-testid={`reporting-top-product-item-${item.productId}`}
                    className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-950">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {messages.reporting.quantitySold(item.quantitySold)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {messages.common.labels.revenue}
                        </p>
                        <p className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                          {formatCurrency(item.revenue)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {messages.reporting.executiveInsightsTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {messages.reporting.executiveInsightsDescription}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SecondaryStat
              label={messages.reporting.debtorsMetric}
              value={integerFormatter.format(debtorCount)}
            />
            <SecondaryStat
              label={messages.reporting.openOrdersMetric}
              value={integerFormatter.format(openOrderCount)}
            />
          </div>

          <div className="mt-4 space-y-3">
            {insights.length > 0 ? (
              insights.map((item) => <InsightCard key={item.id} item={item} />)
            ) : (
              <EmptyChartState message={messages.reporting.noInsights} />
            )}
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {messages.reporting.recentSalesTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {messages.reporting.recentSalesDescription}
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
            {integerFormatter.format(totalSalesCount)} ventas
          </div>
        </div>

        {sortedRecentSales.length === 0 ? (
          <EmptyChartState message={messages.reporting.noRecentSales} />
        ) : (
          <div className="grid gap-3">
            {sortedRecentSales.map((sale) => (
              <article
                key={sale.saleId}
                data-testid={`reporting-sales-item-${sale.saleId}`}
                className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                        <CreditCard size={14} className="text-slate-400" />
                        {labelForPaymentMethod(sale.paymentMethod)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1 text-sm font-semibold",
                          sale.paymentStatus === "paid"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : sale.paymentStatus === "partial"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-rose-200 bg-rose-50 text-rose-700",
                        )}
                      >
                        {sale.paymentStatus === "paid"
                          ? "Pagada"
                          : sale.paymentStatus === "partial"
                            ? "Parcial"
                            : "Pendiente"}
                      </span>
                    </div>

                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                      {formatCurrency(sale.total)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateTime(sale.createdAt)}
                      {sale.customerName
                        ? ` • ${messages.reporting.customerLabel(sale.customerName)}`
                        : ""}
                    </p>
                  </div>

                  <div className="grid min-w-[15rem] gap-3 sm:grid-cols-2 lg:min-w-[20rem]">
                    <SecondaryStat
                      label={messages.common.labels.paid}
                      value={formatCurrency(sale.amountPaid)}
                    />
                    <SecondaryStat
                      label={messages.common.labels.remaining}
                      value={formatCurrency(sale.outstandingAmount)}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-600">
                    <ReceiptText size={14} className="text-slate-400" />
                    {sale.itemCount} {messages.common.labels.items.toLowerCase()}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
