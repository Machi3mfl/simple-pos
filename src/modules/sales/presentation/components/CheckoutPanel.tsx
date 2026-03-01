"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import type { PaymentMethodDTO } from "../dtos/create-sale.dto";
import {
  enqueueOfflineSyncEvent,
  flushOfflineSyncQueue,
  getPendingOfflineSyncCount,
} from "@/modules/sync/presentation/offline/offlineSyncQueue";

export interface CheckoutOrderItem {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
  readonly emoji: string;
}

interface CheckoutPanelProps {
  readonly items: readonly CheckoutOrderItem[];
  readonly subtotal: number;
  readonly onIncreaseQuantity: (productId: string) => void;
  readonly onDecreaseQuantity: (productId: string) => void;
  readonly onCheckoutSuccess: () => void;
}

interface CheckoutApiError {
  readonly code?: string;
  readonly message?: string;
}

interface CheckoutSuccessPayload {
  readonly paymentMethod?: PaymentMethodDTO;
  readonly customerId?: string;
  readonly amountPaid?: number;
  readonly outstandingAmount?: number;
}

function currency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function resolveCheckoutError(errorBody: unknown): string {
  if (
    typeof errorBody === "object" &&
    errorBody !== null &&
    "message" in errorBody &&
    typeof (errorBody as CheckoutApiError).message === "string"
  ) {
    return (errorBody as CheckoutApiError).message as string;
  }

  return "No se pudo completar la venta. Reintentá.";
}

