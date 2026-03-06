"use client";

import { Menu, X } from "lucide-react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";

import type { PosNavItem } from "./LeftNavRail";

interface MobileWorkspaceNavProps {
  readonly isOpen: boolean;
  readonly activeItemId: string;
  readonly activeItemLabel: string;
  readonly items: readonly PosNavItem[];
  readonly actorDisplayName: string;
  readonly isLoadingActor?: boolean;
  readonly isAuthenticated: boolean;
  readonly canOpenOperatorSelector?: boolean;
  readonly onOpenOperatorSelector?: () => void;
  readonly authActionLabel?: string;
  readonly onAuthAction?: () => void;
  readonly onItemSelect: (itemId: string) => void;
  readonly onToggle: () => void;
  readonly onClose: () => void;
}

export function MobileWorkspaceNav({
  isOpen,
  activeItemId,
  activeItemLabel,
  items,
  actorDisplayName,
  isLoadingActor = false,
  isAuthenticated,
  canOpenOperatorSelector = false,
  onOpenOperatorSelector,
  authActionLabel,
  onAuthAction,
  onItemSelect,
  onToggle,
  onClose,
}: MobileWorkspaceNavProps): JSX.Element {
  const { messages } = useI18n();
  const authActionDisplayLabel =
    isAuthenticated && !isLoadingActor && authActionLabel
      ? `${authActionLabel} · ${actorDisplayName}`
      : authActionLabel;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#1f2735] bg-gradient-to-b from-[#060910]/95 via-[#04070f]/95 to-[#03050c]/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#1f2735] bg-[#0b1220] px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-sm font-bold text-white shadow-[0_10px_18px_rgba(23,104,232,0.28)]">
              S
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Simple POS</p>
              <p className="truncate text-xs text-slate-300">{activeItemLabel}</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="mobile-nav-toggle-button"
            onClick={onToggle}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[#2b3342] bg-[#0f1725] text-slate-200 transition hover:border-[#3b465a] hover:text-white"
            aria-label={messages.common.actions.openMenu}
            aria-expanded={isOpen}
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={messages.common.actions.close}
            className="absolute inset-0 bg-slate-950/50"
            onClick={onClose}
          />

          <aside
            data-testid="mobile-nav-drawer"
            className="relative flex h-dvh w-[min(20rem,86vw)] flex-col overflow-hidden bg-gradient-to-b from-[#060910] via-[#04070f] to-[#03050c] p-3 text-slate-100 shadow-[0_22px_48px_rgba(2,6,23,0.5)]"
          >
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#1f2735] bg-[#0b1220] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-sm font-bold text-white shadow-[0_8px_16px_rgba(23,104,232,0.32)]">
                  S
                </span>
                <p className="truncate text-sm font-semibold text-white">Simple POS</p>
              </div>
              <button
                type="button"
                data-testid="mobile-nav-close-button"
                onClick={onClose}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#2b3342] bg-[#0f1725] text-slate-200"
                aria-label={messages.common.actions.close}
              >
                <X size={16} />
              </button>
            </div>

            {canOpenOperatorSelector && onOpenOperatorSelector ? (
              <button
                type="button"
                data-testid="mobile-open-operator-selector-button"
                onClick={() => {
                  onClose();
                  onOpenOperatorSelector();
                }}
                className="mt-3 inline-flex min-h-[2.6rem] w-full items-center justify-center rounded-xl border border-[#2b3342] bg-[#0f1725] px-3 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-[#3b465a] hover:text-white"
              >
                {messages.accessControl.operatorSelectorTitle}
              </button>
            ) : null}

            <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeItemId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`mobile-nav-item-${item.id}`}
                    onClick={() => {
                      onClose();
                      onItemSelect(item.id);
                    }}
                    className={[
                      "flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3 text-left text-[0.98rem] font-semibold transition",
                      isActive
                        ? "bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-white shadow-[0_12px_24px_rgba(23,104,232,0.45)]"
                        : "text-slate-200 hover:bg-[#0f1725] hover:text-white",
                    ].join(" ")}
                    aria-pressed={isActive}
                  >
                    <span
                      className={[
                        "flex size-8 items-center justify-center rounded-full border",
                        isActive
                          ? "border-transparent bg-transparent"
                          : "border-[#2b3342] bg-[#0f1725]",
                      ].join(" ")}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {authActionDisplayLabel && onAuthAction ? (
              <div className="mt-3 border-t border-[#1f2735] pt-3">
                {isAuthenticated ? (
                  <p className="mb-1 truncate text-[0.68rem] font-medium uppercase tracking-[0.13em] text-slate-400">
                    {isLoadingActor ? messages.common.states.loading : actorDisplayName}
                  </p>
                ) : null}
                <button
                  type="button"
                  data-testid="mobile-actor-auth-action-button"
                  onClick={() => {
                    onClose();
                    onAuthAction();
                  }}
                  className="inline-flex min-h-[2.7rem] w-full items-center justify-center rounded-xl border border-[#2b3342] bg-[#0f1725] px-3 text-center text-[0.96rem] font-semibold text-slate-200 transition hover:border-[#3b465a] hover:text-white"
                >
                  <span className="truncate">{authActionDisplayLabel}</span>
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
