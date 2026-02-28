"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import {
  enqueueOfflineSyncEvent,
  flushOfflineSyncQueue,
  getPendingOfflineSyncCount,
} from "@/modules/sync/presentation/offline/offlineSyncQueue";

interface SalesHistoryResponse {
  readonly items: ReadonlyArray<{
    readonly paymentMethod: "cash" | "on_account";
    readonly customerId?: string;
    readonly customerName?: string;
  }>;
}

interface CustomerDebtSummary {
  readonly customerId: string;
  readonly customerName: string;
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

interface DebtManagementPanelProps {
  readonly refreshToken?: number;
}

interface CustomerCandidate {
  readonly customerId: string;
  readonly customerName?: string;
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

export function DebtManagementPanel({
  refreshToken,
}: DebtManagementPanelProps): JSX.Element {
  const [candidateCustomers, setCandidateCustomers] = useState<readonly CustomerCandidate[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [manualCustomerId, setManualCustomerId] = useState<string>("");
  const [summary, setSummary] = useState<CustomerDebtSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("1");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const targetCustomerId = useMemo(() => {
    const manualValue = manualCustomerId.trim();
    if (manualValue.length > 0) {
      return manualValue;
    }

    return selectedCustomerId;
  }, [manualCustomerId, selectedCustomerId]);

  const loadCustomerCandidates = useCallback(async (): Promise<void> => {
    try {
      const { response, data } = await fetchJsonNoStore<SalesHistoryResponse>(
        "/api/v1/reports/sales-history?paymentMethod=on_account",
      );
      const payload = data;

      if (!response.ok || !payload) {
        return;
      }

      const candidateById = new Map<string, CustomerCandidate>();
      for (const item of payload.items) {
        if (item.paymentMethod !== "on_account" || !item.customerId) {
          continue;
        }

        const existing = candidateById.get(item.customerId);
        if (!existing) {
          candidateById.set(item.customerId, {
            customerId: item.customerId,
            customerName: item.customerName,
          });
          continue;
        }

        if (!existing.customerName && item.customerName) {
          candidateById.set(item.customerId, {
            customerId: item.customerId,
            customerName: item.customerName,
          });
        }
      }

      const customers = Array.from(candidateById.values());
      const ids = customers.map((customer) => customer.customerId);
      setCandidateCustomers(customers);
      setSelectedCustomerId((current) => {
        if (current && ids.includes(current)) {
          return current;
        }

        return ids[0] ?? "";
      });
    } catch {
      // non-blocking for this panel
    }
  }, []);

  const loadSummary = useCallback(
    async (
      customerId: string,
      options: { readonly clearFeedback?: boolean } = {},
    ): Promise<void> => {
      const clearFeedback = options.clearFeedback ?? true;
      setIsLoading(true);
      if (clearFeedback) {
        setFeedback(null);
      }

      try {
        const { response, data } = await fetchJsonNoStore<CustomerDebtSummary | ApiErrorPayload>(
          `/api/v1/customers/${encodeURIComponent(customerId)}/debt`,
        );
        const payload = data;

        if (!response.ok || !payload) {
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
    },
    [],
  );

  const refreshPendingSyncCount = useCallback((): void => {
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
    void loadCustomerCandidates();
  }, [loadCustomerCandidates, refreshToken]);

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
    const paymentPayload = {
      customerId: targetCustomerId,
      amount: parsedAmount,
      paymentMethod: "cash" as const,
      notes: paymentNotes.trim() || undefined,
    };

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
        body: JSON.stringify(paymentPayload),
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
      refreshPendingSyncCount();
      await loadSummary(targetCustomerId, { clearFeedback: false });
    } catch {
      enqueueOfflineSyncEvent({
        eventType: "debt_payment_registered",
        payload: paymentPayload,
        idempotencyKey: `debt-payment-offline-${crypto.randomUUID()}`,
      });

      refreshPendingSyncCount();
      setIsError(false);
      setFeedback("Debt payment saved offline. Pending sync.");
      setPaymentAmount("1");
      setPaymentNotes("");
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
            data-testid="debt-customer-candidates-select"
            value={selectedCustomerId}
            onChange={(event) => setSelectedCustomerId(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            {candidateCustomers.length === 0 ? (
              <option value="">No on-account customers yet</option>
            ) : null}
            {candidateCustomers.map((customer) => (
              <option key={customer.customerId} value={customer.customerId}>
                {customer.customerName
                  ? `${customer.customerName} (${customer.customerId.slice(0, 8)})`
                  : customer.customerId}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Or type customer id</span>
          <input
            data-testid="debt-manual-customer-id-input"
            value={manualCustomerId}
            onChange={(event) => setManualCustomerId(event.target.value)}
            placeholder="customer-uuid"
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          data-testid="debt-refresh-candidates-button"
          type="button"
          onClick={() => {
            void loadCustomerCandidates();
          }}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
        >
          Refresh candidates
        </button>
        <button
          data-testid="debt-load-summary-button"
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
          <p className="text-xs font-semibold text-slate-500">
            Customer {summary.customerName} ({summary.customerId.slice(0, 8)})
          </p>
          <p className="text-xs font-semibold text-slate-500">Outstanding balance</p>
          <p data-testid="debt-outstanding-value" className="text-lg font-semibold text-slate-900">
            {formatMoney(summary.outstandingBalance)}
          </p>
        </div>
      ) : null}

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleRegisterPayment}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Payment amount</span>
          <input
            data-testid="debt-payment-amount-input"
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
            data-testid="debt-payment-notes-input"
            value={paymentNotes}
            onChange={(event) => setPaymentNotes(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <div className="md:col-span-2">
          <button
            data-testid="debt-register-payment-button"
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
          data-testid="debt-feedback"
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
          data-testid="debt-retry-offline-sync-button"
          type="button"
          onClick={() => {
            void retryOfflineSync();
          }}
          className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
        >
          Retry Offline Sync ({pendingSyncCount})
        </button>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-700">Debt ledger</p>
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto p-2">
          {summary?.ledger.map((entry) => (
            <li
              key={entry.entryId}
              data-testid={`debt-ledger-entry-${entry.entryId}`}
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
