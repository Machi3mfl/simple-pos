"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  readonly discount: number;
  readonly tax: number;
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
}

function currency(amount: number): string {
  return `$${amount.toFixed(0)}`;
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

  return "Checkout failed. Try again.";
}

export function CheckoutPanel({
  items,
  subtotal,
  discount,
  tax,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onCheckoutSuccess,
}: CheckoutPanelProps): JSX.Element {
  const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodDTO>("cash");
  const [customerName, setCustomerName] = useState<string>("");
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const refreshPendingSyncCount = useCallback(() => {
    setPendingSyncCount(getPendingOfflineSyncCount());
  }, []);

  const retryOfflineSync = useCallback(async () => {
    const result = await flushOfflineSyncQueue();
    refreshPendingSyncCount();

    if (result.synced > 0 && result.failed === 0 && result.pending === 0) {
      setIsError(false);
      setFeedback("Offline events synced successfully.");
      return;
    }

    if (result.failed > 0 || result.pending > 0) {
      setIsError(true);
      setFeedback("Offline sync still has pending/failed events. Retry again.");
    }
  }, [refreshPendingSyncCount]);

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

  async function submitCheckout(): Promise<void> {
    setFeedback(null);

    if (items.length === 0) {
      setIsError(true);
      setFeedback("Add at least one product before checkout.");
      return;
    }

    if (paymentMethod === "on_account" && customerName.trim().length < 2) {
      setIsError(true);
      setFeedback("For on-account payment, assign a customer name first.");
      return;
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
            ? { customerName: customerName.trim() }
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
      const onAccountConfirmation =
        successPayload.paymentMethod === "on_account" && customerName.trim().length > 0
          ? ` Customer: ${customerName.trim()}.`
          : "";

      setIsError(false);
      setFeedback(`Checkout completed successfully.${onAccountConfirmation}`);
      setIsPaymentSheetOpen(false);
      onCheckoutSuccess();
      if (paymentMethod === "cash") {
        setCustomerName("");
      }
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
        },
        idempotencyKey: `sale-offline-${crypto.randomUUID()}`,
      });
      refreshPendingSyncCount();
      setIsError(false);
      setFeedback("Sale saved offline. Pending sync.");
      setIsPaymentSheetOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-w-0 border-l border-slate-200 bg-[#f2f2f4] p-5 lg:flex lg:h-full lg:flex-col lg:p-6">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-[2.6rem] font-semibold leading-none tracking-tight text-slate-900">
          Order List
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
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] text-slate-500">
                  <span aria-hidden>🗒️</span>
                  Add Notes
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDecreaseQuantity(item.id)}
                  className="flex size-8 items-center justify-center rounded-full border border-[#5f97f2] text-base font-semibold text-[#3f85ef]"
                  aria-label={`decrease ${item.name}`}
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
                  aria-label={`increase ${item.name}`}
                >
                  +
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <footer className="sticky bottom-0 z-10 mt-4 rounded-2xl bg-[#f2f2f4] p-1">
        <div className="space-y-2 text-[0.92rem] text-slate-600">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{currency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Disc</span>
            <span className="font-semibold text-slate-900">-{currency(discount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span className="font-semibold text-slate-900">-{currency(tax)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-300 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[1.75rem] font-semibold text-slate-900">Total</p>
            <p className="text-[2.25rem] leading-none font-bold tracking-tight text-slate-900">
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
            Process to Payment
          </button>
        </div>

        {isPaymentSheetOpen ? (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_16px_30px_rgba(15,23,42,0.12)]">
            <p className="text-sm font-semibold text-slate-700">Select Payment Method</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                data-testid="checkout-payment-cash-button"
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={[
                  "min-h-11 rounded-xl px-3 text-sm font-semibold transition",
                  paymentMethod === "cash"
                    ? "bg-blue-500 text-white"
                    : "border border-slate-300 bg-white text-slate-700",
                ].join(" ")}
              >
                Cash
              </button>
              <button
                data-testid="checkout-payment-on-account-button"
                type="button"
                onClick={() => setPaymentMethod("on_account")}
                className={[
                  "min-h-11 rounded-xl px-3 text-sm font-semibold transition",
                  paymentMethod === "on_account"
                    ? "bg-blue-500 text-white"
                    : "border border-slate-300 bg-white text-slate-700",
                ].join(" ")}
              >
                On account
              </button>
            </div>

            <label className="mt-3 block">
              <span className="text-xs font-semibold text-slate-600">
                Customer {paymentMethod === "on_account" ? "(required)" : "(optional)"}
              </span>
              <input
                data-testid="checkout-customer-name-input"
                type="text"
                placeholder="e.g. Juan Perez"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                disabled={isSubmitting || paymentMethod === "cash"}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>

            <div className="mt-3 flex items-center gap-2">
              <button
                data-testid="checkout-confirm-payment-button"
                type="button"
                onClick={submitCheckout}
                disabled={isSubmitting}
                className="min-h-11 flex-1 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-400"
              >
                {isSubmitting ? "Processing..." : "Confirm Payment"}
              </button>
              <button
                data-testid="checkout-cancel-payment-button"
                type="button"
                onClick={() => setIsPaymentSheetOpen(false)}
                disabled={isSubmitting}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

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
            Retry Offline Sync ({pendingSyncCount})
          </button>
        ) : null}
      </footer>
    </section>
  );
}
