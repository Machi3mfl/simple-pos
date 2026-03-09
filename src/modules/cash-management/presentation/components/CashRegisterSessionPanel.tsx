"use client";

import { Landmark } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import { Input } from "@/components/ui/input";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/hooks/use-app-toast";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { formatOperationalDate } from "@/lib/date/operationalDate";
import { getFormControlValidationProps } from "@/lib/form-controls";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import {
  enqueueOfflineSyncEvent,
  flushOfflineSyncQueue,
  getPendingOfflineSyncCount,
} from "@/modules/sync/presentation/offline/offlineSyncQueue";
import type {
  ActiveCashRegisterSessionResponseDTO,
  CashRegisterSessionResponseDTO,
} from "../dtos/cash-register-session-response.dto";
import {
  activeCashRegisterSessionResponseDTOSchema,
  cashRegisterSessionDetailResponseDTOSchema,
  cashRegisterSessionResponseDTOSchema,
} from "../dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../dtos/list-cash-registers-response.dto";

interface CashRegisterListItemDTO {
  readonly id: string;
  readonly name: string;
  readonly locationCode?: string;
  readonly isActive: boolean;
  readonly activeSession: CashRegisterSessionResponseDTO | null;
}

type ManualMovementType =
  | "cash_paid_in"
  | "cash_paid_out"
  | "safe_drop"
  | "adjustment";
type ManualMovementDirection = "inbound" | "outbound";

interface CashRegisterSessionPanelProps {
  readonly preferredRegisterIds: readonly string[];
  readonly selectedRegisterId: string;
  readonly onSelectedRegisterIdChange: (registerId: string) => void;
  readonly currentActorId?: string;
  readonly refreshToken?: number;
  readonly canOpenSession: boolean;
  readonly canBackdateSessionOpen: boolean;
  readonly canCloseSession: boolean;
  readonly canRecordManualCashMovement: boolean;
  readonly canApproveDiscrepancyClose: boolean;
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

function formatBusinessDate(value: string): string {
  const [yearToken, monthToken, dayToken] = value.split("-");
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function resolveMovementAmountClassName(direction: "inbound" | "outbound"): string {
  return direction === "inbound" ? "text-emerald-700" : "text-amber-700";
}

export function CashRegisterSessionPanel({
  preferredRegisterIds,
  selectedRegisterId,
  onSelectedRegisterIdChange,
  currentActorId,
  refreshToken = 0,
  canOpenSession,
  canBackdateSessionOpen,
  canCloseSession,
  canRecordManualCashMovement,
  canApproveDiscrepancyClose,
}: CashRegisterSessionPanelProps): JSX.Element {
  const { messages } = useI18n();
  const cashSessionMessages = messages.sales.cashSession;
  const [registers, setRegisters] = useState<readonly CashRegisterListItemDTO[]>([]);
  const [activeSessionDetail, setActiveSessionDetail] =
    useState<ActiveCashRegisterSessionResponseDTO["session"]>(null);
  const [openingFloatAmount, setOpeningFloatAmount] = useState<string>("0");
  const [openingNotes, setOpeningNotes] = useState<string>("");
  const [businessDate, setBusinessDate] = useState<string>(() =>
    formatOperationalDate(new Date()),
  );
  const [countedClosingAmount, setCountedClosingAmount] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState<string>("");
  const [movementType, setMovementType] = useState<ManualMovementType>("cash_paid_in");
  const [movementAmount, setMovementAmount] = useState<string>("");
  const [movementDirection, setMovementDirection] =
    useState<ManualMovementDirection>("inbound");
  const [movementNotes, setMovementNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingActiveSession, setIsLoadingActiveSession] = useState<boolean>(false);
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isRecordingMovement, setIsRecordingMovement] = useState<boolean>(false);
  const [isApprovingCloseout, setIsApprovingCloseout] = useState<boolean>(false);
  const [isReopeningForRecount, setIsReopeningForRecount] = useState<boolean>(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [approvalNotes, setApprovalNotes] = useState<string>("");
  const [pendingOfflineMovementCount, setPendingOfflineMovementCount] =
    useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shouldShowOpeningFieldErrors, setShouldShowOpeningFieldErrors] =
    useState<boolean>(false);
  const [shouldShowClosingFieldErrors, setShouldShowClosingFieldErrors] =
    useState<boolean>(false);
  const [shouldShowMovementFieldErrors, setShouldShowMovementFieldErrors] =
    useState<boolean>(false);

  const refreshPendingOfflineMovementCount = useCallback((): void => {
    setPendingOfflineMovementCount(getPendingOfflineSyncCount(["cash_movement_recorded"]));
  }, []);

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
    refreshPendingOfflineMovementCount();

    const onOnline = (): void => {
      refreshPendingOfflineMovementCount();
    };

    const onOffline = (): void => {
      refreshPendingOfflineMovementCount();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshPendingOfflineMovementCount]);

