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
    <aside className="bg-gradient-to-b from-[#060910] via-[#04070f] to-[#03050c] p-4 text-slate-100 lg:h-full lg:p-6">
      <div className="mt-4 flex items-center gap-3 px-1">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#222b3a] text-sm font-semibold text-slate-200">
          👩🏼
        </div>
        <div>
          <p className="text-[2rem] leading-none font-semibold tracking-tight">Putri</p>
          <p className="mt-1 text-[0.85rem] text-slate-400">Cashire</p>
        </div>
      </div>

      <nav className="mt-12 flex gap-3 overflow-x-auto pb-1 lg:mt-12 lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItemId;

          return (
            <button
              key={item.id}
              type="button"
              className={[
                "flex min-h-[86px] min-w-[90px] flex-col items-center justify-center gap-2 rounded-2xl text-center text-sm font-medium transition",
                isActive
                  ? "bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-white shadow-[0_12px_24px_rgba(23,104,232,0.45)]"
                  : "text-slate-200 hover:text-white",
              ].join(" ")}
              aria-label={item.label}
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
