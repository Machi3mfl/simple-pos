"use client";

import {
  ChevronRight,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import type { CustomerSearchResponseDTO } from "@/modules/customers/presentation/dtos/customer-search-response.dto";
import {
  normalizeCustomerName,
} from "@/modules/customers/domain/services/normalizeCustomerName";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/hooks/use-app-toast";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
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
  readonly imageUrl?: string;
}

interface CheckoutPanelProps {
  readonly items: readonly CheckoutOrderItem[];
  readonly subtotal: number;
  readonly onIncreaseQuantity: (productId: string) => void;
  readonly onDecreaseQuantity: (productId: string) => void;
  readonly onRemoveItem: (productId: string) => void;
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

interface CustomerLookupItem {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
}

type SelectedOnAccountCustomer =
  | {
      readonly kind: "existing";
      readonly id: string;
      readonly name: string;
    }
  | {
      readonly kind: "new";
      readonly name: string;
    };

type CheckoutFeedbackTone = "success" | "error" | "info";

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
  onRemoveItem,
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
  const [recentCustomers, setRecentCustomers] = useState<readonly CustomerLookupItem[]>([]);
  const [customerSearchResults, setCustomerSearchResults] = useState<
    readonly CustomerLookupItem[]
  >([]);
  const [selectedOnAccountCustomer, setSelectedOnAccountCustomer] =
    useState<SelectedOnAccountCustomer | null>(null);
  const [pendingNewCustomerName, setPendingNewCustomerName] = useState<string | null>(null);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState<boolean>(false);
  const [customerLookupError, setCustomerLookupError] = useState<string | null>(null);
  const deferredCustomerQuery = useDeferredValue(customerName);

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
  const trimmedCustomerQuery = useMemo(() => customerName.trim(), [customerName]);
  const settledCustomerQuery = useMemo(
    () => deferredCustomerQuery.trim(),
    [deferredCustomerQuery],
  );
  const normalizedCustomerQuery = useMemo(
    () => normalizeCustomerName(settledCustomerQuery),
    [settledCustomerQuery],
  );
  const isSettledCustomerSearch = settledCustomerQuery.length >= 2;
  const visibleCustomerOptions = useMemo(
    () =>
      !isSettledCustomerSearch
        ? recentCustomers
        : customerSearchResults,
    [customerSearchResults, isSettledCustomerSearch, recentCustomers],
  );
  const hasExactCustomerMatch = useMemo(
    () =>
      isSettledCustomerSearch &&
      normalizedCustomerQuery.length > 0 &&
      visibleCustomerOptions.some(
        (customer) => normalizeCustomerName(customer.name) === normalizedCustomerQuery,
      ),
    [isSettledCustomerSearch, normalizedCustomerQuery, visibleCustomerOptions],
  );
  const customerLookupPanelTitle = useMemo(
    () =>
      isSettledCustomerSearch
        ? messages.sales.checkout.customerMatchesTitle
        : messages.sales.checkout.customerRecentTitle,
    [isSettledCustomerSearch, messages.sales.checkout.customerMatchesTitle, messages.sales.checkout.customerRecentTitle],
  );
  const customerLookupEmptyMessage = useMemo(() => {
    if (customerLookupError) {
      return customerLookupError;
    }

    if (isCustomerSearchLoading) {
      return messages.common.states.loading;
    }

    if (isSettledCustomerSearch) {
      return messages.sales.checkout.customerNoMatches;
    }

    return messages.sales.checkout.customerSearchHint;
  }, [
    customerLookupError,
    isCustomerSearchLoading,
    isSettledCustomerSearch,
    messages.common.states.loading,
    messages.sales.checkout.customerNoMatches,
    messages.sales.checkout.customerSearchHint,
  ]);
  const shouldShowCreateCustomerAction =
    isSettledCustomerSearch &&
    !hasExactCustomerMatch &&
    !isCustomerSearchLoading &&
    !customerLookupError;
  const activeCustomerName = useMemo(() => {
    if (!selectedOnAccountCustomer) {
      return "";
    }

    return selectedOnAccountCustomer.name;
  }, [selectedOnAccountCustomer]);