  useEffect(() => {
    if (registers.length === 0) {
      return;
    }

    if (registers.some((register) => register.id === selectedRegisterId)) {
      return;
    }

    const preferredRegister = preferredRegisterIds.find((registerId) =>
      registers.some((register) => register.id === registerId),
    );

    onSelectedRegisterIdChange(preferredRegister ?? registers[0]?.id ?? "");
  }, [
    onSelectedRegisterIdChange,
    preferredRegisterIds,
    registers,
    selectedRegisterId,
  ]);

  const selectedRegister = useMemo(
    () => registers.find((register) => register.id === selectedRegisterId) ?? null,
    [registers, selectedRegisterId],
  );
  const activeSession = activeSessionDetail ?? selectedRegister?.activeSession ?? null;
  const openingFloatValue = useMemo(
    () => parseMonetaryInput(openingFloatAmount),
    [openingFloatAmount],
  );
  const countedClosingValue = useMemo(
    () => parseMonetaryInput(countedClosingAmount),
    [countedClosingAmount],
  );
  const movementAmountValue = useMemo(
    () => parseMonetaryInput(movementAmount),
    [movementAmount],
  );
  const liveDiscrepancy = useMemo(() => {
    if (!activeSession || !Number.isFinite(countedClosingValue)) {
      return 0;
    }

    return Number((countedClosingValue - activeSession.expectedBalanceAmount).toFixed(2));
  }, [activeSession, countedClosingValue]);
  const movementItems = activeSessionDetail?.movements ?? [];
  const isReviewRequiredSession = activeSession?.status === "closing_review_required";
  const isOpenSession = activeSession?.status === "open";
  const isOpeningFloatInvalid =
    shouldShowOpeningFieldErrors &&
    (!Number.isFinite(openingFloatValue) || openingFloatValue < 0);
  const isCountedClosingInvalid =
    shouldShowClosingFieldErrors && !Number.isFinite(countedClosingValue);
  const isMovementAmountInvalid =
    shouldShowMovementFieldErrors &&
    (!Number.isFinite(movementAmountValue) || movementAmountValue <= 0);
  const todayBusinessDate = useMemo(() => formatOperationalDate(new Date()), []);

  useEffect(() => {
    if (businessDate.length > 0) {
      return;
    }

    setBusinessDate(todayBusinessDate);
  }, [businessDate, todayBusinessDate]);

  useEffect(() => {
    if (canBackdateSessionOpen || businessDate === todayBusinessDate) {
      return;
    }

    setBusinessDate(todayBusinessDate);
  }, [businessDate, canBackdateSessionOpen, todayBusinessDate]);