function parseMonetaryInput(rawValue: string): number {
  const normalizedValue = rawValue.trim().replace(",", ".");
  if (normalizedValue.length === 0) {
    return 0;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

export function CheckoutPanel({
  items,
  subtotal,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onCheckoutSuccess,
}: CheckoutPanelProps): JSX.Element {
  const { messages } = useI18n();
  const total = subtotal;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodDTO>("cash");
  const [customerName, setCustomerName] = useState<string>("");
  const [cashReceivedAmount, setCashReceivedAmount] = useState<string>("");
  const [onAccountInitialPaymentAmount, setOnAccountInitialPaymentAmount] =
    useState<string>("");
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const cashReceivedValue = useMemo(
    () => parseMonetaryInput(cashReceivedAmount),
    [cashReceivedAmount],
  );
  const effectiveCashReceivedValue = useMemo(() => {
    if (cashReceivedAmount.trim().length === 0) {
      return total;
    }

    return cashReceivedValue;
  }, [cashReceivedAmount, cashReceivedValue, total]);
  const onAccountInitialPaymentValue = useMemo(
    () => parseMonetaryInput(onAccountInitialPaymentAmount),
    [onAccountInitialPaymentAmount],
  );
  const cashMissingAmount = useMemo(() => {
    if (!Number.isFinite(effectiveCashReceivedValue)) {
      return total;
    }

    return Math.max(0, Number((total - effectiveCashReceivedValue).toFixed(2)));
  }, [effectiveCashReceivedValue, total]);
  const cashChangeDue = useMemo(() => {
    if (
      !Number.isFinite(effectiveCashReceivedValue) ||
      effectiveCashReceivedValue <= total
    ) {
      return 0;
    }

    return Number((effectiveCashReceivedValue - total).toFixed(2));
  }, [effectiveCashReceivedValue, total]);
  const onAccountRemainingAmount = useMemo(() => {
    if (!Number.isFinite(onAccountInitialPaymentValue)) {
      return total;
    }

    return Math.max(0, Number((total - onAccountInitialPaymentValue).toFixed(2)));
  }, [onAccountInitialPaymentValue, total]);

  const resetPaymentInputs = useCallback((): void => {
    setCashReceivedAmount("");
    setOnAccountInitialPaymentAmount("");
    setCustomerName("");
    setPaymentMethod("cash");
  }, []);

  const refreshPendingSyncCount = useCallback(() => {
    setPendingSyncCount(getPendingOfflineSyncCount());
  }, []);

  const retryOfflineSync = useCallback(async () => {
    const result = await flushOfflineSyncQueue();
    refreshPendingSyncCount();

    if (result.synced > 0 && result.failed === 0 && result.pending === 0) {
      setIsError(false);
      setFeedback(messages.common.feedback.offlineSyncSuccess);
      return;
    }

    if (result.failed > 0 || result.pending > 0) {
      setIsError(true);
      setFeedback(messages.common.feedback.offlineSyncPending);
    }
  }, [messages.common.feedback.offlineSyncPending, messages.common.feedback.offlineSyncSuccess, refreshPendingSyncCount]);

  useEffect(() => {
    refreshPendingSyncCount();

    void retryOfflineSync();

    const onOnline = (): void => {
      void retryOfflineSync();
    };

    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [refreshPendingSyncCount, retryOfflineSync]);

  useEffect(() => {
    if (!isPaymentSheetOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSubmitting) {
        setIsPaymentSheetOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPaymentSheetOpen, isSubmitting]);

  async function submitCheckout(): Promise<void> {
    setFeedback(null);

    if (items.length === 0) {
      setIsError(true);
      setFeedback(messages.sales.checkout.addItemFirst);
      return;
    }

    if (paymentMethod === "cash") {
      if (!Number.isFinite(effectiveCashReceivedValue)) {
        setIsError(true);
        setFeedback(messages.sales.checkout.invalidCustomerPayment);
        return;
      }

      if (effectiveCashReceivedValue < total) {
        setIsError(true);
        setFeedback(messages.sales.checkout.cashMustCoverTotal);
        return;
      }
    }

    if (paymentMethod === "on_account" && customerName.trim().length < 2) {
      setIsError(true);
      setFeedback(messages.sales.checkout.onAccountCustomerRequired);
      return;
    }

    const initialPaymentAmount = Number.isFinite(onAccountInitialPaymentValue)
      ? Number(onAccountInitialPaymentValue.toFixed(2))
      : Number.NaN;

    if (paymentMethod === "on_account") {
      if (!Number.isFinite(initialPaymentAmount) || initialPaymentAmount < 0) {
        setIsError(true);
        setFeedback(messages.sales.checkout.initialPaymentInvalid);
        return;
      }

      if (initialPaymentAmount >= total) {
        setIsError(true);
        setFeedback(messages.sales.checkout.initialPaymentUseCash);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          paymentMethod,
          ...(paymentMethod === "on_account"
            ? {
                customerName: customerName.trim(),
                ...(initialPaymentAmount > 0
                  ? { initialPaymentAmount }
                  : {}),
              }
            : {}),
        }),
      });

      const responseData = (await response.json()) as unknown;
      if (!response.ok) {
        setIsError(true);
        setFeedback(resolveCheckoutError(responseData));
        return;
      }

      const successPayload = responseData as CheckoutSuccessPayload;
      const successMessageParts: string[] = [messages.sales.checkout.checkoutSuccess];

      if (successPayload.paymentMethod === "cash") {
        successMessageParts.push(
          messages.sales.checkout.changeDueMessage(currency(cashChangeDue)),
        );
      }

      if (successPayload.paymentMethod === "on_account") {
        successMessageParts.push(
          messages.sales.checkout.customerAssignedMessage(customerName.trim()),
        );
        successMessageParts.push(
          messages.sales.checkout.remainingOnAccountMessage(
            currency(successPayload.outstandingAmount ?? onAccountRemainingAmount),
          ),
        );
      }

      setIsError(false);
      setFeedback(successMessageParts.join(" "));
      setIsPaymentSheetOpen(false);
      resetPaymentInputs();
      onCheckoutSuccess();
    } catch {
      enqueueOfflineSyncEvent({
        eventType: "sale_created",
        payload: {
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          paymentMethod,
          customerName: paymentMethod === "on_account" ? customerName.trim() : undefined,
          initialPaymentAmount:
            paymentMethod === "on_account" && initialPaymentAmount > 0
              ? initialPaymentAmount
              : undefined,
        },
        idempotencyKey: `sale-offline-${crypto.randomUUID()}`,
      });
      refreshPendingSyncCount();
      setIsError(false);
      setFeedback(messages.sales.checkout.saleSavedOffline);
      setIsPaymentSheetOpen(false);
      resetPaymentInputs();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-w-0 border-l border-slate-200 bg-[#f2f2f4] p-5 lg:flex lg:h-full lg:flex-col lg:p-6">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-[2.6rem] font-semibold leading-none tracking-tight text-slate-900">
          {messages.sales.checkout.orderListTitle}
        </h2>
      </header>

      <div className="mt-5 space-y-3 overflow-y-auto pr-1 pb-4 lg:min-h-0 lg:flex-1">
        {items.map((item) => (
          <article
            key={item.id}
            data-testid={`order-item-${item.id}`}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                <span aria-hidden>{item.emoji}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[1.03rem] leading-tight font-semibold tracking-tight text-slate-900">
                  {item.name}
                </p>
                <p className="mt-1 text-[0.88rem] text-slate-500">{currency(item.price)}</p>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDecreaseQuantity(item.id)}
                  className="flex size-8 items-center justify-center rounded-full border border-[#5f97f2] text-base font-semibold text-[#3f85ef]"
                  aria-label={messages.sales.checkout.decreaseAria(item.name)}
                >
                  -
                </button>
                <span className="w-6 text-center text-[1rem] font-semibold text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onIncreaseQuantity(item.id)}
                  className="flex size-8 items-center justify-center rounded-full bg-[#3f85ef] text-base font-semibold text-white"
                  aria-label={messages.sales.checkout.increaseAria(item.name)}
                >
                  +
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <footer className="sticky bottom-0 z-10 mt-4 rounded-2xl bg-[#f2f2f4] p-1">
        <div className="rounded-2xl bg-white p-4 shadow-[0_14px_22px_rgba(15,23,42,0.08)]">
          <div className="space-y-2 text-[0.92rem] text-slate-600">
            <div className="flex items-center justify-between">
              <span>{messages.common.labels.subtotal}</span>
              <span className="font-semibold text-slate-900">{currency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{messages.common.labels.items}</span>
              <span className="font-semibold text-slate-900">{itemCount}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-300 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[1.75rem] font-semibold text-slate-900">
                {messages.common.labels.total}
              </p>
              <p
                data-testid="checkout-total-value"
                className="text-[2.25rem] leading-none font-bold tracking-tight text-slate-900"
              >
                {currency(total)}
              </p>
            </div>

            <button
              data-testid="checkout-open-payment-button"
              type="button"
              disabled={items.length === 0}
              onClick={() => setIsPaymentSheetOpen(true)}
              className="mt-4 min-h-[54px] w-full rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.95rem] font-semibold text-white shadow-[0_16px_24px_rgba(30,98,227,0.4)] disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
            >
              {messages.common.actions.processPayment}
            </button>
          </div>
        </div>

        {feedback ? (
          <p
            data-testid="checkout-feedback"
            className={[
              "mt-3 rounded-xl px-3 py-2 text-sm font-medium",
              isError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {feedback}
          </p>
        ) : null}

        {pendingSyncCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              void retryOfflineSync();
            }}
            className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            {messages.sales.checkout.retryOfflineSyncButton(pendingSyncCount)}
          </button>
        ) : null}
      </footer>

      {isPaymentSheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          onClick={() => {
            if (!isSubmitting) {
              setIsPaymentSheetOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            className="w-full max-w-[34rem] rounded-[2rem] border border-slate-200 bg-[#fbfbfc] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.22)] lg:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  {messages.sales.checkout.paymentStepLabel}
                </p>
                <h3
                  id="checkout-modal-title"
                  className="mt-1 text-[1.8rem] font-semibold tracking-tight text-slate-900"
                >
                  {messages.sales.checkout.confirmPaymentTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {messages.sales.checkout.selectedItems(itemCount)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  {messages.common.labels.total}
                </p>
                <p className="mt-1 text-[2rem] leading-none font-bold tracking-tight text-slate-900">
                  {currency(total)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                {messages.common.labels.method}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  data-testid="checkout-payment-cash-button"
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={[
                    "min-h-[3.6rem] rounded-2xl px-4 text-lg font-semibold transition",
                    paymentMethod === "cash"
                      ? "bg-blue-500 text-white shadow-[0_12px_24px_rgba(59,130,246,0.32)]"
                      : "border border-slate-300 bg-white text-slate-700",
                  ].join(" ")}
                >
                  {messages.common.paymentMethods.cash}
                </button>
                <button
                  data-testid="checkout-payment-on-account-button"
                  type="button"
                  onClick={() => setPaymentMethod("on_account")}
                  className={[
                    "min-h-[3.6rem] rounded-2xl px-4 text-lg font-semibold transition",
                    paymentMethod === "on_account"
                      ? "bg-blue-500 text-white shadow-[0_12px_24px_rgba(59,130,246,0.32)]"
                      : "border border-slate-300 bg-white text-slate-700",
                  ].join(" ")}
                >
                  {messages.common.paymentMethods.on_account}
                </button>
              </div>
            </div>

            {paymentMethod === "cash" ? (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    {messages.common.labels.customerPays}
                  </span>
                  <input
                    data-testid="checkout-cash-received-input"
                    type="number"
                    min={total.toFixed(2)}
                    step="0.01"
                    placeholder={total.toFixed(2)}
                    value={cashReceivedAmount}
                    onChange={(event) => setCashReceivedAmount(event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 min-h-[3.7rem] w-full rounded-2xl border border-slate-300 px-4 text-lg text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                      {messages.common.labels.due}
                    </p>
                    <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-slate-900">
                      {currency(cashMissingAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.12em] text-emerald-700 uppercase">
                      {messages.common.labels.change}
                    </p>
                    <p
                      data-testid="checkout-change-due-value"
                      className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-emerald-800"
                    >
                      {currency(cashChangeDue)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    {messages.sales.checkout.customerNameLabel}
                  </span>
                  <input
                    data-testid="checkout-customer-name-input"
                    type="text"
                    placeholder={messages.common.placeholders.exampleCustomer}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 min-h-[3.7rem] w-full rounded-2xl border border-slate-300 px-4 text-lg text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    {messages.sales.checkout.onAccountInitialPaymentLabel}
                  </span>
                  <input
                    data-testid="checkout-on-account-initial-payment-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={onAccountInitialPaymentAmount}
                    onChange={(event) => setOnAccountInitialPaymentAmount(event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 min-h-[3.7rem] w-full rounded-2xl border border-slate-300 px-4 text-lg text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                      {messages.common.labels.paid}
                    </p>
                    <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-slate-900">
                      {currency(
                        Number.isFinite(onAccountInitialPaymentValue)
                          ? Math.max(0, onAccountInitialPaymentValue)
                          : 0,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.12em] text-amber-700 uppercase">
                      {messages.common.labels.remaining}
                    </p>
                    <p
                      data-testid="checkout-on-account-remaining-value"
                      className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-amber-800"
                    >
                      {currency(onAccountRemainingAmount)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                data-testid="checkout-cancel-payment-button"
                type="button"
                onClick={() => setIsPaymentSheetOpen(false)}
                disabled={isSubmitting}
                className="min-h-[3.5rem] rounded-2xl border border-slate-300 px-6 text-base font-semibold text-slate-700"
              >
                {messages.common.actions.cancel}
              </button>
              <button
                data-testid="checkout-confirm-payment-button"
                type="button"
                onClick={submitCheckout}
                disabled={isSubmitting}
                className="min-h-[3.5rem] rounded-2xl bg-blue-600 px-8 text-base font-semibold text-white shadow-[0_16px_28px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
              >
                {isSubmitting
                  ? messages.common.states.saving
                  : messages.common.actions.confirmPayment}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
