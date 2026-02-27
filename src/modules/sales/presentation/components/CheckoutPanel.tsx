"use client";

import { useMemo, useState } from "react";

import type { PaymentMethodDTO } from "../dtos/create-sale.dto";

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
}

interface CheckoutApiError {
  readonly code?: string;
  readonly message?: string;
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
}: CheckoutPanelProps): JSX.Element {
  const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodDTO>("cash");
  const [customerName, setCustomerName] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleCheckout(): Promise<void> {
    setFeedback(null);

    if (paymentMethod === "on_account" && customerName.trim().length < 2) {
      setIsError(true);
      setFeedback("For on-account payment, assign a customer name first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/sales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
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

      setIsError(false);
      setFeedback("Checkout completed successfully.");
      if (paymentMethod === "cash") {
        setCustomerName("");
      }
    } catch {
      setIsError(true);
      setFeedback("Network error while creating sale.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex h-full flex-col rounded-[2rem] bg-white/95 p-5 shadow-xl shadow-slate-300/30 lg:p-6">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
          Order List
        </h2>
        <p className="text-xs text-slate-500">MVP Demo</p>
      </header>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                <span aria-hidden>{item.emoji}</span>
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-500">{currency(item.price)}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                x{item.quantity}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">Payment Method</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            className={[
              "min-h-11 rounded-xl px-3 text-sm font-semibold transition",
              paymentMethod === "cash"
                ? "bg-blue-500 text-white"
                : "border border-slate-300 bg-white text-slate-700",
            ].join(" ")}
            disabled={isSubmitting}
          >
            Cash
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("on_account")}
            className={[
              "min-h-11 rounded-xl px-3 text-sm font-semibold transition",
              paymentMethod === "on_account"
                ? "bg-blue-500 text-white"
                : "border border-slate-300 bg-white text-slate-700",
            ].join(" ")}
            disabled={isSubmitting}
          >
            On account
          </button>
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-slate-600">
            Customer {paymentMethod === "on_account" ? "(required)" : "(optional)"}
          </span>
          <input
            type="text"
            placeholder="e.g. Juan Perez"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            disabled={isSubmitting || paymentMethod === "cash"}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
          />
        </label>
      </div>

      <footer className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{currency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span className="font-semibold text-slate-900">-{currency(discount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span className="font-semibold text-slate-900">{currency(tax)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-700">Total</p>
            <p className="text-3xl font-bold text-slate-900">{currency(total)}</p>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="mt-4 min-h-12 w-full rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Processing..." : "Proceed to payment"}
          </button>
          {feedback ? (
            <p
              className={[
                "mt-3 rounded-xl px-3 py-2 text-sm font-medium",
                isError
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700",
              ].join(" ")}
            >
              {feedback}
            </p>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