  const loadActiveSession = useCallback(
    async (registerId: string): Promise<void> => {
      setIsLoadingActiveSession(true);
      setLoadError(null);
      try {
        const { response, data } = await fetchJsonNoStore<unknown>(
          `/api/v1/cash-registers/${registerId}/active-session`,
        );
        if (!response.ok || !data) {
          throw new Error(cashSessionMessages.loadError);
        }

        const parsed = activeCashRegisterSessionResponseDTOSchema.safeParse(data);
        if (!parsed.success) {
          throw new Error(cashSessionMessages.loadError);
        }

        setActiveSessionDetail(parsed.data.session);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : cashSessionMessages.loadError;
        setLoadError(message);
      } finally {
        setIsLoadingActiveSession(false);
      }
    },
    [cashSessionMessages.loadError],
  );

  useEffect(() => {
    if (!selectedRegisterId) {
      setActiveSessionDetail(null);
      return;
    }

    void loadActiveSession(selectedRegisterId);
  }, [loadActiveSession, refreshToken, selectedRegisterId]);

  useEffect(() => {
    if (!isCloseModalOpen) {
      setShouldShowClosingFieldErrors(false);
    }
  }, [isCloseModalOpen]);

  useEffect(() => {
    if (!isMovementModalOpen) {
      setShouldShowMovementFieldErrors(false);
    }
  }, [isMovementModalOpen]);

  const retryOfflineMovementSync = useCallback(async (): Promise<void> => {
    const result = await flushOfflineSyncQueue();
    refreshPendingOfflineMovementCount();

    if (result.synced > 0 && result.failed === 0 && result.pending === 0) {
      showSuccessToast({
        description: messages.common.feedback.offlineSyncSuccess,
      });
      if (selectedRegisterId) {
        await loadRegisters();
        await loadActiveSession(selectedRegisterId);
      }
      return;
    }

    if (result.failed > 0 || result.pending > 0) {
      showErrorToast({
        description: messages.common.feedback.offlineSyncPending,
      });
    }
  }, [
    loadActiveSession,
    loadRegisters,
    messages.common.feedback.offlineSyncPending,
    messages.common.feedback.offlineSyncSuccess,
    refreshPendingOfflineMovementCount,
    selectedRegisterId,
  ]);

