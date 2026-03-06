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
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import { showErrorToast } from "@/hooks/use-app-toast";
import { useActorSession } from "@/modules/access-control/presentation/context/ActorSessionContext";
import { WorkspaceBlockedState } from "@/modules/access-control/presentation/components/WorkspaceBlockedState";
import { UsersAdminPanel } from "@/modules/access-control/presentation/components/UsersAdminPanel";
import { canAccessWorkspace } from "@/modules/access-control/presentation/workspaceAccess";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import { DebtManagementPanel } from "@/modules/accounts-receivable/presentation/components/DebtManagementPanel";
import { ProductsInventoryPanel } from "@/modules/products/presentation/components/ProductsInventoryPanel";
import { OrdersPanel } from "@/modules/reporting/presentation/components/OrdersPanel";
import { ReportingPanel } from "@/modules/reporting/presentation/components/ReportingPanel";
import { OfflineSyncPanel } from "@/modules/sync/presentation/components/OfflineSyncPanel";
import { CashRegisterSessionPanel } from "@/modules/cash-management/presentation/components/CashRegisterSessionPanel";
import {
  isPosWorkspaceId,
  workspacePathById,
  type PosWorkspaceId,
} from "@/modules/sales/presentation/posWorkspace";
import {
  dedupeCategoryCodes,
  normalizeCategoryCode,
  resolveCategoryEmoji,
  sortCategoryCodes,
} from "@/shared/core/category/categoryNaming";

import { CheckoutPanel, type CheckoutOrderItem } from "./CheckoutPanel";
import { LeftNavRail, type PosNavItem } from "./LeftNavRail";
import { MobileWorkspaceNav } from "./MobileWorkspaceNav";
import {
  ProductCatalogPanel,
  type CatalogCategory,
  type CatalogProduct,
} from "./ProductCatalogPanel";

interface ProductListApiItem {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly stock: number;
  readonly imageUrl?: string;
  readonly isActive: boolean;
}

interface ProductListApiResponse {
  readonly items: readonly ProductListApiItem[];
}

const nameEmojiHints: Record<string, string> = {
  noodles: "🍜",
  spaghetti: "🍝",
  curry: "🍛",
  tea: "🧋",
  soda: "🥤",
  burger: "🍔",
  alfajor: "🍪",
};

const salesCategoryAliases: Record<string, string> = {
  snack: "snacks",
};

function resolveSalesCategoryId(categoryId: string): string {
  const normalizedCategoryId = normalizeCategoryCode(categoryId);

  return salesCategoryAliases[normalizedCategoryId] ?? normalizedCategoryId;
}

function resolveProductEmoji(name: string, categoryId: string): string {
  const normalizedName = name.toLowerCase();
  const hint = Object.entries(nameEmojiHints).find(([token]) =>
    normalizedName.includes(token),
  );

  if (hint) {
    return hint[1];
  }

  return resolveCategoryEmoji(categoryId);
}

function resolveProductSubtitle(categoryLabel: string): string {
  return categoryLabel;
}

function toCatalogProduct(
  item: ProductListApiItem,
  categoryId: string,
  categoryLabel: string,
): CatalogProduct {
  return {
    id: item.id,
    name: item.name,
    categoryId,
    subtitle: resolveProductSubtitle(categoryLabel),
    price: item.price,
    stock: item.stock,
    isAvailable: item.isActive && item.stock > 0,
    emoji: resolveProductEmoji(item.name, categoryId),
    imageUrl: item.imageUrl,
  };
}

function resolveWorkspaceFromPathname(pathname: string | null): PosWorkspaceId | null {
  if (!pathname) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const maybeWorkspace = segments[0] === "pos" ? (segments[1] ?? "") : (segments[0] ?? "");
  if (!isPosWorkspaceId(maybeWorkspace)) {
    return null;
  }

  return maybeWorkspace;
}

interface PosLayoutProps {
  readonly initialWorkspace?: PosWorkspaceId;
}

type MobileCashRegisterView = "catalog" | "checkout";

