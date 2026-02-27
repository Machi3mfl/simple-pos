import type { LucideIcon } from "lucide-react";

export interface PosNavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

interface LeftNavRailProps {
  readonly items: readonly PosNavItem[];
  readonly activeItemId: string;
}

export function LeftNavRail({
  items,
  activeItemId,
}: LeftNavRailProps): JSX.Element {
  return (
    <aside className="rounded-[2rem] bg-gradient-to-b from-slate-950 to-slate-900 p-4 text-slate-100 shadow-2xl shadow-slate-900/30 lg:h-full lg:p-5">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-800/60 p-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-cyan-400/25 text-sm font-semibold text-cyan-200">
          MT
        </div>
        <div>
          <p className="text-base font-semibold leading-none">Maxi Store</p>
          <p className="mt-1 text-xs text-slate-300">Cashier</p>
        </div>
      </div>

      <nav className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItemId;

          return (
            <button
              key={item.id}
              type="button"
              className={[
                "flex min-h-12 min-w-12 items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-medium transition",
                isActive
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-900/40"
                  : "bg-slate-800/50 text-slate-200 hover:bg-slate-700/70",
              ].join(" ")}
              aria-label={item.label}
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-black/25">
                <Icon size={18} />
              </span>
              <span className="pr-2 lg:block">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
