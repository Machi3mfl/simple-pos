import type { LucideIcon } from "lucide-react";
import { ChevronsUpDown } from "lucide-react";

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
  readonly actorRoleLabel: string;
  readonly actorRegisterSummary?: string;
  readonly actorSessionLabel?: string;
  readonly isLoadingActor?: boolean;
  readonly canOpenOperatorSelector?: boolean;
  readonly onOpenOperatorSelector: () => void;
  readonly onItemSelect: (itemId: string) => void;
}

export function LeftNavRail({
  items,
  activeItemId,
  actorDisplayName,
  actorRoleLabel,
  actorRegisterSummary,
  actorSessionLabel,
  isLoadingActor = false,
  canOpenOperatorSelector = true,
  onOpenOperatorSelector,
  onItemSelect,
}: LeftNavRailProps): JSX.Element {
  const { messages } = useI18n();

  return (
    <aside className="overflow-y-auto bg-gradient-to-b from-[#060910] via-[#04070f] to-[#03050c] p-4 text-slate-100 lg:h-full lg:min-h-0 lg:p-6">
      <button
        type="button"
        onClick={onOpenOperatorSelector}
        data-testid="open-operator-selector-button"
        disabled={!canOpenOperatorSelector}
        className="mt-4 flex w-full items-center gap-3 rounded-[1.3rem] px-1 py-1 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-80"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-[#222b3a] text-sm font-semibold text-slate-200">
          👩🏼
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[2rem] leading-none font-semibold tracking-tight">
            {isLoadingActor ? messages.accessControl.loadingActor : actorDisplayName}
          </p>
          <p className="mt-1 text-[0.85rem] text-slate-400">
            {isLoadingActor ? messages.common.states.loading : actorRoleLabel}
          </p>
          {actorRegisterSummary ? (
            <p className="mt-1 truncate text-[0.78rem] text-slate-500">
              {actorRegisterSummary}
            </p>
          ) : null}
          {actorSessionLabel ? (
            <p
              data-testid="actor-session-source-label"
              className="mt-2 inline-flex w-fit items-center rounded-full border border-[#2b3342] bg-[#0f1725] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-300"
            >
              {actorSessionLabel}
            </p>
          ) : null}
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#2b3342] bg-[#0f1725] text-slate-300">
          <ChevronsUpDown size={16} />
        </span>
      </button>

      <nav className="mt-12 flex gap-3 overflow-x-auto pb-1 lg:mt-12 lg:flex-col lg:overflow-visible">
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
                "flex min-h-[86px] min-w-[90px] flex-col items-center justify-center gap-2 rounded-2xl text-center text-sm font-medium transition",
                isActive
                  ? "bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-white shadow-[0_12px_24px_rgba(23,104,232,0.45)]"
                  : "text-slate-200 hover:text-white",
              ].join(" ")}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              <span
                className={[
                  "flex size-11 items-center justify-center rounded-full border text-slate-100",
                  isActive
                    ? "border-transparent bg-transparent"
                    : "border-[#2b3342] bg-[#0f1725]",
                ].join(" ")}
              >
                <Icon size={19} />
              </span>
              <span className="text-[1.12rem] leading-none lg:block">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