export function PosLayout({
  initialWorkspace = "cash-register",
}: PosLayoutProps): JSX.Element {
  const { messages, labelForCategory } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
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
  const [salesRefreshToken, setSalesRefreshToken] = useState<number>(0);
  const [catalogProducts, setCatalogProducts] = useState<readonly CatalogProduct[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<readonly CheckoutOrderItem[]>([]);
  const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<string>("");
  const [cashSessionRefreshToken, setCashSessionRefreshToken] = useState<number>(0);
  const [isCashSessionModalOpen, setIsCashSessionModalOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [mobileCashRegisterView, setMobileCashRegisterView] =
    useState<MobileCashRegisterView>("catalog");
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const currentWorkspace = useMemo(
    () => resolveWorkspaceFromPathname(pathname) ?? initialWorkspace,
    [initialWorkspace, pathname],
  );
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
    navItems.find((item) => item.id === currentWorkspace)?.label ?? messages.shell.nav.cashRegister;
  const categories = useMemo(() => {
    const categoryCodes = sortCategoryCodes(
      dedupeCategoryCodes(catalogProducts.map((product) => product.categoryId)),
    );

    return [
      { id: "all", label: labelForCategory("all"), emoji: resolveCategoryEmoji("all") },
      ...categoryCodes.map((categoryId) => ({
        id: categoryId,
        label: labelForCategory(categoryId),
        emoji: resolveCategoryEmoji(categoryId),
      })),
    ];
  }, [catalogProducts, labelForCategory]);

  const loadCatalogProducts = useCallback(async (): Promise<readonly CatalogProduct[]> => {
    const { response, data } = await fetchJsonNoStore<ProductListApiResponse>(
      "/api/v1/products?activeOnly=true",
    );

    if (!response.ok || !data) {
      throw new Error("No se pudo cargar el catálogo.");
    }

    return data.items.map((item) => {
      const categoryId = resolveSalesCategoryId(item.categoryId);

      return toCatalogProduct(item, categoryId, labelForCategory(categoryId));
    });
  }, [labelForCategory]);

  const refreshCatalog = useCallback(async (): Promise<void> => {
    setIsLoadingProducts(true);
    try {
      const products = await loadCatalogProducts();
      setCatalogProducts(products);
    } catch (error: unknown) {
      setCatalogProducts([]);
      showErrorToast({
        title: "No se pudo cargar el catálogo",
        description:
          error instanceof Error
            ? error.message
            : "Reintentá en unos segundos.",
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [loadCatalogProducts]);

  useEffect(() => {
    if (currentWorkspace !== "cash-register") {
      return;
    }

    void refreshCatalog();
  }, [currentWorkspace, refreshCatalog]);

  useEffect(() => {
    if (
      selectedCashRegisterId &&
      currentActor?.assignedRegisterIds.includes(selectedCashRegisterId)
    ) {
      return;
    }

    setSelectedCashRegisterId(currentActor?.assignedRegisterIds[0] ?? "");
  }, [currentActor?.assignedRegisterIds, selectedCashRegisterId]);

  useEffect(() => {
    if (categories.some((category) => category.id === activeCategoryId)) {
      return;
    }

    setActiveCategoryId("all");
  }, [activeCategoryId, categories]);

  useEffect(() => {
    if (currentWorkspace !== "cash-register") {
      setIsCashSessionModalOpen(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace !== "cash-register") {
      return;
    }

    setMobileCashRegisterView("catalog");
  }, [currentWorkspace]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return catalogProducts.filter((product) => {
      if (activeCategoryId !== "all") {
        if (product.categoryId !== activeCategoryId) {
          return false;
        }
      }

      if (normalizedSearch.length > 0) {
        return product.name.toLowerCase().includes(normalizedSearch);
      }

      return true;
    });
  }, [catalogProducts, activeCategoryId, searchTerm]);

  const addProductToCart = useCallback(
    (productId: string): void => {
      const selectedProduct = catalogProducts.find((product) => product.id === productId);
      if (!selectedProduct || !selectedProduct.isAvailable) {
        return;
      }

      setCartItems((current) => {
        const existing = current.find((item) => item.id === productId);
        if (!existing) {
          return [
            ...current,
            {
              id: selectedProduct.id,
              name: selectedProduct.name,
              price: selectedProduct.price,
              quantity: 1,
              emoji: selectedProduct.emoji,
              imageUrl: selectedProduct.imageUrl,
            },
          ];
        }

        return current.map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        );
      });
    },
    [catalogProducts],
  );

  const increaseQuantity = useCallback((productId: string): void => {
    setCartItems((current) =>
      current.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item,
      ),
    );
  }, []);

  const decreaseQuantity = useCallback((productId: string): void => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string): void => {
    setCartItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );
  const cartQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const handleCheckoutSuccess = useCallback((): void => {
    setCartItems([]);
    setSalesRefreshToken((current) => current + 1);
  }, []);
  const handleCashSessionMutation = useCallback((): void => {
    setCashSessionRefreshToken((current) => current + 1);
  }, []);

  const handleAuthAction = useCallback((): void => {
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
  }, [clearAssumedActor, isAuthenticated, router, sessionSource, signOut]);

  const handleItemSelect = useCallback(
    (itemId: string): void => {
      if (isPosWorkspaceId(itemId)) {
        router.push(workspacePathById[itemId]);
      }
    },
    [router],
  );

  const renderNonSalesWorkspace = (): JSX.Element => {
    if (currentWorkspace === "products") {
      return (
        <ProductsInventoryPanel
          capabilities={{
            canCreateFromSourcing:
              permissionSnapshot?.workspaces.products.canCreateFromSourcing ?? false,
            canUpdatePrice:
              permissionSnapshot?.workspaces.products.canUpdatePrice ?? false,
            canAdjustStock:
              permissionSnapshot?.workspaces.products.canAdjustStock ?? false,
            canRunBulkImport:
              permissionSnapshot?.workspaces.products.canRunBulkImport ?? false,
            canViewInventoryCost:
              permissionSnapshot?.workspaces.products.canViewInventoryCost ?? false,
          }}
        />
      );
    }

    if (currentWorkspace === "receivables") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          <DebtManagementPanel
            refreshToken={salesRefreshToken}
            canRegisterPayment={
              permissionSnapshot?.workspaces.receivables.canRegisterPayment ?? false
            }
            canViewSensitiveNotes={
              permissionSnapshot?.workspaces.receivables.canViewSensitiveNotes ?? false
            }
            preferredCashRegisterId={selectedCashRegisterId || undefined}
          />
        </section>
      );
    }

    if (currentWorkspace === "reporting") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          <ReportingPanel
            canViewExecutiveMetrics={
              permissionSnapshot?.workspaces.reporting.canViewExecutiveMetrics ?? false
            }
            canViewMargin={permissionSnapshot?.workspaces.reporting.canViewMargin ?? false}
            canViewInventoryValue={
              permissionSnapshot?.workspaces.reporting.canViewInventoryValue ?? false
            }
            canViewCreditExposure={
              permissionSnapshot?.workspaces.reporting.canViewCreditExposure ?? false
            }
          />
        </section>
      );
    }

    if (currentWorkspace === "sales") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          <OrdersPanel
            refreshToken={salesRefreshToken}
            canViewSaleDetail={
              permissionSnapshot?.workspaces.sales.canViewSaleDetail ?? false
            }
          />
        </section>
      );
    }

    if (currentWorkspace === "users-admin") {
      return (
        <UsersAdminPanel
          canManageRoles={
            permissionSnapshot?.workspaces.usersAdmin.canManageRoles ?? false
          }
          canManageUsers={
            (permissionSnapshot?.workspaces.usersAdmin.canAssignRoles ?? false) ||
            (permissionSnapshot?.workspaces.usersAdmin.canManageUsers ?? false)
          }
        />
      );
    }

    return (
      <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
        <OfflineSyncPanel />
      </section>
    );
  };

  const renderWorkspaceState = (): JSX.Element => {
    if (isSigningOut) {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          <div className="flex min-h-[calc(100dvh-6rem)] items-center justify-center rounded-[2rem] border border-slate-200 bg-white text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {messages.accessControl.signOutAction}
              </p>
              <p className="mt-3 text-[1.2rem] font-semibold text-slate-900">
                {messages.common.states.loading}
              </p>
            </div>
          </div>
        </section>
      );
    }

    if (status === "loading") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          <div className="flex min-h-[calc(100dvh-6rem)] items-center justify-center rounded-[2rem] border border-slate-200 bg-white text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {messages.accessControl.operatorSessionEyebrow}
              </p>
              <p className="mt-3 text-[1.2rem] font-semibold text-slate-900">
                {messages.accessControl.loadingPermissions}
              </p>
            </div>
          </div>
        </section>
      );
    }

    if (!canAccessWorkspace(currentWorkspace, permissionSnapshot)) {
      return (
        <WorkspaceBlockedState
          title={messages.accessControl.blockedWorkspaceTitle(currentWorkspace)}
          description={messages.accessControl.blockedWorkspaceDescription(currentWorkspace)}
        />
      );
    }

    if (currentWorkspace === "cash-register") {
      const isCatalogView = mobileCashRegisterView === "catalog";
      const isCheckoutView = mobileCashRegisterView === "checkout";

      return (
        <>
          <section className="border-b border-slate-200 bg-[#f7f7f8] px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_12px_20px_rgba(15,23,42,0.06)]">
              <button
                type="button"
                data-testid="cash-register-mobile-tab-catalog"
                onClick={() => setMobileCashRegisterView("catalog")}
                aria-pressed={isCatalogView}
                className={[
                  "inline-flex min-h-[2.7rem] items-center justify-center rounded-xl px-3 text-[0.94rem] font-semibold transition",
                  isCatalogView
                    ? "bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] text-white shadow-[0_10px_18px_rgba(28,109,234,0.3)]"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {messages.shell.nav.catalog}
              </button>
              <button
                type="button"
                data-testid="cash-register-mobile-tab-checkout"
                onClick={() => setMobileCashRegisterView("checkout")}
                aria-pressed={isCheckoutView}
                className={[
                  "inline-flex min-h-[2.7rem] items-center justify-center gap-2 rounded-xl px-3 text-[0.94rem] font-semibold transition",
                  isCheckoutView
                    ? "bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] text-white shadow-[0_10px_18px_rgba(28,109,234,0.3)]"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                <span>{messages.shell.nav.order}</span>
                <span
                  className={[
                    "inline-flex min-w-[1.4rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[0.72rem] font-semibold",
                    isCheckoutView ? "bg-white/24 text-white" : "bg-slate-100 text-slate-700",
                  ].join(" ")}
                >
                  {cartQuantity}
                </span>
              </button>
            </div>
          </section>

          <div className={isCatalogView ? "block lg:contents" : "hidden lg:contents"}>
            <ProductCatalogPanel
              headerActions={
                <button
                  type="button"
                  data-testid="open-cash-session-modal-button"
                  onClick={() => setIsCashSessionModalOpen(true)}
                  className="inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-gradient-to-b from-[#3e8cff] to-[#1c6dea] px-5 text-[0.98rem] font-semibold text-white shadow-[0_14px_24px_rgba(28,109,234,0.28)]"
                >
                  {messages.sales.cashSession.viewSessionAction}
                </button>
              }
              categories={categories}
              activeCategoryId={activeCategoryId}
              products={visibleProducts}
              searchTerm={searchTerm}
              isLoading={isLoadingProducts}
              onSearchTermChange={setSearchTerm}
              onCategorySelect={setActiveCategoryId}
              onProductSelect={addProductToCart}
              onOpenCatalogWorkspace={() => {
                router.push(workspacePathById.products);
              }}
            />
          </div>

          <div className={isCheckoutView ? "block lg:contents" : "hidden lg:contents"}>
            <CheckoutPanel
              items={cartItems}
              subtotal={subtotal}
              cashRegisterId={selectedCashRegisterId || undefined}
              onIncreaseQuantity={increaseQuantity}
              onDecreaseQuantity={decreaseQuantity}
              onRemoveItem={removeItem}
              onCheckoutSuccess={handleCheckoutSuccess}
              onCashSessionMutation={handleCashSessionMutation}
            />
          </div>
          {isCashSessionModalOpen ? (
            <div
              className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4"
              onClick={() => setIsCashSessionModalOpen(false)}
            >
              <div className="relative flex min-h-full items-center justify-center">
                <FloatingModalCloseButton
                  ariaLabel={messages.common.actions.close}
                  onClick={() => setIsCashSessionModalOpen(false)}
                />

                <div
                  role="dialog"
                  aria-modal="true"
                  data-testid="cash-session-overview-modal"
                  className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[72rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="min-h-0 overflow-y-auto p-3 md:p-4 lg:p-6">
                    <CashRegisterSessionPanel
                      preferredRegisterIds={currentActor?.assignedRegisterIds ?? []}
                      selectedRegisterId={selectedCashRegisterId}
                      onSelectedRegisterIdChange={setSelectedCashRegisterId}
                      currentActorId={currentActor?.actorId}
                      refreshToken={cashSessionRefreshToken}
                      canOpenSession={
                        permissionSnapshot?.workspaces.cashRegister.canOpenSession ?? false
                      }
                      canCloseSession={
                        permissionSnapshot?.workspaces.cashRegister.canCloseSession ?? false
                      }
                      canRecordManualCashMovement={
                        permissionSnapshot?.workspaces.cashRegister
                          .canRecordManualCashMovement ?? false
                      }
                      canApproveDiscrepancyClose={
                        permissionSnapshot?.workspaces.cashRegister
                          .canApproveDiscrepancyClose ?? false
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      );
    }

    return renderNonSalesWorkspace();
  };

  return (
    <main className="min-h-dvh w-full overflow-hidden bg-[#f7f7f8]">
      <div className="flex min-h-dvh flex-col lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[180px_minmax(0,1fr)_365px]">
        <MobileWorkspaceNav
          isOpen={isMobileNavOpen}
          activeItemId={currentWorkspace}
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
            activeItemId={currentWorkspace}
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

        <div className="min-h-0 flex-1 lg:contents">{renderWorkspaceState()}</div>
      </div>
    </main>
  );
}
