"use client";

import {
  CalendarDays,
  Loader2,
  Package,
  RefreshCw,
  ReceiptText,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/hooks/use-app-toast";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import {
  listCashRegistersResponseDTOSchema,
  type CashRegisterListItemDTO,
} from "@/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";
import {
  enqueueOfflineSyncEvent,
  flushOfflineSyncQueue,
  getPendingOfflineSyncCount,
} from "@/modules/sync/presentation/offline/offlineSyncQueue";

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

interface CustomerDebtSummary {
  readonly customerId: string;
  readonly customerName: string;
  readonly outstandingBalance: number;
  readonly totalDebtAmount: number;
  readonly totalPaidAmount: number;
  readonly openOrderCount: number;
  readonly lastActivityAt: string;
  readonly orders: ReadonlyArray<{
    readonly orderId: string;
    readonly totalAmount: number;
    readonly amountPaid: number;
    readonly outstandingAmount: number;
    readonly createdAt?: string;
    readonly itemCount?: number;
    readonly saleItems: ReadonlyArray<{
      readonly productId: string;
      readonly productName?: string;
      readonly productImageUrl?: string;
      readonly quantity: number;
      readonly unitPrice: number;
      readonly lineTotal: number;
    }>;
  }>;
  readonly ledger: ReadonlyArray<{
    readonly entryId: string;
    readonly entryType: "debt" | "payment";
    readonly orderId?: string;
    readonly amount: number;
    readonly occurredAt: string;
    readonly notes?: string;
  }>;
}

interface DebtPaymentResponse {
  readonly paymentId: string;
  readonly customerId: string;
  readonly amount: number;
  readonly createdAt: string;
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface DebtManagementPanelProps {
  readonly refreshToken?: number;
  readonly canRegisterPayment?: boolean;
  readonly canViewSensitiveNotes?: boolean;
  readonly preferredCashRegisterId?: string;
}

interface ReceivablesMetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly testId?: string;
  readonly tone: "neutral" | "emerald" | "amber" | "blue";
}

interface ReceivableAmountCardProps {
  readonly label: string;
  readonly value: string;
  readonly valueClassName: string;
  readonly testId?: string;
}

interface DebtDetailDialogProps {
  readonly customer: ReceivableSnapshotItem;
  readonly detail: CustomerDebtSummary | null;
  readonly isLoading: boolean;
  readonly canRegisterPayment: boolean;
  readonly canViewSensitiveNotes: boolean;
  readonly paymentAmount: string;
  readonly paymentNotes: string;
  readonly isSubmitting: boolean;
  readonly paymentRegisters: readonly CashRegisterListItemDTO[];
  readonly selectedPaymentRegisterId: string;
  readonly onPaymentAmountChange: (value: string) => void;
  readonly onPaymentNotesChange: (value: string) => void;
  readonly onSelectedPaymentRegisterIdChange: (value: string) => void;
  readonly onSubmitPayment: (event: FormEvent<HTMLFormElement>) => void;
  readonly onClose: () => void;
}

type PendingOrdersFilter = "all" | "single" | "multiple";
type ReceivablesSortBy = "outstanding_desc" | "recent_desc" | "customer_asc";
type FeedbackTone = "success" | "error" | "info";

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

