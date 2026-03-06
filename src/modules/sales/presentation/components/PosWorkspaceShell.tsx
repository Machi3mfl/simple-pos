"use client";

import {
  BarChart3,
  CloudOff,
  PackagePlus,
  ReceiptText,
  ShieldUser,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { useActorSession } from "@/modules/access-control/presentation/context/ActorSessionContext";
import { canAccessWorkspace } from "@/modules/access-control/presentation/workspaceAccess";
import {
  isPosWorkspaceId,
  workspacePathById,
  type PosWorkspaceId,
} from "@/modules/sales/presentation/posWorkspace";

import { LeftNavRail, type PosNavItem } from "./LeftNavRail";
import { MobileWorkspaceNav } from "./MobileWorkspaceNav";

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
  const {
    currentActor,
    permissionSnapshot,
    sessionSource,
    isAuthenticated,
    canSwitchActor,
    openOperatorSelector,
    clearAssumedActor,
    signOut,
    status,
  } =
    useActorSession();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const navItems = useMemo<readonly PosNavItem[]>(
    () => [
      { id: "cash-register", label: messages.shell.nav.cashRegister, icon: ShoppingCart },
      { id: "sales", label: messages.shell.nav.sales, icon: ReceiptText },
      { id: "products", label: messages.shell.nav.products, icon: PackagePlus },
      { id: "receivables", label: messages.shell.nav.receivables, icon: Wallet },
      { id: "reporting", label: messages.shell.nav.reporting, icon: BarChart3 },
      { id: "users-admin", label: messages.shell.nav.usersAdmin, icon: ShieldUser },
      { id: "sync", label: messages.shell.nav.sync, icon: CloudOff },
    ].filter((item) =>
      isPosWorkspaceId(item.id)
        ? canAccessWorkspace(item.id, permissionSnapshot)
        : false,
    ),
    [messages, permissionSnapshot],
  );
  const authActionLabel =
    status === "loading" || isSigningOut
      ? undefined
      : isAuthenticated
        ? messages.accessControl.signOutAction
        : messages.accessControl.signInAction;
  const canOpenOperatorSelector =
    canSwitchActor && currentActor?.roleCodes.includes("system_admin") === true;
  const activeWorkspaceLabel =
    navItems.find((item) => item.id === activeItemId)?.label ?? messages.shell.nav.cashRegister;

  const handleAuthAction = (): void => {
    if (isAuthenticated) {
      setIsSigningOut(true);
      void signOut()
        .then(() => {
          router.replace("/login");
        })
        .catch(() => {
          setIsSigningOut(false);
        });
      return;
    }

    if (sessionSource === "assumed_user") {
      setIsSigningOut(true);
      void clearAssumedActor()
        .then(() => {
          router.replace("/login");
        })
        .catch(() => {
          setIsSigningOut(false);
        });
      return;
    }

    router.replace("/login");
  };

  const handleItemSelect = (itemId: string): void => {
    if (isPosWorkspaceId(itemId)) {
      router.push(workspacePathById[itemId]);
    }
  };

  return (
    <main className="min-h-dvh w-full overflow-hidden bg-[#f7f7f8]">
      <div className="flex min-h-dvh flex-col lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[180px_minmax(0,1fr)]">
        <MobileWorkspaceNav
          isOpen={isMobileNavOpen}
          activeItemId={activeItemId}
          activeItemLabel={activeWorkspaceLabel}
          items={navItems}
          actorDisplayName={currentActor?.displayName ?? messages.accessControl.loadingActor}
          isLoadingActor={status === "loading" || isSigningOut}
          isAuthenticated={isAuthenticated}
          canOpenOperatorSelector={canOpenOperatorSelector}
          onOpenOperatorSelector={openOperatorSelector}
          authActionLabel={authActionLabel}
          onAuthAction={handleAuthAction}
          onItemSelect={handleItemSelect}
          onToggle={() => setIsMobileNavOpen((current) => !current)}
          onClose={() => setIsMobileNavOpen(false)}
        />

        <div className="hidden lg:block">
          <LeftNavRail
            items={navItems}
            activeItemId={activeItemId}
            actorDisplayName={currentActor?.displayName ?? messages.accessControl.loadingActor}
            isLoadingActor={status === "loading" || isSigningOut}
            isAuthenticated={isAuthenticated}
            canOpenOperatorSelector={canOpenOperatorSelector}
            onOpenOperatorSelector={openOperatorSelector}
            authActionLabel={authActionLabel}
            onAuthAction={handleAuthAction}
            onItemSelect={handleItemSelect}
          />
        </div>

        <section className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8]">{children}</section>
      </div>
    </main>
  );
}
