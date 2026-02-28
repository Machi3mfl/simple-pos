"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface SalesHistoryResponse {
  readonly items: ReadonlyArray<{
    readonly paymentMethod: "cash" | "on_account";
    readonly customerId?: string;
  }>;
}

interface CustomerDebtSummary {
  readonly customerId: string;
  readonly outstandingBalance: number;
  readonly ledger: ReadonlyArray<{
    readonly entryId: string;
    readonly entryType: "debt" | "payment";
    readonly orderId?: string;
    readonly amount: number;
    readonly occurredAt: string;
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

export function DebtManagementPanel(): JSX.Element {
  const [candidateCustomerIds, setCandidateCustomerIds] = useState<readonly string[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [manualCustomerId, setManualCustomerId] = useState<string>("");
  const [summary, setSummary] = useState<CustomerDebtSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("1");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const targetCustomerId = useMemo(() => {
    const manualValue = manualCustomerId.trim();
    if (manualValue.length > 0) {
      return manualValue;
    }

    return selectedCustomerId;
  }, [manualCustomerId, selectedCustomerId]);

  const loadCustomerCandidates = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/v1/reports/sales-history");
      const payload = (await response.json()) as SalesHistoryResponse;
      if (!response.ok) {
        return;
      }

      const ids = Array.from(
        new Set(
          payload.items
            .filter((item) => item.paymentMethod === "on_account" && Boolean(item.customerId))
            .map((item) => item.customerId as string),
        ),
      );

      setCandidateCustomerIds(ids);
      if (!selectedCustomerId && ids.length > 0) {
        setSelectedCustomerId(ids[0]);
      }
    } catch {
      // non-blocking for this panel
    }
  }, [selectedCustomerId]);

  const loadSummary = useCallback(async (customerId: string): Promise<void> => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/v1/customers/${encodeURIComponent(customerId)}/debt`);
      const payload = (await response.json()) as CustomerDebtSummary | ApiErrorPayload;

      if (!response.ok) {
        setIsError(true);
        setFeedback(resolveApiMessage(payload, "Could not load debt summary."));
        setSummary(null);
        return;
      }

      setSummary(payload as CustomerDebtSummary);
      setIsError(false);
    } catch {
      setIsError(true);
      setFeedback("Could not load debt summary.");
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomerCandidates();
  }, [loadCustomerCandidates]);

  async function handleLoadSummary(): Promise<void> {
    if (!targetCustomerId) {
      setIsError(true);
      setFeedback("Select or type a customer id first.");
      return;
    }

    await loadSummary(targetCustomerId);
  }

  async function handleRegisterPayment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!targetCustomerId) {
      setIsError(true);
      setFeedback("Select or type a customer id first.");
      return;
    }

    const parsedAmount = Number(paymentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setIsError(true);
      setFeedback("Payment amount must be greater than zero.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/debt-payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          customerId: targetCustomerId,
          amount: parsedAmount,
          paymentMethod: "cash",
          notes: paymentNotes.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as DebtPaymentResponse | ApiErrorPayload;

      if (!response.ok) {
        setIsError(true);
        setFeedback(resolveApiMessage(payload, "Could not register debt payment."));
        return;
      }

      setIsError(false);
      setFeedback(`Payment registered: ${formatMoney((payload as DebtPaymentResponse).amount)}.`);
      setPaymentAmount("1");
      setPaymentNotes("");
      await loadSummary(targetCustomerId);
    } catch {
      setIsError(true);
      setFeedback("Could not register debt payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Customer Debt Management
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          UC-007: load customer ledger, register payments, and reduce outstanding debt.
        </p>
      </header>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Customer candidates</span>
          <select
            value={selectedCustomerId}
            onChange={(event) => setSelectedCustomerId(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            {candidateCustomerIds.length === 0 ? (
              <option value="">No on-account customers yet</option>
            ) : null}
            {candidateCustomerIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Or type customer id</span>
          <input
            value={manualCustomerId}
            onChange={(event) => setManualCustomerId(event.target.value)}
            placeholder="customer-uuid"
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void loadCustomerCandidates();
          }}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
        >
          Refresh candidates
        </button>
        <button
          type="button"
          onClick={() => {
            void handleLoadSummary();
          }}
          disabled={isLoading}
          className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
        >
          {isLoading ? "Loading..." : "Load debt summary"}
        </button>
      </div>

      {summary ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">Outstanding balance</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatMoney(summary.outstandingBalance)}
          </p>
        </div>
      ) : null}

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleRegisterPayment}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Payment amount</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Notes (optional)</span>
          <input
            value={paymentNotes}
            onChange={(event) => setPaymentNotes(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            {isSubmitting ? "Registering..." : "Register payment"}
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
        <div className="border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-700">Debt ledger</p>
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto p-2">
          {summary?.ledger.map((entry) => (
            <li
              key={entry.entryId}
              className={[
                "rounded-lg px-2 py-2 text-xs",
                entry.entryType === "debt"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-emerald-50 text-emerald-800",
              ].join(" ")}
            >
              <p className="font-semibold">
                {entry.entryType === "debt" ? "Debt" : "Payment"} • {formatMoney(entry.amount)}
              </p>
              <p className="mt-1">{new Date(entry.occurredAt).toLocaleString()}</p>
              {entry.orderId ? <p className="mt-1">Order {entry.orderId.slice(0, 8)}</p> : null}
            </li>
          ))}

          {!summary || summary.ledger.length === 0 ? (
            <li className="px-2 py-2 text-xs text-slate-500">No ledger entries loaded.</li>
          ) : null}
        </ul>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        To create debt entries, run checkout with payment method <strong>on_account</strong> from the
        Sales screen.
      </p>
    </article>
  );
}
