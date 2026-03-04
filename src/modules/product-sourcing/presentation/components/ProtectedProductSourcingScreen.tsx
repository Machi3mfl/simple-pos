"use client";

import { useActorSession } from "@/modules/access-control/presentation/context/ActorSessionContext";
import { WorkspaceBlockedState } from "@/modules/access-control/presentation/components/WorkspaceBlockedState";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";

import { ProductSourcingScreen } from "./ProductSourcingScreen";

export function ProtectedProductSourcingScreen(): JSX.Element {
  const { messages } = useI18n();
  const { permissionSnapshot, status } = useActorSession();

  if (status === "loading") {
    return (
      <section className="min-w-0 bg-[#f7f7f8] p-4 lg:min-h-0 lg:overflow-y-auto lg:p-6">
        <div className="flex min-h-[calc(100dvh-6rem)] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-[1.1rem] font-semibold text-slate-700">
            {messages.accessControl.loadingPermissions}
          </p>
        </div>
      </section>
    );
  }

  if (!permissionSnapshot?.workspaces.products.canCreateFromSourcing) {
    return (
      <WorkspaceBlockedState
        title={messages.accessControl.blockedWorkspaceTitle("products")}
        description={messages.accessControl.blockedProductSourcingDescription}
      />
    );
  }

  return <ProductSourcingScreen embedded />;
}
