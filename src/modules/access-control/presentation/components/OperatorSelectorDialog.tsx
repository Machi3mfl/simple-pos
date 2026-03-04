"use client";

import { Loader2, ShieldCheck, Store, UserRound } from "lucide-react";

import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";

import type { SelectableActorSummary } from "../../domain/types/PermissionSnapshot";

interface OperatorSelectorDialogProps {
  readonly isOpen: boolean;
  readonly actors: readonly SelectableActorSummary[];
  readonly currentActorId?: string;
  readonly isLoading: boolean;
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly onClose: () => void;
  readonly onRetryLoad: () => void;
  readonly onSelectActor: (userId: string) => void;
}

export function OperatorSelectorDialog({
  isOpen,
  actors,
  currentActorId,
  isLoading,
  isSubmitting,
  errorMessage,
  onClose,
  onRetryLoad,
  onSelectActor,
}: OperatorSelectorDialogProps): JSX.Element | null {
  const { messages } = useI18n();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/42 p-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <FloatingModalCloseButton
        onClick={onClose}
        ariaLabel={messages.common.actions.close}
        testId="operator-selector-close-button"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="operator-selector-title"
        data-testid="operator-selector-dialog"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[62rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_32px_80px_rgba(15,23,42,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-slate-200 px-5 py-5 md:px-6">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(219,234,254,0.94))] text-blue-700">
              <UserRound className="size-7" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {messages.accessControl.operatorSessionEyebrow}
              </p>
              <h2
                id="operator-selector-title"
                className="mt-2 text-[1.9rem] font-semibold tracking-tight text-slate-900 md:text-[2.15rem]"
              >
                {messages.accessControl.operatorSelectorTitle}
              </h2>
              <p className="mt-2 max-w-[42rem] text-sm text-slate-600 md:text-base">
                {messages.accessControl.operatorSelectorDescription}
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
          {errorMessage ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={onRetryLoad}
                className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700"
              >
                {messages.common.actions.refresh}
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-[15rem] items-center justify-center rounded-[1.8rem] border border-slate-200 bg-white">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="size-5 animate-spin" aria-hidden />
                <span className="text-sm font-semibold">{messages.common.states.loading}</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {actors.map((actor) => {
                const isCurrent = actor.actorId === currentActorId;

                return (
                  <button
                    key={actor.actorId}
                    type="button"
                    data-testid={`operator-selector-item-${actor.actorId}`}
                    onClick={() => onSelectActor(actor.actorId)}
                    disabled={isSubmitting}
                    className={[
                      "rounded-[1.6rem] border px-4 py-4 text-left transition",
                      isCurrent
                        ? "border-blue-300 bg-blue-50 shadow-[0_14px_28px_rgba(37,99,235,0.12)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[1.2rem] font-semibold tracking-tight text-slate-900">
                          {actor.displayName}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {actor.roleNames.map((roleName) => (
                            <span
                              key={`${actor.actorId}-${roleName}`}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.78rem] font-semibold text-slate-600"
                            >
                              <ShieldCheck className="size-3.5 text-slate-400" aria-hidden />
                              {roleName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[0.72rem] font-semibold text-blue-700">
                          {messages.accessControl.currentOperatorBadge}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <Store className="size-4 text-slate-400" aria-hidden />
                        {actor.assignedRegisterIds.length > 0
                          ? messages.accessControl.assignedRegistersSummary(
                              actor.assignedRegisterIds.length,
                            )
                          : messages.accessControl.noRegisterAssignment}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
