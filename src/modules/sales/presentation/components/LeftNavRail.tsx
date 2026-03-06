import type { LucideIcon } from "lucide-react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";

export interface PosNavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

interface LeftNavRailProps {
  readonly items: readonly PosNavItem[];
  readonly activeItemId: string;
  readonly actorDisplayName: string;
  readonly isLoadingActor?: boolean;
  readonly isAuthenticated: boolean;
  readonly canOpenOperatorSelector?: boolean;
  readonly onOpenOperatorSelector?: () => void;
  readonly authActionLabel?: string;
  readonly onAuthAction?: () => void;
  readonly onItemSelect: (itemId: string) => void;
}

export function LeftNavRail({
  items,
  activeItemId,
  actorDisplayName,
  isLoadingActor = false,
  isAuthenticated,
  canOpenOperatorSelector = false,
  onOpenOperatorSelector,
  authActionLabel,
  onAuthAction,
  onItemSelect,
}: LeftNavRailProps): JSX.Element {
  const { messages } = useI18n();
  const authActionDisplayLabel =
    isAuthenticated && !isLoadingActor && authActionLabel
      ? `${authActionLabel} · ${actorDisplayName}`
      : authActionLabel;

  return (
    <aside
      data-testid="left-nav-rail"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[#060910] via-[#04070f] to-[#03050c] p-3 text-slate-100 lg:p-4"
    >
      <div
        data-testid="app-logo-slot"
        className="mt-1 flex flex-col items-center rounded-[1.2rem] border border-[#1f2735] bg-[#0b1220] px-2 py-2"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-base font-bold text-white shadow-[0_8px_16px_rgba(23,104,232,0.32)]">
          S
        </span>
        <p className="mt-2 whitespace-nowrap text-[0.86rem] font-semibold tracking-[0.02em] text-white">
          simple pos
        </p>
      </div>

      {canOpenOperatorSelector && onOpenOperatorSelector ? (
        <button
          type="button"
          data-testid="open-operator-selector-button"
          onClick={onOpenOperatorSelector}
          className="mt-2 inline-flex min-h-[2.6rem] w-full items-center justify-center rounded-xl border border-[#2b3342] bg-[#0f1725] px-3 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-[#3b465a] hover:text-white"
        >
          {messages.accessControl.operatorSelectorTitle}
        </button>
      ) : null}

      <nav className="mt-6 flex flex-1 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItemId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemSelect(item.id)}
              data-testid={`nav-item-${item.id}`}
              className={[
                "flex min-h-[4rem] min-w-[5.25rem] flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 text-center text-sm font-medium transition",
                isActive
                  ? "bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-white shadow-[0_12px_24px_rgba(23,104,232,0.45)]"
                  : "text-slate-200 hover:text-white",
              ].join(" ")}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              <span
                className={[
                  "flex size-9 items-center justify-center rounded-full border text-slate-100",
                  isActive
                    ? "border-transparent bg-transparent"
                    : "border-[#2b3342] bg-[#0f1725]",
                ].join(" ")}
              >
                <Icon size={17} />
              </span>
              <span className="text-[1.05rem] leading-none lg:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {authActionDisplayLabel && onAuthAction ? (
        <div className="mt-3 border-t border-[#1f2735] pt-3">
          {isAuthenticated ? (
            <p
              data-testid="actor-session-source-label"
              className="mb-1 truncate text-[0.68rem] font-medium uppercase tracking-[0.13em] text-slate-400"
            >
              {isLoadingActor ? messages.common.states.loading : actorDisplayName}
            </p>
          ) : null}
          <button
            type="button"
            data-testid="actor-auth-action-button"
            onClick={onAuthAction}
            className="inline-flex min-h-[2.7rem] w-full items-center justify-center rounded-xl border border-[#2b3342] bg-[#0f1725] px-3 text-center text-[0.98rem] font-semibold text-slate-200 transition hover:border-[#3b465a] hover:text-white"
          >
            <span className="truncate">{authActionDisplayLabel}</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
