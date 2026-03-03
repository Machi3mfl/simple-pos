"use client";

import {
  BarChart3,
  CloudOff,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import {
  isPosWorkspaceId,
  workspacePathById,
  type PosWorkspaceId,
} from "@/modules/sales/presentation/posWorkspace";

import { LeftNavRail, type PosNavItem } from "./LeftNavRail";

interface PosWorkspaceShellProps {
  readonly activeItemId: PosWorkspaceId;
  readonly children: React.ReactNode;
}

export function PosWorkspaceShell({
  activeItemId,
  children,
}: PosWorkspaceShellProps): JSX.Element {
  const { messages } = useI18n();
  const router = useRouter();
  const navItems = useMemo<readonly PosNavItem[]>(
    () => [
      { id: "cash-register", label: messages.shell.nav.sales, icon: ShoppingCart },
      { id: "orders", label: messages.shell.nav.orders, icon: ReceiptText },
      { id: "products", label: messages.shell.nav.products, icon: PackagePlus },
      { id: "receivables", label: messages.shell.nav.receivables, icon: Wallet },
      { id: "reporting", label: messages.shell.nav.reporting, icon: BarChart3 },
      { id: "sync", label: messages.shell.nav.sync, icon: CloudOff },
    ],
    [messages],
  );

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#f7f7f8]">
      <div className="grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)]">
        <LeftNavRail
          items={navItems}
          activeItemId={activeItemId}
          onItemSelect={(itemId) => {
            if (isPosWorkspaceId(itemId)) {
              router.push(workspacePathById[itemId]);
            }
          }}
        />

        <section className="min-w-0 overflow-y-auto bg-[#f7f7f8]">{children}</section>
      </div>
    </main>
  );
}