  const resetPaymentInputs = useCallback((): void => {
    setCashReceivedAmount("");
    setOnAccountInitialPaymentAmount("");
    setCustomerName("");
    setPaymentMethod("cash");
    setRecentCustomers([]);
    setCustomerSearchResults([]);
    setSelectedOnAccountCustomer(null);
    setPendingNewCustomerName(null);
    setCustomerLookupError(null);
  }, []);

  const publishFeedback = useCallback(
    ({
      tone,
      message,
      title,
    }: {
      readonly tone: CheckoutFeedbackTone;
      readonly message: string;
      readonly title?: string;
    }): void => {
      setIsError(tone === "error");
      setFeedback(message);

      const toastPayload = {
        title,
        description: message,
      };

      if (tone === "error") {
        showErrorToast(toastPayload);
        return;
      }

      if (tone === "success") {
        showSuccessToast(toastPayload);
        return;
      }

      showInfoToast(toastPayload);
    },
    [],
  );

  const refreshPendingSyncCount = useCallback(() => {
    setPendingSyncCount(getPendingOfflineSyncCount());
  }, []);

  const selectExistingCustomer = useCallback((customer: CustomerLookupItem): void => {
    setSelectedOnAccountCustomer({
      kind: "existing",
      id: customer.id,
      name: customer.name,
    });
    setCustomerName(customer.name);
    setPendingNewCustomerName(null);
    setCustomerLookupError(null);
  }, []);

  const confirmNewCustomer = useCallback((draftName: string): void => {
    const trimmedName = draftName.trim();
    setSelectedOnAccountCustomer({
      kind: "new",
      name: trimmedName,
    });
    setCustomerName(trimmedName);
    setPendingNewCustomerName(null);
    setCustomerLookupError(null);
  }, []);

  const changeSelectedCustomer = useCallback((): void => {
    setSelectedOnAccountCustomer(null);
    setPendingNewCustomerName(null);
    setCustomerName("");
  }, []);

