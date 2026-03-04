"use client";

import { Landmark } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import { Input } from "@/components/ui/input";
import { showErrorToast, showSuccessToast } from "@/hooks/use-app-toast";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import type { CashRegisterSessionResponseDTO } from "../dtos/cash-register-session-response.dto";
import { cashRegisterSessionResponseDTOSchema } from "../dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../dtos/list-cash-registers-response.dto";

interface CashRegisterListItemDTO {
  readonly id: string;
  readonly name: string;
  readonly locationCode?: string;
  readonly isActive: boolean;
  readonly activeSession: CashRegisterSessionResponseDTO | null;
}

interface CashRegisterSessionPanelProps {
  readonly preferredRegisterIds: readonly string[];
  readonly canOpenSession: boolean;
  readonly canCloseSession: boolean;
}

interface ApiErrorResponse {
  readonly message?: string;
}

function currency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function parseMonetaryInput(rawValue: string): number {
  const normalizedValue = rawValue.trim().replace(",", ".");
  if (normalizedValue.length === 0) {
    return Number.NaN;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

function resolveApiErrorMessage(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as ApiErrorResponse).message === "string"
  ) {
    return (body as ApiErrorResponse).message ?? fallback;
  }

  return fallback;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CashRegisterSessionPanel({
  preferredRegisterIds,
  canOpenSession,
  canCloseSession,
}: CashRegisterSessionPanelProps): JSX.Element {
  const { messages } = useI18n();
  const cashSessionMessages = messages.sales.cashSession;
  const [registers, setRegisters] = useState<readonly CashRegisterListItemDTO[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>("");
  const [openingFloatAmount, setOpeningFloatAmount] = useState<string>("0");
  const [openingNotes, setOpeningNotes] = useState<string>("");
  const [countedClosingAmount, setCountedClosingAmount] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRegisters = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { response, data } = await fetchJsonNoStore<unknown>("/api/v1/cash-registers");
      if (!response.ok || !data) {
        throw new Error(cashSessionMessages.loadError);
      }

      const parsed = listCashRegistersResponseDTOSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(cashSessionMessages.loadError);
      }

      setRegisters(parsed.data.items);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : cashSessionMessages.loadError;
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [cashSessionMessages.loadError]);

  useEffect(() => {
    void loadRegisters();
  }, [loadRegisters]);

  useEffect(() => {
    if (registers.length === 0) {
      setSelectedRegisterId("");
      return;
    }

    if (registers.some((register) => register.id === selectedRegisterId)) {
      return;
    }

    const preferredRegister = preferredRegisterIds.find((registerId) =>
      registers.some((register) => register.id === registerId),
    );

    setSelectedRegisterId(preferredRegister ?? registers[0]?.id ?? "");
  }, [preferredRegisterIds, registers, selectedRegisterId]);

  const selectedRegister = useMemo(
    () => registers.find((register) => register.id === selectedRegisterId) ?? null,
    [registers, selectedRegisterId],
  );
  const activeSession = selectedRegister?.activeSession ?? null;
  const countedClosingValue = useMemo(
    () => parseMonetaryInput(countedClosingAmount),
    [countedClosingAmount],
  );
  const liveDiscrepancy = useMemo(() => {
    if (!activeSession || !Number.isFinite(countedClosingValue)) {
      return 0;
    }

    return Number((countedClosingValue - activeSession.expectedBalanceAmount).toFixed(2));
  }, [activeSession, countedClosingValue]);

  const handleOpenSession = useCallback(async (): Promise<void> => {
    const openingFloatValue = parseMonetaryInput(openingFloatAmount);
    if (!selectedRegister || !Number.isFinite(openingFloatValue) || openingFloatValue < 0) {
      showErrorToast({ description: cashSessionMessages.openErrorFallback });
      return;
    }

    setIsOpening(true);
    try {
      const response = await fetch("/api/v1/cash-register-sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          cashRegisterId: selectedRegister.id,
          openingFloatAmount: openingFloatValue,
          openingNotes: openingNotes.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showErrorToast(
          {
            description: resolveApiErrorMessage(
              payload,
              cashSessionMessages.openErrorFallback,
            ),
          },
        );
        return;
      }

      const parsed = cashRegisterSessionResponseDTOSchema.safeParse(payload);
      if (!parsed.success) {
        showErrorToast({ description: cashSessionMessages.openErrorFallback });
        return;
      }

      setOpeningNotes("");
      setCountedClosingAmount("");
      setClosingNotes("");
      showSuccessToast({
        description: cashSessionMessages.openSuccess(selectedRegister.name),
      });
      await loadRegisters();
    } finally {
      setIsOpening(false);
    }
  }, [
    cashSessionMessages,
    loadRegisters,
    openingFloatAmount,
    openingNotes,
    selectedRegister,
  ]);

  const handleCloseSession = useCallback(async (): Promise<void> => {
    if (!activeSession || !selectedRegister || !Number.isFinite(countedClosingValue)) {
      showErrorToast({ description: cashSessionMessages.closeErrorFallback });
      return;
    }

    setIsClosing(true);
    try {
      const response = await fetch(
        `/api/v1/cash-register-sessions/${activeSession.id}/close`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            countedClosingAmount: countedClosingValue,
            closingNotes: closingNotes.trim() || undefined,
          }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showErrorToast(
          {
            description: resolveApiErrorMessage(
              payload,
              cashSessionMessages.closeErrorFallback,
            ),
          },
        );
        return;
      }

      const parsed = cashRegisterSessionResponseDTOSchema.safeParse(payload);
      if (!parsed.success) {
        showErrorToast({ description: cashSessionMessages.closeErrorFallback });
        return;
      }

      setCountedClosingAmount("");
      setClosingNotes("");
      setIsCloseModalOpen(false);
      showSuccessToast({
        description: cashSessionMessages.closeSuccess(selectedRegister.name),
      });
      await loadRegisters();
    } finally {
      setIsClosing(false);
    }
  }, [
    activeSession,
    cashSessionMessages,
    closingNotes,
    countedClosingValue,
    loadRegisters,
    selectedRegister,
  ]);

  return (
    <div
      data-testid="cash-session-panel"
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {messages.sales.cashSession.title}
          </p>
          <h2 className="mt-2 text-[1.6rem] font-semibold tracking-tight text-slate-900">
            {activeSession
              ? cashSessionMessages.activeSessionTitle
              : cashSessionMessages.noSessionTitle}
          </h2>
          <p className="mt-1 max-w-[48rem] text-sm text-slate-500">
            {activeSession
              ? cashSessionMessages.activeSessionDescription
              : cashSessionMessages.noSessionDescription}
          </p>
        </div>

        <div className="w-full max-w-[17rem]">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {cashSessionMessages.registerLabel}
          </label>
          <select
            data-testid="cash-session-register-select"
            value={selectedRegisterId}
            onChange={(event) => setSelectedRegisterId(event.target.value)}
            className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[1rem] font-semibold text-slate-900 outline-none"
          >
            {registers.length === 0 ? (
              <option value="">{cashSessionMessages.registerPlaceholder}</option>
            ) : null}
            {registers.map((register) => (
              <option key={register.id} value={register.id}>
                {register.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {loadError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
          {messages.common.states.loading}
        </div>
      ) : null}

      {!isLoading && !selectedRegister ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
          {cashSessionMessages.noRegistersAvailable}
        </div>
      ) : null}

      {!isLoading && selectedRegister ? (
        activeSession ? (
          <div
            data-testid="cash-session-active-summary"
            className="mt-4 rounded-[1.65rem] border border-slate-200 bg-[#f8fafc] p-4"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <Landmark className="size-6" />
                  </span>
                  <div>
                    <p className="text-[1.15rem] font-semibold text-slate-900">
                      {selectedRegister.name}
                    </p>
                    <p className="text-sm text-slate-500">
                        {cashSessionMessages.openedByLabel}:{" "}
                      {activeSession.openedByDisplayName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {cashSessionMessages.openedAtLabel}:{" "}
                      {formatDateTime(activeSession.openedAt)}
                    </p>
                  </div>
                </div>

                {activeSession.openingNotes ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {activeSession.openingNotes}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {cashSessionMessages.openingFloatLabel}
                  </p>
                  <p className="mt-2 text-[1.75rem] font-bold tracking-tight text-slate-900">
                    {currency(activeSession.openingFloatAmount)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    {cashSessionMessages.expectedBalanceLabel}
                  </p>
                  <p className="mt-2 text-[1.75rem] font-bold tracking-tight text-emerald-700">
                    {currency(activeSession.expectedBalanceAmount)}
                  </p>
                </div>
              </div>
            </div>

            {!canCloseSession ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                {cashSessionMessages.readOnlyHint}
              </div>
            ) : (
              <button
                type="button"
                data-testid="cash-session-close-button"
                onClick={() => {
                  setCountedClosingAmount(
                    activeSession.expectedBalanceAmount.toFixed(2),
                  );
                  setIsCloseModalOpen(true);
                }}
                className="mt-4 min-h-[52px] rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.98rem] font-semibold text-white shadow-[0_16px_26px_rgba(28,109,234,0.28)]"
              >
                {cashSessionMessages.closeAction}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.65rem] border border-slate-200 bg-[#f8fafc] p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto] lg:items-end">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {cashSessionMessages.openingFloatLabel}
                </label>
                <Input
                  data-testid="cash-session-opening-float-input"
                  value={openingFloatAmount}
                  onChange={(event) => setOpeningFloatAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="mt-2 min-h-[52px] rounded-2xl border-slate-200 bg-white text-[1rem]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {cashSessionMessages.openingNotesLabel}
                </label>
                <Input
                  value={openingNotes}
                  onChange={(event) => setOpeningNotes(event.target.value)}
                  placeholder={cashSessionMessages.openingNotePlaceholder}
                  className="mt-2 min-h-[52px] rounded-2xl border-slate-200 bg-white text-[1rem]"
                />
              </div>

              <button
                type="button"
                data-testid="cash-session-open-button"
                disabled={!canOpenSession || isOpening || !selectedRegister}
                onClick={() => {
                  void handleOpenSession();
                }}
                className="min-h-[52px] rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.98rem] font-semibold text-white shadow-[0_16px_26px_rgba(28,109,234,0.28)] disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
              >
                {isOpening ? messages.common.states.saving : cashSessionMessages.openAction}
              </button>
            </div>

            {!canOpenSession ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                {cashSessionMessages.readOnlyHint}
              </div>
            ) : null}
          </div>
        )
      ) : null}

      {isCloseModalOpen && activeSession ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4"
          onClick={() => setIsCloseModalOpen(false)}
        >
          <div className="relative flex min-h-full items-center justify-center">
            <FloatingModalCloseButton
              ariaLabel={messages.common.actions.close}
              onClick={() => setIsCloseModalOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              data-testid="cash-session-close-modal"
              className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[32rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-slate-200/80 px-5 py-4 lg:px-6 lg:py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {cashSessionMessages.title}
                </p>
                <h3 className="mt-1 text-[1.7rem] font-semibold tracking-tight text-slate-900">
                  {cashSessionMessages.closeModalTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {cashSessionMessages.closeModalDescription}
                </p>
              </div>

              <div className="min-h-0 overflow-y-auto px-5 py-4 lg:px-6 lg:py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      {cashSessionMessages.expectedBalanceLabel}
                    </p>
                    <p className="mt-2 text-[1.85rem] font-bold tracking-tight text-emerald-700">
                      {currency(activeSession.expectedBalanceAmount)}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      {cashSessionMessages.discrepancyLabel}
                    </p>
                    <p className="mt-2 text-[1.85rem] font-bold tracking-tight text-amber-700">
                      {currency(liveDiscrepancy)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {cashSessionMessages.closingCountedLabel}
                    </label>
                    <Input
                      data-testid="cash-session-counted-input"
                      value={countedClosingAmount}
                      onChange={(event) => setCountedClosingAmount(event.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="mt-2 min-h-[52px] rounded-2xl border-slate-200 bg-white text-[1rem]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {cashSessionMessages.closingNotesLabel}
                    </label>
                    <Input
                      value={closingNotes}
                      onChange={(event) => setClosingNotes(event.target.value)}
                      placeholder={cashSessionMessages.closingNotePlaceholder}
                      className="mt-2 min-h-[52px] rounded-2xl border-slate-200 bg-white text-[1rem]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 px-5 py-4 lg:px-6 lg:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-5 text-[0.98rem] font-semibold text-slate-700"
                  >
                    {messages.common.actions.cancel}
                  </button>
                  <button
                    type="button"
                    data-testid="cash-session-close-submit-button"
                    disabled={isClosing}
                    onClick={() => {
                      void handleCloseSession();
                    }}
                    className="min-h-[52px] rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.98rem] font-semibold text-white shadow-[0_16px_26px_rgba(28,109,234,0.28)] disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
                  >
                    {isClosing ? messages.common.states.saving : cashSessionMessages.closeAction}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
