"use client";

import {
  BarChart3,
  CloudOff,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import { DebtManagementPanel } from "@/modules/accounts-receivable/presentation/components/DebtManagementPanel";
import { ProductsInventoryPanel } from "@/modules/products/presentation/components/ProductsInventoryPanel";
import { OrdersPanel } from "@/modules/reporting/presentation/components/OrdersPanel";
import { ReportingPanel } from "@/modules/reporting/presentation/components/ReportingPanel";
import { OfflineSyncPanel } from "@/modules/sync/presentation/components/OfflineSyncPanel";
import {
  isPosWorkspaceId,
  workspacePathById,
  type PosWorkspaceId,
} from "@/modules/sales/presentation/posWorkspace";
import {
  dedupeCategoryCodes,
  resolveCategoryEmoji,
  sortCategoryCodes,
} from "@/shared/core/category/categoryNaming";

import { CheckoutPanel, type CheckoutOrderItem } from "./CheckoutPanel";
import { LeftNavRail, type PosNavItem } from "./LeftNavRail";
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
  categoryLabel: string,
): CatalogProduct {
  return {
    id: item.id,
    name: item.name,
    categoryId: item.categoryId,
    subtitle: resolveProductSubtitle(categoryLabel),
    price: item.price,
    isAvailable: item.isActive,
    emoji: resolveProductEmoji(item.name, item.categoryId),
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

export function PosLayout({
  initialWorkspace = "sales",
}: PosLayoutProps): JSX.Element {
  const { messages, labelForCategory } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [salesRefreshToken, setSalesRefreshToken] = useState<number>(0);
  const [catalogProducts, setCatalogProducts] = useState<readonly CatalogProduct[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<readonly CheckoutOrderItem[]>([]);
  const currentWorkspace = useMemo(
    () => resolveWorkspaceFromPathname(pathname) ?? initialWorkspace,
    [initialWorkspace, pathname],
  );
  const navItems = useMemo<readonly PosNavItem[]>(
    () => [
      { id: "sales", label: messages.shell.nav.sales, icon: ShoppingCart },
      { id: "orders", label: messages.shell.nav.orders, icon: ReceiptText },
      { id: "products", label: messages.shell.nav.products, icon: PackagePlus },
      { id: "receivables", label: messages.shell.nav.receivables, icon: Wallet },
      { id: "reporting", label: messages.shell.nav.reporting, icon: BarChart3 },
      { id: "sync", label: messages.shell.nav.sync, icon: CloudOff },
    ],
    [messages],
  );
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

    return data.items.map((item) =>
      toCatalogProduct(item, labelForCategory(item.categoryId)),
    );
  }, [labelForCategory]);

  const refreshCatalog = useCallback(async (): Promise<void> => {
    setIsLoadingProducts(true);
    try {
      const products = await loadCatalogProducts();
      setCatalogProducts(products);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [loadCatalogProducts]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    if (categories.some((category) => category.id === activeCategoryId)) {
      return;
    }

    setActiveCategoryId("all");
  }, [activeCategoryId, categories]);

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

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const handleCheckoutSuccess = useCallback((): void => {
    setCartItems([]);
    setSalesRefreshToken((current) => current + 1);
  }, []);

  const renderNonSalesWorkspace = (): JSX.Element => {
    if (currentWorkspace === "products") {
      return <ProductsInventoryPanel />;
    }

    if (currentWorkspace === "receivables") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          <DebtManagementPanel refreshToken={salesRefreshToken} />
        </section>
      );
    }

    if (currentWorkspace === "reporting") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          <ReportingPanel />
        </section>
      );
    }

    if (currentWorkspace === "orders") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          <OrdersPanel refreshToken={salesRefreshToken} />
        </section>
      );
    }

    return (
      <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
        <OfflineSyncPanel />
      </section>
    );
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#f7f7f8]">
      <div className="grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_365px]">
        <LeftNavRail
          items={navItems}
          activeItemId={currentWorkspace}
          onItemSelect={(itemId) => {
            if (isPosWorkspaceId(itemId)) {
              router.push(workspacePathById[itemId]);
            }
          }}
        />

        {currentWorkspace === "sales" ? (
          <>
            <ProductCatalogPanel
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
            <CheckoutPanel
              items={cartItems}
              subtotal={subtotal}
              onIncreaseQuantity={increaseQuantity}
              onDecreaseQuantity={decreaseQuantity}
              onCheckoutSuccess={handleCheckoutSuccess}
            />
          </>
        ) : (
          renderNonSalesWorkspace()
        )}
      </div>
    </main>
  );
}