  const retryOfflineSync = useCallback(async () => {
    const result = await flushOfflineSyncQueue();
    refreshPendingSyncCount();

    if (result.synced > 0 && result.failed === 0 && result.pending === 0) {
      publishFeedback({
        tone: "success",
        title: "Sincronización completada",
        message: messages.common.feedback.offlineSyncSuccess,
      });
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
    messages.common.feedback.offlineSyncPending,
    messages.common.feedback.offlineSyncSuccess,
    publishFeedback,
    refreshPendingSyncCount,
  ]);

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

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSubmitting) {
        setIsPaymentSheetOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPaymentSheetOpen, isSubmitting]);

  useEffect(() => {
    if (pendingNewCustomerName === null) {
      return;
    }

    if (pendingNewCustomerName !== trimmedCustomerQuery) {
      setPendingNewCustomerName(null);
    }
  }, [pendingNewCustomerName, trimmedCustomerQuery]);

  useEffect(() => {
    if (
      !isPaymentSheetOpen ||
      paymentMethod !== "on_account" ||
      selectedOnAccountCustomer
    ) {
      return;
    }

    const query = settledCustomerQuery;
    if (query.length > 0 && query.length < 2) {
      setCustomerLookupError(null);
      return;
    }

    const controller = new AbortController();
    const searchParams = new URLSearchParams({
      limit: "6",
    });
    if (query.length > 0) {
      searchParams.set("query", query);
    }

    setIsCustomerSearchLoading(true);
    setCustomerLookupError(null);

    void fetchJsonNoStore<CustomerSearchResponseDTO>(
      `/api/v1/customers?${searchParams.toString()}`,
      { signal: controller.signal },
    )
      .then(({ response, data }) => {
        if (!response.ok || !data) {
          setCustomerLookupError(messages.sales.checkout.customerLookupLoadError);
          setCustomerSearchResults([]);
          return;
        }

        if (query.length === 0) {
          setRecentCustomers(data.items);
          setCustomerSearchResults([]);
          return;
        }

        setCustomerSearchResults(data.items);
      })
      .catch((error: unknown) => {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setCustomerLookupError(messages.sales.checkout.customerLookupLoadError);
        setCustomerSearchResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsCustomerSearchLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    isPaymentSheetOpen,
    messages.sales.checkout.customerLookupLoadError,
    paymentMethod,
    selectedOnAccountCustomer,
    settledCustomerQuery,
  ]);

  async function submitCheckout(): Promise<void> {
    setFeedback(null);

    if (items.length === 0) {
      publishFeedback({
        tone: "error",
        title: "Pedido vacío",
        message: messages.sales.checkout.addItemFirst,
      });
      return;
    }

    if (paymentMethod === "cash") {
      if (!Number.isFinite(effectiveCashReceivedValue)) {
        publishFeedback({
          tone: "error",
          title: "Monto inválido",
          message: messages.sales.checkout.invalidCustomerPayment,
        });
        return;
      }

      if (effectiveCashReceivedValue < total) {
        publishFeedback({
          tone: "error",
          title: "Efectivo insuficiente",
          message: messages.sales.checkout.cashMustCoverTotal,
        });
        return;
      }
    }

    if (paymentMethod === "on_account" && !selectedOnAccountCustomer) {
      publishFeedback({
        tone: "error",
        title: "Falta seleccionar el cliente",
        message: messages.sales.checkout.onAccountCustomerSelectionRequired,
      });
      return;
    }

    if (paymentMethod === "on_account" && activeCustomerName.trim().length < 2) {
      publishFeedback({
        tone: "error",
        title: "Falta el cliente",
        message: messages.sales.checkout.onAccountCustomerRequired,
      });
      return;
    }

    const initialPaymentAmount = Number.isFinite(onAccountInitialPaymentValue)
      ? Number(onAccountInitialPaymentValue.toFixed(2))
      : Number.NaN;

    if (paymentMethod === "on_account") {
      if (!Number.isFinite(initialPaymentAmount) || initialPaymentAmount < 0) {
        publishFeedback({
          tone: "error",
          title: "Pago inicial inválido",
          message: messages.sales.checkout.initialPaymentInvalid,
        });
        return;
      }

      if (initialPaymentAmount >= total) {
        publishFeedback({
          tone: "error",
          title: "Método incorrecto",
          message: messages.sales.checkout.initialPaymentUseCash,
        });
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
                ...(selectedOnAccountCustomer?.kind === "existing"
                  ? { customerId: selectedOnAccountCustomer.id }
                  : {
                      customerName: activeCustomerName,
                      createCustomerIfMissing: true,
                    }),
                ...(initialPaymentAmount > 0
                  ? { initialPaymentAmount }
                  : {}),
              }
            : {}),
        }),
      });

      const responseData = (await response.json()) as unknown;
      if (!response.ok) {
        publishFeedback({
          tone: "error",
          title: "No se pudo registrar la venta",
          message: resolveCheckoutError(responseData),
        });
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
          messages.sales.checkout.customerAssignedMessage(activeCustomerName),
        );
        successMessageParts.push(
          messages.sales.checkout.remainingOnAccountMessage(
            currency(successPayload.outstandingAmount ?? onAccountRemainingAmount),
          ),
        );
      }

      publishFeedback({
        tone: "success",
        title: "Venta registrada",
        message: successMessageParts.join(" "),
      });
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
          customerId:
            paymentMethod === "on_account" && selectedOnAccountCustomer?.kind === "existing"
              ? selectedOnAccountCustomer.id
              : undefined,
          customerName:
            paymentMethod === "on_account" && selectedOnAccountCustomer?.kind === "new"
              ? activeCustomerName
              : undefined,
          createCustomerIfMissing:
            paymentMethod === "on_account" && selectedOnAccountCustomer?.kind === "new"
              ? true
              : undefined,
          initialPaymentAmount:
            paymentMethod === "on_account" && initialPaymentAmount > 0
              ? initialPaymentAmount
              : undefined,
        },
        idempotencyKey: `sale-offline-${crypto.randomUUID()}`,
      });
      refreshPendingSyncCount();
      publishFeedback({
        tone: "info",
        title: "Venta guardada offline",
        message: messages.sales.checkout.saleSavedOffline,
      });
      setIsPaymentSheetOpen(false);
      resetPaymentInputs();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-w-0 border-l border-slate-200 bg-[#f2f2f4] p-5 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden lg:p-6">
      <header className="shrink-0 flex items-baseline justify-between gap-2">
        <h2 className="text-[2.6rem] font-semibold leading-none tracking-tight text-slate-900">
          {messages.sales.checkout.orderListTitle}
        </h2>
      </header>

      <div
        data-testid="checkout-order-items-scroll"
        className="mt-5 space-y-3 overflow-y-auto pr-1 pb-4 lg:min-h-0 lg:flex-1 lg:overscroll-contain"
      >
        {items.map((item) => (
          <article
            key={item.id}
            data-testid={`order-item-${item.id}`}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
          >
            <p className="text-[1.03rem] leading-tight font-semibold tracking-tight text-slate-900">
              {item.name}
            </p>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-xl">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Cart thumbnails reuse catalog images that can come from managed storage or approved external URLs.
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span aria-hidden>{item.emoji}</span>
                  )}
                </div>
                <p className="text-[0.88rem] font-medium text-slate-500">
                  {currency(item.price)}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  data-testid={`order-item-remove-${item.id}`}
                  className="flex size-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600"
                  aria-label={`eliminar ${item.name}`}
                  title={`Eliminar ${item.name}`}
                >
                  <Trash2 className="size-4" strokeWidth={2.4} aria-hidden />
                </button>
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

      <footer className="shrink-0 mt-4 rounded-2xl bg-[#f2f2f4] p-1">
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
            aria-live={isError ? "assertive" : "polite"}
            className="sr-only"
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
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 backdrop-blur-[2px]"
          onClick={() => {
            if (!isSubmitting) {
              setIsPaymentSheetOpen(false);
            }
          }}
        >
          <div className="flex min-h-full items-start justify-center p-3 sm:p-4 lg:p-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="checkout-modal-title"
              data-testid="checkout-payment-modal"
              className="flex w-full max-w-[34rem] max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="shrink-0 border-b border-slate-200/80 px-5 py-4 lg:px-6 lg:py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                      {messages.sales.checkout.paymentStepLabel}
                    </p>
                    <h3
                      id="checkout-modal-title"
                      className="mt-1 text-[1.7rem] font-semibold tracking-tight text-slate-900 sm:text-[1.8rem]"
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
                    <p className="mt-1 text-[1.8rem] leading-none font-bold tracking-tight text-slate-900 sm:text-[2rem]">
                      {currency(total)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-5 py-4 pr-4 [scrollbar-gutter:stable] lg:px-6 lg:py-5 lg:pr-5">
                <div>
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
                    {selectedOnAccountCustomer ? (
                      <div
                        data-testid="checkout-selected-customer-card"
                        className={[
                          "rounded-[1.7rem] border px-4 py-4",
                          selectedOnAccountCustomer.kind === "existing"
                            ? "border-emerald-200 bg-emerald-50/80"
                            : "border-amber-200 bg-amber-50/80",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={[
                                "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl text-white",
                                selectedOnAccountCustomer.kind === "existing"
                                  ? "bg-emerald-600"
                                  : "bg-amber-500",
                              ].join(" ")}
                            >
                              {selectedOnAccountCustomer.kind === "existing" ? (
                                <UserRoundCheck className="size-5" aria-hidden />
                              ) : (
                                <UserRoundPlus className="size-5" aria-hidden />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                                {selectedOnAccountCustomer.kind === "existing"
                                  ? messages.sales.checkout.customerExistingBadge
                                  : messages.sales.checkout.customerNewBadge}
                              </p>
                              <p className="mt-1 text-[1.2rem] leading-tight font-semibold text-slate-900">
                                {selectedOnAccountCustomer.name}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {selectedOnAccountCustomer.kind === "existing"
                                  ? messages.sales.checkout.customerExistingHelp
                                  : messages.sales.checkout.customerNewHelp}
                              </p>
                            </div>
                          </div>
                          <button
                            data-testid="checkout-selected-customer-change-button"
                            type="button"
                            onClick={changeSelectedCustomer}
                            disabled={isSubmitting}
                            className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                          >
                            {messages.sales.checkout.changeSelectedCustomer}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block">
                          <span className="text-sm font-semibold text-slate-700">
                            {messages.sales.checkout.customerNameLabel}
                          </span>
                          <div className="relative mt-2">
                            <Search
                              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                              aria-hidden
                            />
                            <input
                              data-testid="checkout-customer-name-input"
                              type="text"
                              placeholder={messages.sales.checkout.customerSearchPlaceholder}
                              value={customerName}
                              onChange={(event) => setCustomerName(event.target.value)}
                              disabled={isSubmitting}
                              className="min-h-[3.9rem] w-full rounded-2xl border border-slate-300 pl-12 pr-4 text-lg text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>
                        </label>

                        <p className="mt-2 text-sm text-slate-500">
                          {messages.sales.checkout.customerSearchHint}
                        </p>

                        <div
                          data-testid="checkout-customer-lookup-panel"
                          className="mt-3 rounded-[1.6rem] border border-slate-200 bg-white/80 px-3 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                              {customerLookupPanelTitle}
                            </p>
                            {isCustomerSearchLoading ? (
                              <span className="text-xs font-semibold text-slate-400">
                                {messages.common.states.loading}
                              </span>
                            ) : null}
                          </div>

                          <div
                            data-testid="checkout-customer-options-scroll-area"
                            className="mt-3 max-h-56 min-h-[7.75rem] overflow-y-auto pr-1 [scrollbar-gutter:stable]"
                          >
                            {visibleCustomerOptions.length > 0 ? (
                              <div className="grid gap-2">
                                {visibleCustomerOptions.map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    data-testid={`checkout-customer-option-${customer.id}`}
                                    onClick={() => selectExistingCustomer(customer)}
                                    className="flex min-h-[3.35rem] items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:border-blue-300"
                                  >
                                    <span className="flex items-center gap-3">
                                      <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                                        <Users className="size-5" aria-hidden />
                                      </span>
                                      <span className="text-[1.02rem] font-semibold text-slate-900">
                                        {customer.name}
                                      </span>
                                    </span>
                                    <ChevronRight className="size-5 text-slate-400" aria-hidden />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div
                                className={[
                                  "flex min-h-[7.75rem] items-center justify-center rounded-2xl px-4 text-center text-sm",
                                  customerLookupError
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-50 text-slate-500",
                                ].join(" ")}
                              >
                                {customerLookupEmptyMessage}
                              </div>
                            )}
                          </div>

                          {shouldShowCreateCustomerAction ? (
                            pendingNewCustomerName ? (
                              <div className="mt-3 rounded-[1.6rem] border border-amber-200 bg-amber-50 px-4 py-4">
                                <p className="text-sm font-semibold text-amber-900">
                                  {messages.sales.checkout.customerSimilarWarningTitle}
                                </p>
                                <p className="mt-1 text-sm text-amber-900/80">
                                  {messages.sales.checkout.customerSimilarWarningDescription(
                                    pendingNewCustomerName,
                                  )}
                                </p>
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                  <button
                                    data-testid="checkout-customer-create-confirm-button"
                                    type="button"
                                    onClick={() => confirmNewCustomer(pendingNewCustomerName)}
                                    className="min-h-11 rounded-2xl bg-amber-500 px-4 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(245,158,11,0.28)]"
                                  >
                                    {messages.sales.checkout.confirmCreateCustomerButton(
                                      pendingNewCustomerName,
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingNewCustomerName(null)}
                                    className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
                                  >
                                    {messages.common.actions.cancel}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                data-testid="checkout-customer-create-button"
                                type="button"
                                onClick={() => {
                                  if (visibleCustomerOptions.length > 0) {
                                    setPendingNewCustomerName(trimmedCustomerQuery);
                                    return;
                                  }

                                  confirmNewCustomer(trimmedCustomerQuery);
                                }}
                                className="mt-3 flex min-h-[3.35rem] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50 px-4 text-[0.98rem] font-semibold text-blue-700"
                              >
                                <Plus className="size-4" aria-hidden />
                                {messages.sales.checkout.createNewCustomerButton(
                                  trimmedCustomerQuery,
                                )}
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>
                    )}

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
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200/80 bg-[#fbfbfc] px-5 py-4 lg:px-6">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
          </div>
        </div>
      ) : null}
    </section>
  );
}