function parseMonetaryInput(rawValue: string): number {
  const normalizedValue = rawValue.trim().replace(",", ".");
  if (normalizedValue.length === 0) {
    return Number.NaN;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

function formatCompactCurrency(
  amount: number,
  formatCurrency: (value: number) => string,
): string {
  const formatted = formatCurrency(amount);
  return formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
}

function toDateInputValue(isoValue?: string): string {
  return isoValue ? isoValue.slice(0, 10) : "";
}

function paymentStatusBadgeClass(outstandingAmount: number, amountPaid: number): string {
  if (outstandingAmount <= 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (amountPaid > 0) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function ReceivablesMetricCard({
  label,
  value,
  testId,
  tone,
}: ReceivablesMetricCardProps): JSX.Element {
  const toneClasses: Record<ReceivablesMetricCardProps["tone"], string> = {
    neutral: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };
  const labelToneClasses: Record<ReceivablesMetricCardProps["tone"], string> = {
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

function ReceivableAmountCard({
  label,
  value,
  valueClassName,
  testId,
}: ReceivableAmountCardProps): JSX.Element {
  return (
    <div className="rounded-[1.45rem] border border-slate-200 bg-slate-100 px-4 py-3 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] lg:text-right">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        data-testid={testId}
        className={["mt-2 text-[1.7rem] leading-none font-bold tracking-tight md:text-[1.85rem]", valueClassName].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function DebtDetailDialog({
  customer,
  detail,
  isLoading,
  canRegisterPayment,
  canViewSensitiveNotes,
  paymentAmount,
  paymentNotes,
  isSubmitting,
  paymentRegisters,
  selectedPaymentRegisterId,
  onPaymentAmountChange,
  onPaymentNotesChange,
  onSelectedPaymentRegisterIdChange,
  onSubmitPayment,
  onClose,
}: DebtDetailDialogProps): JSX.Element {
  const { messages, formatCurrency, formatDateTime } = useI18n();
  const effectiveOutstanding = detail?.outstandingBalance ?? customer.outstandingBalance;
  const effectiveTotalDebt = detail?.totalDebtAmount ?? customer.totalDebtAmount;
  const effectiveTotalPaid = detail?.totalPaidAmount ?? customer.totalPaidAmount;
  const effectiveOpenOrders = detail?.openOrderCount ?? customer.openOrderCount;
  const effectiveLastActivityAt = detail?.lastActivityAt ?? customer.lastActivityAt;
  const pendingAmount = parseMonetaryInput(paymentAmount);
  const selectedPaymentRegister =
    paymentRegisters.find((register) => register.id === selectedPaymentRegisterId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="debt-detail-modal-title"
          data-testid="debt-detail-modal"
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[58rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="shrink-0 border-b border-slate-200/80 px-5 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(254,243,199,0.96))] text-amber-700">
                    <Wallet className="size-7" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {messages.shell.nav.receivables}
                      </p>
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.78rem] font-semibold text-amber-700">
                        {effectiveOpenOrders} {messages.receivables.openOrdersMetric.toLowerCase()}
                      </span>
                    </div>
                    <h3
                      id="debt-detail-modal-title"
                      className="mt-2 truncate text-[1.85rem] font-semibold tracking-tight text-slate-900 md:text-[2.1rem]"
                    >
                      {customer.customerName}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                        <CalendarDays className="size-4 text-slate-400" aria-hidden />
                        {messages.receivables.lastActivityLabel}:{" "}
                        {formatDateTime(effectiveLastActivityAt)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                        <ReceiptText className="size-4 text-slate-400" aria-hidden />
                        {effectiveOpenOrders}{" "}
                        {messages.receivables.openOrdersMetric.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.45rem] bg-slate-100 px-4 py-2.5 text-left lg:min-w-[13.5rem] lg:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {messages.common.labels.outstanding}
                </p>
                <p
                  data-testid="debt-outstanding-value"
                  className="mt-2 text-[1.85rem] leading-none font-bold tracking-tight text-amber-800 md:text-[1.95rem]"
                >
                  {formatCurrency(effectiveOutstanding)}
                </p>
              </div>
            </div>
          </header>

          <div className="min-h-0 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center rounded-[1.8rem] border border-slate-200 bg-white">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  <span className="text-sm font-semibold">
                    {messages.common.states.loading}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <ReceivableAmountCard
                    label={messages.receivables.debtIssuedLabel}
                    value={formatCurrency(effectiveTotalDebt)}
                    valueClassName="text-slate-900"
                  />
                  <ReceivableAmountCard
                    label={messages.common.labels.collected}
                    value={formatCurrency(effectiveTotalPaid)}
                    valueClassName="text-emerald-800"
                  />
                  <ReceivableAmountCard
                    label={messages.common.labels.outstanding}
                    value={formatCurrency(effectiveOutstanding)}
                    valueClassName="text-amber-800"
                  />
                </div>

                {canRegisterPayment ? (
                  <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {messages.receivables.registerPaymentTitle}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          {messages.receivables.registerPaymentHelp}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">
                        {messages.receivables.summaryCustomer(customer.customerName)}
                      </p>
                    </div>

                    {paymentRegisters.length > 0 ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-700">
                            {messages.sales.cashSession.registerLabel}
                          </span>
                          <select
                            data-testid="debt-payment-register-select"
                            value={selectedPaymentRegisterId}
                            onChange={(event) =>
                              onSelectedPaymentRegisterIdChange(event.target.value)
                            }
                            disabled={isSubmitting || isLoading}
                            className="min-h-[3.4rem] rounded-2xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {paymentRegisters.map((register) => (
                              <option key={register.id} value={register.id}>
                                {register.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            {messages.receivables.cashRegisterExpectedLabel}
                          </p>
                          <p
                            data-testid="debt-payment-register-expected-value"
                            className="mt-2 text-[1.4rem] leading-none font-bold tracking-tight text-emerald-800"
                          >
                            {selectedPaymentRegister?.activeSession
                              ? formatCurrency(
                                  selectedPaymentRegister.activeSession
                                    .expectedBalanceAmount,
                                )
                              : messages.receivables.noActiveCashRegister}
                          </p>
                          {selectedPaymentRegister ? (
                            <p className="mt-2 text-sm font-medium text-emerald-800/80">
                              {messages.receivables.cashRegisterContext(
                                selectedPaymentRegister.name,
                              )}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                        {messages.receivables.cashRegisterUnavailableHint}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
                    {messages.accessControl.receivablesReadOnlyHint}
                  </div>
                )}

                <section className="mt-4 rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
                  <div className="border-b border-slate-200 px-4 py-4">
                    <p className="text-[1.2rem] font-semibold tracking-tight text-slate-900">
                      {messages.receivables.pendingOrdersTitle}
                    </p>
                  </div>

                  <div className="space-y-3 p-4">
                    {detail && detail.orders.length > 0 ? (
                      detail.orders.map((order) => (
                        <article
                          key={order.orderId}
                          data-testid={`debt-order-entry-${order.orderId}`}
                          className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[1.05rem] font-semibold tracking-tight text-slate-900">
                                  {order.createdAt
                                    ? messages.receivables.orderTitle(
                                        formatDateTime(order.createdAt),
                                      )
                                    : messages.common.paymentMethods.onAccountSale}
                                </p>
                                <span
                                  className={[
                                    "inline-flex rounded-full border px-3 py-1 text-[0.78rem] font-semibold",
                                    paymentStatusBadgeClass(
                                      order.outstandingAmount,
                                      order.amountPaid,
                                    ),
                                  ].join(" ")}
                                >
                                  {order.outstandingAmount <= 0
                                    ? messages.common.paymentStatuses.paid
                                    : order.amountPaid > 0
                                      ? messages.common.paymentStatuses.partial
                                      : messages.common.paymentStatuses.pending}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                {order.createdAt ? (
                                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                                    <CalendarDays
                                      className="size-4 text-slate-400"
                                      aria-hidden
                                    />
                                    {formatDateTime(order.createdAt)}
                                  </span>
                                ) : null}
                                {typeof order.itemCount === "number" ? (
                                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                                    <ReceiptText
                                      className="size-4 text-slate-400"
                                      aria-hidden
                                    />
                                    {order.itemCount}{" "}
                                    {messages.common.labels.items.toLowerCase()}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3 lg:min-w-[28rem]">
                              <ReceivableAmountCard
                                label={messages.receivables.debtIssuedLabel}
                                value={formatCompactCurrency(order.totalAmount, formatCurrency)}
                                valueClassName="text-slate-900"
                              />
                              <ReceivableAmountCard
                                label={messages.common.labels.collected}
                                value={formatCompactCurrency(order.amountPaid, formatCurrency)}
                                valueClassName="text-emerald-800"
                              />
                              <ReceivableAmountCard
                                label={messages.common.labels.outstanding}
                                value={formatCompactCurrency(order.outstandingAmount, formatCurrency)}
                                valueClassName="text-amber-800"
                              />
                            </div>
                          </div>

                          {order.saleItems.length > 0 ? (
                            <ul className="mt-4 space-y-3 border-t border-slate-200/80 pt-4">
                              {order.saleItems.map((item) => (
                                <li
                                  key={`${order.orderId}-${item.productId}`}
                                  data-testid={`debt-order-item-${order.orderId}-${item.productId}`}
                                  className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="flex size-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] bg-slate-100">
                                      {item.productImageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- Debt detail cards reuse stored product images and approved external URLs from catalog-managed products.
                                        <img
                                          src={item.productImageUrl}
                                          alt={
                                            item.productName ??
                                            messages.common.fallbacks.unknownProduct
                                          }
                                          loading="lazy"
                                          className="h-full w-full object-contain"
                                        />
                                      ) : (
                                        <Package
                                          className="size-7 text-slate-300"
                                          aria-hidden
                                        />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="text-[1rem] font-semibold tracking-tight text-slate-900">
                                        {item.productName ??
                                          messages.common.fallbacks.unknownProduct}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-600">
                                          {item.quantity} x {formatCurrency(item.unitPrice)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        {messages.common.labels.subtotal}
                                      </p>
                                      <p className="mt-2 text-[1.3rem] leading-none font-bold tracking-tight text-slate-900">
                                        {formatCurrency(item.lineTotal)}
                                      </p>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                        {messages.receivables.noPendingOrders}
                      </div>
                    )}
                  </div>
                </section>

                <section className="mt-4 rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
                  <div className="border-b border-slate-200 px-4 py-4">
                    <p className="text-[1.2rem] font-semibold tracking-tight text-slate-900">
                      {messages.receivables.debtLedger}
                    </p>
                  </div>

                  <ul className="space-y-3 p-4">
                    {detail && detail.ledger.length > 0 ? (
                      detail.ledger.map((entry) => (
                        <li
                          key={entry.entryId}
                          data-testid={`debt-ledger-entry-${entry.entryId}`}
                          className={[
                            "rounded-[1.35rem] border px-4 py-3",
                            entry.entryType === "debt"
                              ? "border-amber-200 bg-amber-50/80"
                              : "border-emerald-200 bg-emerald-50/80",
                          ].join(" ")}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p
                                className={[
                                  "text-sm font-semibold",
                                  entry.entryType === "debt"
                                    ? "text-amber-900"
                                    : "text-emerald-900",
                                ].join(" ")}
                              >
                                {messages.receivables.ledgerEntryType[entry.entryType]} •{" "}
                                {formatCurrency(entry.amount)}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {formatDateTime(entry.occurredAt)}
                              </p>
                              {canViewSensitiveNotes && entry.notes ? (
                                <p className="mt-2 text-sm text-slate-700">{entry.notes}</p>
                              ) : null}
                            </div>
                            {entry.orderId ? (
                              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                                {messages.common.paymentMethods.onAccountSale}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
                        {messages.receivables.noLedgerEntries}
                      </li>
                    )}
                  </ul>
                </section>
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200/80 bg-[#fbfbfc] px-5 py-4 md:px-6">
            {canRegisterPayment ? (
              <form
                className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_auto_auto]"
                onSubmit={onSubmitPayment}
              >
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {messages.common.labels.paymentAmount}
                  </span>
                  <input
                    data-testid="debt-payment-amount-input"
                    type="number"
                    min="0.01"
                    max={
                      Number.isFinite(pendingAmount)
                        ? effectiveOutstanding.toFixed(2)
                        : undefined
                    }
                    step="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(event) => onPaymentAmountChange(event.target.value)}
                    disabled={isSubmitting || isLoading || effectiveOutstanding <= 0}
                    className="min-h-[3.4rem] rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {messages.common.labels.notesOptional}
                  </span>
                  <input
                    data-testid="debt-payment-notes-input"
                    value={paymentNotes}
                    onChange={(event) => onPaymentNotesChange(event.target.value)}
                    disabled={isSubmitting || isLoading}
                    className="min-h-[3.4rem] rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="mt-auto min-h-[3.4rem] rounded-2xl border border-slate-300 px-6 text-base font-semibold text-slate-700"
                >
                  {messages.common.actions.cancel}
                </button>

                <button
                  data-testid="debt-register-payment-button"
                  type="submit"
                  disabled={isSubmitting || isLoading || effectiveOutstanding <= 0}
                  className="mt-auto min-h-[3.4rem] rounded-2xl bg-blue-600 px-6 text-base font-semibold text-white shadow-[0_16px_28px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
                >
                  {isSubmitting
                    ? messages.common.states.registering
                    : messages.common.actions.registerPayment}
                </button>
              </form>
            ) : (
              <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-600">
                {messages.accessControl.readOnlyWorkspaceHint}
              </div>
            )}
          </div>

          <FloatingModalCloseButton
            onClick={onClose}
            testId="debt-detail-modal-close-button"
            ariaLabel={messages.common.actions.close}
          />
        </div>
      </div>
    </div>
  );
}

export function DebtManagementPanel({
  refreshToken,
  canRegisterPayment = true,
  canViewSensitiveNotes = true,
  preferredCashRegisterId,
}: DebtManagementPanelProps): JSX.Element {
  const { messages, formatCurrency, formatDateTime } = useI18n();
  const [receivables, setReceivables] = useState<readonly ReceivableSnapshotItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activityStart, setActivityStart] = useState<string>("");
  const [activityEnd, setActivityEnd] = useState<string>("");
  const [pendingOrdersFilter, setPendingOrdersFilter] =
    useState<PendingOrdersFilter>("all");
  const [sortBy, setSortBy] = useState<ReceivablesSortBy>("outstanding_desc");
  const [activeCustomer, setActiveCustomer] = useState<ReceivableSnapshotItem | null>(null);
  const [activeCustomerDetail, setActiveCustomerDetail] =
    useState<CustomerDebtSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [paymentRegisters, setPaymentRegisters] = useState<
    readonly CashRegisterListItemDTO[]
  >([]);
  const [selectedPaymentRegisterId, setSelectedPaymentRegisterId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const publishFeedback = useCallback(
    ({
      tone,
      message,
      title,
    }: {
      readonly tone: FeedbackTone;
      readonly message: string;
      readonly title?: string;
    }): void => {
      const payload = {
        title,
        description: message,
        testId: "debt-feedback",
      };

      if (tone === "error") {
        showErrorToast(payload);
        return;
      }

      if (tone === "success") {
        showSuccessToast(payload);
        return;
      }

      showInfoToast(payload);
    },
    [],
  );

  const refreshPendingSyncCount = useCallback((): void => {
    setPendingSyncCount(getPendingOfflineSyncCount());
  }, []);

  const loadReceivablesSnapshot = useCallback(async (): Promise<readonly ReceivableSnapshotItem[]> => {
    setIsLoading(true);

    try {
      const { response, data } = await fetchJsonNoStore<
        ReceivablesSnapshotResponse | ApiErrorPayload
      >("/api/v1/receivables");

      if (!response.ok || !data) {
        throw new Error(resolveApiMessage(data, messages.receivables.loadSnapshotError));
      }

      const items = (data as ReceivablesSnapshotResponse).items;
      setReceivables(items);
      return items;
    } catch (error: unknown) {
      publishFeedback({
        tone: "error",
        title: "No se pudo cargar deudas",
        message:
          error instanceof Error ? error.message : messages.receivables.loadSnapshotError,
      });
      setReceivables([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [messages.receivables.loadSnapshotError, publishFeedback]);

  const loadCustomerDetail = useCallback(
    async (
      customerId: string,
      _options: { readonly preserveFeedback?: boolean } = {},
    ): Promise<CustomerDebtSummary | null> => {
      setIsDetailLoading(true);

      try {
        const { response, data } = await fetchJsonNoStore<CustomerDebtSummary | ApiErrorPayload>(
          `/api/v1/customers/${encodeURIComponent(customerId)}/debt`,
        );

        if (!response.ok || !data) {
          throw new Error(resolveApiMessage(data, messages.receivables.loadSummaryError));
        }

        const detail = data as CustomerDebtSummary;
        setActiveCustomerDetail(detail);
        return detail;
      } catch (error: unknown) {
        publishFeedback({
          tone: "error",
          title: "No se pudo cargar el detalle",
          message:
            error instanceof Error ? error.message : messages.receivables.loadSummaryError,
        });
        setActiveCustomerDetail(null);
        return null;
      } finally {
        setIsDetailLoading(false);
      }
    },
    [messages.receivables.loadSummaryError, publishFeedback],
  );

  const loadPaymentRegisters = useCallback(async (): Promise<void> => {
    if (!canRegisterPayment) {
      setPaymentRegisters([]);
      setSelectedPaymentRegisterId("");
      return;
    }

    try {
      const { response, data } = await fetchJsonNoStore<unknown>("/api/v1/cash-registers");
      if (!response.ok || !data) {
        setPaymentRegisters([]);
        setSelectedPaymentRegisterId("");
        return;
      }

      const parsed = listCashRegistersResponseDTOSchema.safeParse(data);
      if (!parsed.success) {
        setPaymentRegisters([]);
        setSelectedPaymentRegisterId("");
        return;
      }

      const activeRegisters = parsed.data.items.filter(
        (register) => register.activeSession !== null,
      );
      setPaymentRegisters(activeRegisters);
      setSelectedPaymentRegisterId((current) => {
        if (activeRegisters.some((register) => register.id === current)) {
          return current;
        }

        if (
          preferredCashRegisterId &&
          activeRegisters.some((register) => register.id === preferredCashRegisterId)
        ) {
          return preferredCashRegisterId;
        }

        return activeRegisters[0]?.id ?? "";
      });
    } catch {
      setPaymentRegisters([]);
      setSelectedPaymentRegisterId("");
    }
  }, [canRegisterPayment, preferredCashRegisterId]);

  const retryOfflineSync = useCallback(async () => {
    const result = await flushOfflineSyncQueue();
    refreshPendingSyncCount();

    if (result.synced > 0 && result.failed === 0 && result.pending === 0) {
      publishFeedback({
        tone: "success",
        title: "Sincronización completada",
        message: messages.common.feedback.offlineSyncSuccess,
      });

      await loadReceivablesSnapshot();
      if (activeCustomer) {
        await loadCustomerDetail(activeCustomer.customerId);
      }
      return;
    }

    if (result.failed > 0 || result.pending > 0) {
      publishFeedback({
        tone: "error",
        title: "Sincronización pendiente",
        message: messages.common.feedback.offlineSyncPending,
      });
    }
  }, [
    activeCustomer,
    loadCustomerDetail,
    loadReceivablesSnapshot,
    messages.common.feedback.offlineSyncPending,
    messages.common.feedback.offlineSyncSuccess,
    publishFeedback,
    refreshPendingSyncCount,
  ]);

  const handleOpenCustomer = useCallback(
    (customer: ReceivableSnapshotItem): void => {
      setActiveCustomer(customer);
      setActiveCustomerDetail(null);
      setPaymentAmount("");
      setPaymentNotes("");
      void loadCustomerDetail(customer.customerId);
      void loadPaymentRegisters();
    },
    [loadCustomerDetail, loadPaymentRegisters],
  );

  const handleCloseCustomer = useCallback((): void => {
    if (isSubmitting) {
      return;
    }

    setActiveCustomer(null);
    setActiveCustomerDetail(null);
    setPaymentAmount("");
    setPaymentNotes("");
    setPaymentRegisters([]);
    setSelectedPaymentRegisterId("");
  }, [isSubmitting]);

  useEffect(() => {
    void loadReceivablesSnapshot();
  }, [loadReceivablesSnapshot, refreshToken]);

  useEffect(() => {
    refreshPendingSyncCount();
    const onOnline = (): void => {
      void retryOfflineSync();
    };

    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [refreshPendingSyncCount, retryOfflineSync]);

  useEffect(() => {
    if (!activeCustomer) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSubmitting) {
        handleCloseCustomer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeCustomer, handleCloseCustomer, isSubmitting]);

  const visibleReceivables = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("es");
    const filtered = receivables.filter((item) => {
      if (
        normalizedQuery.length > 0 &&
        !item.customerName.toLocaleLowerCase("es").includes(normalizedQuery)
      ) {
        return false;
      }

      const activityDate = toDateInputValue(item.lastActivityAt);
      if (activityStart && activityDate < activityStart) {
        return false;
      }

      if (activityEnd && activityDate > activityEnd) {
        return false;
      }

      if (pendingOrdersFilter === "single" && item.openOrderCount !== 1) {
        return false;
      }

      if (pendingOrdersFilter === "multiple" && item.openOrderCount < 2) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "customer_asc") {
        return left.customerName.localeCompare(right.customerName, "es");
      }

      if (sortBy === "recent_desc") {
        return (
          new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime()
        );
      }

      if (right.outstandingBalance !== left.outstandingBalance) {
        return right.outstandingBalance - left.outstandingBalance;
      }

      return left.customerName.localeCompare(right.customerName, "es");
    });
  }, [activityEnd, activityStart, pendingOrdersFilter, receivables, searchQuery, sortBy]);

  const totalOutstanding = useMemo(
    () => visibleReceivables.reduce((sum, item) => sum + item.outstandingBalance, 0),
    [visibleReceivables],
  );
  const totalOpenOrders = useMemo(
    () => visibleReceivables.reduce((sum, item) => sum + item.openOrderCount, 0),
    [visibleReceivables],
  );
  const averageOutstanding = useMemo(() => {
    if (visibleReceivables.length === 0) {
      return 0;
    }

    return Number((totalOutstanding / visibleReceivables.length).toFixed(2));
  }, [totalOutstanding, visibleReceivables.length]);

  async function handleRegisterPayment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!canRegisterPayment) {
      publishFeedback({
        tone: "error",
        title: "Acción restringida",
        message: messages.accessControl.receivablesReadOnlyHint,
      });
      return;
    }

    if (!activeCustomer) {
      publishFeedback({
        tone: "error",
        title: "Falta seleccionar un cliente",
        message: messages.receivables.selectCustomerFirst,
      });
      return;
    }

    const parsedAmount = parseMonetaryInput(paymentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      publishFeedback({
        tone: "error",
        title: "Monto inválido",
        message: messages.receivables.invalidPaymentAmount,
      });
      return;
    }

    setIsSubmitting(true);

    const paymentPayload = {
      customerId: activeCustomer.customerId,
      amount: Number(parsedAmount.toFixed(2)),
      paymentMethod: "cash" as const,
      cashRegisterId: selectedPaymentRegisterId || undefined,
      notes: paymentNotes.trim() || undefined,
    };

    try {
      const response = await fetch("/api/v1/debt-payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(paymentPayload),
      });

      const payload = (await response.json()) as DebtPaymentResponse | ApiErrorPayload;

      if (!response.ok) {
        publishFeedback({
          tone: "error",
          title: "No se pudo registrar el pago",
          message: resolveApiMessage(payload, messages.receivables.registerPaymentError),
        });
        return;
      }

      publishFeedback({
        tone: "success",
        title: "Pago registrado",
        message: messages.receivables.registerPaymentSuccess(
          formatCurrency((payload as DebtPaymentResponse).amount),
        ),
      });
      setPaymentAmount("");
      setPaymentNotes("");
      await loadPaymentRegisters();

      const updatedItems = await loadReceivablesSnapshot();
      const updatedCustomer =
        updatedItems.find((item) => item.customerId === activeCustomer.customerId) ??
        activeCustomer;
      setActiveCustomer(updatedCustomer);
      await loadCustomerDetail(activeCustomer.customerId, { preserveFeedback: true });
      refreshPendingSyncCount();
    } catch {
      enqueueOfflineSyncEvent({
        eventType: "debt_payment_registered",
        payload: paymentPayload,
        idempotencyKey: `debt-payment-offline-${crypto.randomUUID()}`,
      });
      refreshPendingSyncCount();
      setPaymentAmount("");
      setPaymentNotes("");
      publishFeedback({
        tone: "info",
        title: "Pago guardado offline",
        message: messages.receivables.saveOfflineSuccess,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] lg:p-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-[52rem]">
            <h2 className="text-[2.4rem] font-semibold leading-[0.94] tracking-tight text-slate-900 sm:text-[2.8rem]">
              {messages.receivables.title}
            </h2>
            <p className="mt-3 max-w-[48rem] text-[1.05rem] leading-7 text-slate-500">
              {messages.receivables.subtitle}
            </p>
          </div>

          <button
            data-testid="debt-refresh-candidates-button"
            type="button"
            onClick={() => {
              void loadReceivablesSnapshot();
            }}
            disabled={isLoading}
            className="inline-flex min-h-[3.85rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[1rem] font-semibold text-white shadow-[0_16px_24px_rgba(30,98,227,0.32)] disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? messages.common.states.refreshing : messages.common.actions.refresh}
          </button>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.75fr)]">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {messages.common.labels.customer}
            </span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                data-testid="debt-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={messages.receivables.searchPlaceholder}
                className="min-h-[3.85rem] w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-[1.05rem] font-medium text-slate-800 outline-none transition focus:border-blue-400"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {messages.receivables.lastActivityFromLabel}
            </span>
            <input
              data-testid="debt-activity-start-input"
              type="date"
              value={activityStart}
              onChange={(event) => setActivityStart(event.target.value)}
              className="min-h-[3.85rem] rounded-2xl border border-slate-300 bg-white px-4 text-[1.05rem] font-medium text-slate-800 outline-none transition focus:border-blue-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {messages.receivables.lastActivityToLabel}
            </span>
            <input
              data-testid="debt-activity-end-input"
              type="date"
              value={activityEnd}
              onChange={(event) => setActivityEnd(event.target.value)}
              className="min-h-[3.85rem] rounded-2xl border border-slate-300 bg-white px-4 text-[1.05rem] font-medium text-slate-800 outline-none transition focus:border-blue-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {messages.receivables.pendingOrdersFilterLabel}
            </span>
            <select
              data-testid="debt-open-orders-filter"
              value={pendingOrdersFilter}
              onChange={(event) =>
                setPendingOrdersFilter(event.target.value as PendingOrdersFilter)
              }
              className="min-h-[3.85rem] rounded-2xl border border-slate-300 bg-white px-4 text-[1.05rem] font-medium text-slate-800 outline-none transition focus:border-blue-400"
            >
              <option value="all">{messages.receivables.pendingOrdersFilterOption.all}</option>
              <option value="single">
                {messages.receivables.pendingOrdersFilterOption.single}
              </option>
              <option value="multiple">
                {messages.receivables.pendingOrdersFilterOption.multiple}
              </option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {messages.receivables.sortByLabel}
            </span>
            <select
              data-testid="debt-sort-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as ReceivablesSortBy)}
              className="min-h-[3.85rem] rounded-2xl border border-slate-300 bg-white px-4 text-[1.05rem] font-medium text-slate-800 outline-none transition focus:border-blue-400"
            >
              <option value="outstanding_desc">
                {messages.receivables.sortByOption.outstanding}
              </option>
              <option value="recent_desc">{messages.receivables.sortByOption.recent}</option>
              <option value="customer_asc">
                {messages.receivables.sortByOption.customer}
              </option>
            </select>
          </label>
        </div>
      </header>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReceivablesMetricCard
          label={messages.receivables.debtorsMetric}
          value={String(visibleReceivables.length)}
          testId="debt-summary-total-customers"
          tone="neutral"
        />
        <ReceivablesMetricCard
          label={messages.receivables.moneyInStreetMetric}
          value={formatCurrency(totalOutstanding)}
          testId="debt-summary-total-outstanding"
          tone="amber"
        />
        <ReceivablesMetricCard
          label={messages.receivables.openOrdersMetric}
          value={String(totalOpenOrders)}
          testId="debt-summary-open-orders"
          tone="blue"
        />
        <ReceivablesMetricCard
          label={messages.receivables.averageBalanceMetric}
          value={formatCurrency(averageOutstanding)}
          testId="debt-summary-average-outstanding"
          tone="emerald"
        />
      </section>

      {pendingSyncCount > 0 ? (
        <div className="mt-4 flex flex-col gap-3 rounded-[1.6rem] border border-amber-200 bg-amber-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {messages.receivables.pendingSyncTitle}
            </p>
            <p className="mt-1 text-sm text-amber-900/80">
              {messages.receivables.pendingSyncDescription(pendingSyncCount)}
            </p>
          </div>
          <button
            data-testid="debt-retry-offline-sync-button"
            type="button"
            onClick={() => {
              void retryOfflineSync();
            }}
            className="min-h-11 rounded-2xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900"
          >
            {messages.common.actions.retryOfflineSync}
          </button>
        </div>
      ) : null}

      <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-4 py-4 lg:px-5">
          <p className="text-[1.4rem] font-semibold tracking-tight text-slate-900">
            {messages.receivables.customerListTitle}
          </p>
        </div>

        <ul className="max-h-[40rem] space-y-4 overflow-y-auto p-4 [scrollbar-gutter:stable] lg:p-5">
          {visibleReceivables.map((customer) => (
            <li key={customer.customerId}>
              <button
                type="button"
                data-testid={`debt-customer-card-${customer.customerId}`}
                onClick={() => handleOpenCustomer(customer)}
                className="w-full rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.95))] px-4 py-4 text-left shadow-[0_16px_30px_rgba(15,23,42,0.06)] transition hover:border-blue-300 hover:shadow-[0_18px_32px_rgba(15,23,42,0.1)] md:px-5 md:py-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(254,243,199,0.96))] text-amber-700">
                        <Users className="size-7" aria-hidden />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[1.35rem] font-semibold leading-tight tracking-tight text-slate-900 md:text-[1.5rem]">
                          {customer.customerName}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                            <CalendarDays className="size-4 text-slate-400" aria-hidden />
                            {messages.receivables.lastActivityLabel}:{" "}
                            {formatDateTime(customer.lastActivityAt)}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                            <ReceiptText className="size-4 text-slate-400" aria-hidden />
                            {customer.openOrderCount}{" "}
                            {messages.receivables.openOrdersMetric.toLowerCase()}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {messages.receivables.debtIssuedLabel}
                            </p>
                            <p className="mt-1 text-[1.05rem] font-semibold tracking-tight text-slate-900">
                              {formatCompactCurrency(customer.totalDebtAmount, formatCurrency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {messages.common.labels.collected}
                            </p>
                            <p className="mt-1 text-[1.05rem] font-semibold tracking-tight text-emerald-800">
                              {formatCompactCurrency(customer.totalPaidAmount, formatCurrency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full xl:w-auto xl:min-w-[13rem]">
                    <ReceivableAmountCard
                      label={messages.common.labels.outstanding}
                      value={formatCompactCurrency(customer.outstandingBalance, formatCurrency)}
                      valueClassName="text-amber-800"
                      testId={`debt-customer-card-outstanding-${customer.customerId}`}
                    />
                  </div>
                </div>
              </button>
            </li>
          ))}

          {visibleReceivables.length === 0 ? (
            <li className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <Wallet className="mx-auto size-10 text-slate-300" aria-hidden />
              <p className="mt-4 text-[1.1rem] font-semibold text-slate-700">
                {receivables.length === 0
                  ? messages.receivables.noDebtors
                  : messages.receivables.noDebtorsForFilters}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {messages.receivables.createDebtHint}
              </p>
            </li>
          ) : null}
        </ul>
      </section>

      {activeCustomer ? (
        <DebtDetailDialog
          customer={activeCustomer}
          detail={activeCustomerDetail}
          isLoading={isDetailLoading}
          canRegisterPayment={canRegisterPayment}
          canViewSensitiveNotes={canViewSensitiveNotes}
          paymentAmount={paymentAmount}
          paymentNotes={paymentNotes}
          isSubmitting={isSubmitting}
          paymentRegisters={paymentRegisters}
          selectedPaymentRegisterId={selectedPaymentRegisterId}
          onPaymentAmountChange={setPaymentAmount}
          onPaymentNotesChange={setPaymentNotes}
          onSelectedPaymentRegisterIdChange={setSelectedPaymentRegisterId}
          onSubmitPayment={handleRegisterPayment}
          onClose={handleCloseCustomer}
        />
      ) : null}
    </article>
  );
}