  const handleOpenSession = useCallback(async (): Promise<void> => {
    setShouldShowOpeningFieldErrors(true);
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
          businessDate,
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
      setShouldShowOpeningFieldErrors(false);
      setCountedClosingAmount("");
      setClosingNotes("");
      showSuccessToast({
        description: cashSessionMessages.openSuccess(selectedRegister.name),
      });
      await loadRegisters();
      await loadActiveSession(selectedRegister.id);
    } finally {
      setIsOpening(false);
    }
  }, [
    cashSessionMessages,
    businessDate,
    loadActiveSession,
    loadRegisters,
    openingNotes,
    openingFloatValue,
    selectedRegister,
  ]);

  const handleCloseSession = useCallback(async (): Promise<void> => {
    setShouldShowClosingFieldErrors(true);
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
      setShouldShowClosingFieldErrors(false);
      setIsCloseModalOpen(false);
      if (parsed.data.status === "closing_review_required") {
        showInfoToast({
          description: cashSessionMessages.closeReviewRequired(selectedRegister.name),
        });
      } else {
        setActiveSessionDetail(null);
        showSuccessToast({
          description: cashSessionMessages.closeSuccess(selectedRegister.name),
        });
      }
      await loadRegisters();
      await loadActiveSession(selectedRegister.id);
    } finally {
      setIsClosing(false);
    }
  }, [
    activeSession,
    cashSessionMessages,
    closingNotes,
    countedClosingValue,
    loadActiveSession,
    loadRegisters,
    selectedRegister,
  ]);

  const handleApproveCloseout = useCallback(async (): Promise<void> => {
    if (!activeSession || !selectedRegister || !isReviewRequiredSession) {
      showErrorToast({ description: cashSessionMessages.approveErrorFallback });
      return;
    }

    setIsApprovingCloseout(true);
    try {
      const response = await fetch(
        `/api/v1/cash-register-sessions/${activeSession.id}/approve-closeout`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            approvalNotes: approvalNotes.trim() || undefined,
          }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showErrorToast({
          description: resolveApiErrorMessage(
            payload,
            cashSessionMessages.approveErrorFallback,
          ),
        });
        return;
      }

      const parsed = cashRegisterSessionResponseDTOSchema.safeParse(payload);
      if (!parsed.success) {
        showErrorToast({ description: cashSessionMessages.approveErrorFallback });
        return;
      }

      setApprovalNotes("");
      setIsReviewModalOpen(false);
      setActiveSessionDetail(null);
      showSuccessToast({
        description: cashSessionMessages.closeApprovalSuccess(selectedRegister.name),
      });
      await loadRegisters();
      await loadActiveSession(selectedRegister.id);
    } finally {
      setIsApprovingCloseout(false);
    }
  }, [
    activeSession,
    approvalNotes,
    cashSessionMessages,
    isReviewRequiredSession,
    loadActiveSession,
    loadRegisters,
    selectedRegister,
  ]);

  const handleReopenForRecount = useCallback(async (): Promise<void> => {
    if (!activeSession || !selectedRegister || !isReviewRequiredSession) {
      showErrorToast({ description: cashSessionMessages.reopenErrorFallback });
      return;
    }

    setIsReopeningForRecount(true);
    try {
      const response = await fetch(
        `/api/v1/cash-register-sessions/${activeSession.id}/reopen`,
        {
          method: "POST",
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showErrorToast({
          description: resolveApiErrorMessage(
            payload,
            cashSessionMessages.reopenErrorFallback,
          ),
        });
        return;
      }

      const parsed = cashRegisterSessionDetailResponseDTOSchema.safeParse(payload);
      if (!parsed.success) {
        showErrorToast({ description: cashSessionMessages.reopenErrorFallback });
        return;
      }

      setApprovalNotes("");
      setIsReviewModalOpen(false);
      setActiveSessionDetail(parsed.data);
      showSuccessToast({
        description: cashSessionMessages.closeReopenedSuccess(selectedRegister.name),
      });
      await loadRegisters();
    } finally {
      setIsReopeningForRecount(false);
    }
  }, [
    activeSession,
    cashSessionMessages,
    isReviewRequiredSession,
    loadRegisters,
    selectedRegister,
  ]);

  const handleRecordMovement = useCallback(async (): Promise<void> => {
    setShouldShowMovementFieldErrors(true);
    if (
      !activeSession ||
      !selectedRegister ||
      !currentActorId ||
      !Number.isFinite(movementAmountValue) ||
      movementAmountValue <= 0
    ) {
      showErrorToast({ description: cashSessionMessages.movementErrorFallback });
      return;
    }

    setIsRecordingMovement(true);
    try {
      const response = await fetch(
        `/api/v1/cash-register-sessions/${activeSession.id}/movements`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            movementType,
            amount: movementAmountValue,
            direction: movementType === "adjustment" ? movementDirection : undefined,
            notes: movementNotes.trim() || undefined,
          }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showErrorToast({
          description: resolveApiErrorMessage(
            payload,
            cashSessionMessages.movementErrorFallback,
          ),
        });
        return;
      }

      const parsed = cashRegisterSessionDetailResponseDTOSchema.safeParse(payload);
      if (!parsed.success) {
        showErrorToast({ description: cashSessionMessages.movementErrorFallback });
        return;
      }

      setActiveSessionDetail(parsed.data);
      setMovementType("cash_paid_in");
      setMovementDirection("inbound");
      setMovementAmount("");
      setMovementNotes("");
      setShouldShowMovementFieldErrors(false);
      setIsMovementModalOpen(false);
      showSuccessToast({
        description: cashSessionMessages.movementSuccess,
      });
      await loadRegisters();
      refreshPendingOfflineMovementCount();
    } catch {
      enqueueOfflineSyncEvent({
        eventType: "cash_movement_recorded",
        payload: {
          sessionId: activeSession.id,
          actorId: currentActorId,
          movementType,
          amount: movementAmountValue,
          direction: movementType === "adjustment" ? movementDirection : undefined,
          notes: movementNotes.trim() || undefined,
        },
        idempotencyKey: `cash-movement-offline-${crypto.randomUUID()}`,
      });
      refreshPendingOfflineMovementCount();
      setMovementType("cash_paid_in");
      setMovementDirection("inbound");
      setMovementAmount("");
      setMovementNotes("");
      setShouldShowMovementFieldErrors(false);
      setIsMovementModalOpen(false);
      showInfoToast({
        description: cashSessionMessages.movementSavedOffline,
      });
    } finally {
      setIsRecordingMovement(false);
    }
  }, [
    activeSession,
    cashSessionMessages,
    currentActorId,
    loadRegisters,
    movementAmountValue,
    movementDirection,
    movementNotes,
    movementType,
    refreshPendingOfflineMovementCount,
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
              ? isReviewRequiredSession
                ? cashSessionMessages.reviewRequiredTitle
                : cashSessionMessages.activeSessionTitle
              : cashSessionMessages.noSessionTitle}
          </h2>
          <p className="mt-1 max-w-[48rem] text-sm text-slate-500">
            {activeSession
              ? isReviewRequiredSession
                ? cashSessionMessages.reviewRequiredDescription
                : cashSessionMessages.activeSessionDescription
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
            onChange={(event) => onSelectedRegisterIdChange(event.target.value)}
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
                      {cashSessionMessages.businessDateLabel}:{" "}
                      {formatBusinessDate(activeSession.businessDate)}
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

                {isReviewRequiredSession ? (
                  <div
                    data-testid="cash-session-review-required-banner"
                    className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-amber-900">
                      {cashSessionMessages.closeoutPendingHint}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-amber-900 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold">
                          {cashSessionMessages.closeoutSubmittedByLabel}:
                        </span>{" "}
                        {activeSession.closeoutSubmittedByDisplayName ??
                          activeSession.closeoutSubmittedByUserId ??
                          activeSession.openedByDisplayName}
                      </p>
                      {activeSession.closeoutSubmittedAt ? (
                        <p>
                          <span className="font-semibold">
                            {cashSessionMessages.closeoutSubmittedAtLabel}:
                          </span>{" "}
                          {formatDateTime(activeSession.closeoutSubmittedAt)}
                        </p>
                      ) : null}
                    </div>
                    {activeSession.closingNotes ? (
                      <p className="mt-3 text-sm text-amber-900">
                        {activeSession.closingNotes}
                      </p>
                    ) : null}
                  </div>
                ) : activeSession.openingNotes ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {activeSession.openingNotes}
                  </div>
                ) : null}
              </div>

              {isReviewRequiredSession ? (
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {cashSessionMessages.expectedBalanceLabel}
                    </p>
                    <p className="mt-2 text-[1.75rem] font-bold tracking-tight text-slate-900">
                      {currency(activeSession.expectedBalanceAmount)}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                      {cashSessionMessages.closingCountedLabel}
                    </p>
                    <p className="mt-2 text-[1.75rem] font-bold tracking-tight text-sky-700">
                      {currency(activeSession.countedClosingAmount ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      {cashSessionMessages.discrepancyLabel}
                    </p>
                    <p className="mt-2 text-[1.75rem] font-bold tracking-tight text-amber-700">
                      {currency(activeSession.discrepancyAmount ?? 0)}
                    </p>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {!canCloseSession ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                {cashSessionMessages.readOnlyHint}
              </div>
            ) : isReviewRequiredSession ? (
              canApproveDiscrepancyClose ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    data-testid="cash-session-review-approve-button"
                    onClick={() => {
                      setApprovalNotes("");
                      setIsReviewModalOpen(true);
                    }}
                    className="min-h-[52px] rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.98rem] font-semibold text-white shadow-[0_16px_26px_rgba(28,109,234,0.28)]"
                  >
                    {cashSessionMessages.approveCloseoutAction}
                  </button>
                  <button
                    type="button"
                    data-testid="cash-session-review-reopen-button"
                    disabled={isReopeningForRecount}
                    onClick={() => {
                      void handleReopenForRecount();
                    }}
                    className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-5 text-[0.98rem] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cashSessionMessages.reopenForRecountAction}
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  {cashSessionMessages.closeoutPendingReadOnlyHint}
                </div>
              )
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {canRecordManualCashMovement ? (
                  <button
                    type="button"
                    data-testid="cash-session-add-movement-button"
                    onClick={() => {
                      setMovementType("cash_paid_in");
                      setMovementDirection("inbound");
                      setMovementAmount("");
                      setMovementNotes("");
                      setIsMovementModalOpen(true);
                    }}
                    className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-5 text-[0.98rem] font-semibold text-slate-700"
                  >
                    {cashSessionMessages.recordMovementAction}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                    {cashSessionMessages.movementReadOnlyHint}
                  </div>
                )}
                <button
                  type="button"
                  data-testid="cash-session-close-button"
                  onClick={() => {
                    setCountedClosingAmount(
                      activeSession.expectedBalanceAmount.toFixed(2),
                    );
                    setIsCloseModalOpen(true);
                  }}
                  className="min-h-[52px] rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.98rem] font-semibold text-white shadow-[0_16px_26px_rgba(28,109,234,0.28)]"
                >
                  {cashSessionMessages.closeAction}
                </button>
              </div>
            )}

            <div className="mt-4 rounded-[1.65rem] border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-4">
                <h3 className="text-[1.1rem] font-semibold text-slate-900">
                  {cashSessionMessages.movementsTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {cashSessionMessages.movementsDescription}
                </p>
                {pendingOfflineMovementCount > 0 ? (
                  <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">
                      {cashSessionMessages.movementSavedOffline}
                    </p>
                    <button
                      type="button"
                      data-testid="cash-session-retry-offline-sync-button"
                      onClick={() => {
                        void retryOfflineMovementSync();
                      }}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)]"
                    >
                      {cashSessionMessages.retryOfflineSyncButton(
                        pendingOfflineMovementCount,
                      )}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="max-h-[18rem] overflow-y-auto px-4 py-4">
                {isLoadingActiveSession ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                    {messages.common.states.loading}
                  </div>
                ) : movementItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                    {cashSessionMessages.movementsEmpty}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {movementItems.map((movement) => (
                      <div
                        key={movement.id}
                        data-testid={`cash-session-movement-item-${movement.id}`}
                        className="flex items-start justify-between gap-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[1rem] font-semibold text-slate-900">
                            {
                              cashSessionMessages.movementTypeLabels[
                                movement.movementType
                              ]
                            }
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDateTime(movement.occurredAt)} · {movement.performedByDisplayName}
                          </p>
                          {movement.notes ? (
                            <p className="mt-2 text-sm text-slate-600">{movement.notes}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {movement.direction === "inbound"
                              ? cashSessionMessages.movementDirectionLabels.inbound
                              : cashSessionMessages.movementDirectionLabels.outbound}
                          </p>
                          <p
                            className={`mt-2 text-[1.35rem] font-bold tracking-tight ${resolveMovementAmountClassName(movement.direction)}`}
                          >
                            {movement.direction === "inbound" ? "+" : "-"}
                            {currency(movement.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[1.65rem] border border-slate-200 bg-[#f8fafc] p-4">
            <div
              className={[
                "grid gap-3 lg:items-end",
                canBackdateSessionOpen
                  ? "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_auto]"
                  : "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]",
              ].join(" ")}
            >
              {canBackdateSessionOpen ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {cashSessionMessages.businessDateLabel}
                  </label>
                  <DatePicker
                    value={businessDate}
                    onChange={setBusinessDate}
                    placeholder={cashSessionMessages.businessDatePlaceholder}
                    testId="cash-session-business-date-input"
                    max={todayBusinessDate}
                    allowClear={false}
                    className="mt-2"
                    buttonClassName="min-h-[52px] rounded-2xl border-slate-200 bg-white text-[1rem]"
                  />
                </div>
              ) : null}

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {cashSessionMessages.openingFloatLabel}
                </label>
                <Input
                  data-testid="cash-session-opening-float-input"
                  {...getFormControlValidationProps(isOpeningFloatInvalid)}
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

      {isMovementModalOpen && activeSession ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4"
          onClick={() => setIsMovementModalOpen(false)}
        >
          <div className="relative flex min-h-full items-center justify-center">
            <FloatingModalCloseButton
              ariaLabel={messages.common.actions.close}
              onClick={() => setIsMovementModalOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              data-testid="cash-session-movement-modal"
              className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[32rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-slate-200/80 px-5 py-4 lg:px-6 lg:py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {cashSessionMessages.title}
                </p>
                <h3 className="mt-1 text-[1.7rem] font-semibold tracking-tight text-slate-900">
                  {cashSessionMessages.movementModalTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {cashSessionMessages.movementModalDescription}
                </p>
              </div>

              <div className="min-h-0 overflow-y-auto px-5 py-4 lg:px-6 lg:py-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {cashSessionMessages.movementTypeLabel}
                    </label>
                    <select
                      data-testid="cash-session-movement-type-select"
                      value={movementType}
                      onChange={(event) => setMovementType(event.target.value as ManualMovementType)}
                      className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-[1rem] font-semibold text-slate-900 outline-none"
                    >
                      <option value="cash_paid_in">
                        {cashSessionMessages.movementTypeLabels.cash_paid_in}
                      </option>
                      <option value="cash_paid_out">
                        {cashSessionMessages.movementTypeLabels.cash_paid_out}
                      </option>
                      <option value="safe_drop">
                        {cashSessionMessages.movementTypeLabels.safe_drop}
                      </option>
                      <option value="adjustment">
                        {cashSessionMessages.movementTypeLabels.adjustment}
                      </option>
                    </select>
                  </div>

                  {movementType === "adjustment" ? (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {cashSessionMessages.movementDirectionLabel}
                      </label>
                      <select
                        data-testid="cash-session-movement-direction-select"
                        value={movementDirection}
                        onChange={(event) =>
                          setMovementDirection(
                            event.target.value as ManualMovementDirection,
                          )
                        }
                        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-[1rem] font-semibold text-slate-900 outline-none"
                      >
                        <option value="inbound">
                          {cashSessionMessages.movementDirectionLabels.inbound}
                        </option>
                        <option value="outbound">
                          {cashSessionMessages.movementDirectionLabels.outbound}
                        </option>
                      </select>
                    </div>
                  ) : null}

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {cashSessionMessages.movementAmountLabel}
                    </label>
                    <Input
                      data-testid="cash-session-movement-amount-input"
                      {...getFormControlValidationProps(isMovementAmountInvalid)}
                      value={movementAmount}
                      onChange={(event) => setMovementAmount(event.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="mt-2 min-h-[52px] rounded-2xl border-slate-200 bg-white text-[1rem]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {cashSessionMessages.movementNotesLabel}
                    </label>
                    <Input
                      data-testid="cash-session-movement-notes-input"
                      value={movementNotes}
                      onChange={(event) => setMovementNotes(event.target.value)}
                      placeholder={cashSessionMessages.movementNotesPlaceholder}
                      className="mt-2 min-h-[52px] rounded-2xl border-slate-200 bg-white text-[1rem]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 px-5 py-4 lg:px-6 lg:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsMovementModalOpen(false)}
                    className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-5 text-[0.98rem] font-semibold text-slate-700"
                  >
                    {messages.common.actions.cancel}
                  </button>
                  <button
                    type="button"
                    data-testid="cash-session-movement-submit-button"
                    disabled={isRecordingMovement}
                    onClick={() => {
                      void handleRecordMovement();
                    }}
                    className="min-h-[52px] rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.98rem] font-semibold text-white shadow-[0_16px_26px_rgba(28,109,234,0.28)] disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
                  >
                    {isRecordingMovement
                      ? messages.common.states.saving
                      : cashSessionMessages.movementSaveAction}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                      {...getFormControlValidationProps(isCountedClosingInvalid)}
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

      {isReviewModalOpen && activeSession && isReviewRequiredSession ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4"
          onClick={() => setIsReviewModalOpen(false)}
        >
          <div className="relative flex min-h-full items-center justify-center">
            <FloatingModalCloseButton
              ariaLabel={messages.common.actions.close}
              onClick={() => setIsReviewModalOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              data-testid="cash-session-review-modal"
              className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[34rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-slate-200/80 px-5 py-4 lg:px-6 lg:py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {cashSessionMessages.title}
                </p>
                <h3 className="mt-1 text-[1.7rem] font-semibold tracking-tight text-slate-900">
                  {cashSessionMessages.reviewModalTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {cashSessionMessages.reviewModalDescription}
                </p>
              </div>

              <div className="min-h-0 overflow-y-auto px-5 py-4 lg:px-6 lg:py-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {cashSessionMessages.expectedBalanceLabel}
                    </p>
                    <p className="mt-2 text-[1.65rem] font-bold tracking-tight text-slate-900">
                      {currency(activeSession.expectedBalanceAmount)}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                      {cashSessionMessages.closingCountedLabel}
                    </p>
                    <p className="mt-2 text-[1.65rem] font-bold tracking-tight text-sky-700">
                      {currency(activeSession.countedClosingAmount ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      {cashSessionMessages.discrepancyLabel}
                    </p>
                    <p className="mt-2 text-[1.65rem] font-bold tracking-tight text-amber-700">
                      {currency(activeSession.discrepancyAmount ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">
                      {cashSessionMessages.closeoutSubmittedByLabel}:
                    </span>{" "}
                    {activeSession.closeoutSubmittedByDisplayName ??
                      activeSession.closeoutSubmittedByUserId ??
                      activeSession.openedByDisplayName}
                  </p>
                  {activeSession.closeoutSubmittedAt ? (
                    <p className="mt-2">
                      <span className="font-semibold text-slate-900">
                        {cashSessionMessages.closeoutSubmittedAtLabel}:
                      </span>{" "}
                      {formatDateTime(activeSession.closeoutSubmittedAt)}
                    </p>
                  ) : null}
                  {activeSession.closingNotes ? (
                    <p className="mt-3 text-slate-700">{activeSession.closingNotes}</p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {cashSessionMessages.approvalNotesLabel}
                  </label>
                  <Input
                    data-testid="cash-session-approval-notes-input"
                    value={approvalNotes}
                    onChange={(event) => setApprovalNotes(event.target.value)}
                    placeholder={cashSessionMessages.approvalNotePlaceholder}
                    className="mt-2 min-h-[52px] rounded-2xl border-slate-200 bg-white text-[1rem]"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200/80 px-5 py-4 lg:px-6 lg:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-5 text-[0.98rem] font-semibold text-slate-700"
                  >
                    {messages.common.actions.cancel}
                  </button>
                  <button
                    type="button"
                    data-testid="cash-session-review-modal-reopen-button"
                    disabled={isReopeningForRecount}
                    onClick={() => {
                      void handleReopenForRecount();
                    }}
                    className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-5 text-[0.98rem] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cashSessionMessages.reopenForRecountAction}
                  </button>
                  <button
                    type="button"
                    data-testid="cash-session-review-modal-approve-button"
                    disabled={isApprovingCloseout}
                    onClick={() => {
                      void handleApproveCloseout();
                    }}
                    className="min-h-[52px] rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.98rem] font-semibold text-white shadow-[0_16px_26px_rgba(28,109,234,0.28)] disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
                  >
                    {isApprovingCloseout
                      ? messages.common.states.saving
                      : cashSessionMessages.approveCloseoutAction}
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
