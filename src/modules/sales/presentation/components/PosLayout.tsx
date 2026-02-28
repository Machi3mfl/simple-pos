"use client";

import {
  BarChart3,
  Boxes,
  CloudOff,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import { DebtManagementPanel } from "@/modules/accounts-receivable/presentation/components/DebtManagementPanel";
import { BulkPriceUpdatePanel } from "@/modules/catalog/presentation/components/BulkPriceUpdatePanel";
import { ProductOnboardingPanel } from "@/modules/catalog/presentation/components/ProductOnboardingPanel";
import { StockMovementPanel } from "@/modules/inventory/presentation/components/StockMovementPanel";
import { ReportingPanel } from "@/modules/reporting/presentation/components/ReportingPanel";
import { OfflineSyncPanel } from "@/modules/sync/presentation/components/OfflineSyncPanel";
import {
  isPosWorkspaceId,
  workspacePathById,
  type PosWorkspaceId,
} from "@/modules/sales/presentation/posWorkspace";

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

interface SeedProductInput {
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly initialStock: number;
}

const navItems: readonly PosNavItem[] = [
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "catalog", label: "Catalog", icon: Package },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "receivables", label: "Receivables", icon: Wallet },
  { id: "reporting", label: "Reporting", icon: BarChart3 },
  { id: "sync", label: "Sync", icon: CloudOff },
];

const baseCategories: readonly CatalogCategory[] = [
  { id: "all", label: "All", emoji: "🧃" },
  { id: "main", label: "Main", emoji: "🍜" },
  { id: "drink", label: "Drink", emoji: "🥤" },
  { id: "snack", label: "Snack", emoji: "🍔" },
  { id: "dessert", label: "Dessert", emoji: "🍬" },
];

const demoCatalogSeed: readonly SeedProductInput[] = [
  { name: "Reguler Noodles", categoryId: "main", price: 10, initialStock: 30 },
  { name: "Chicken Noodles", categoryId: "main", price: 15, initialStock: 30 },
  { name: "Chicken Curry", categoryId: "main", price: 25, initialStock: 25 },
  { name: "Ebi Curry", categoryId: "main", price: 12, initialStock: 20 },
  { name: "Javanes Noodles", categoryId: "main", price: 20, initialStock: 15 },
  { name: "Iced Tea", categoryId: "drink", price: 6, initialStock: 30 },
];

const categoryEmojiById: Record<string, string> = {
  all: "🧃",
  main: "🍜",
  drink: "🥤",
  snack: "🍔",
  dessert: "🍬",
};

const nameEmojiHints: Record<string, string> = {
  noodles: "🍜",
  spaghetti: "🍝",
  curry: "🍛",
  tea: "🧋",
  soda: "🥤",
  burger: "🍔",
  alfajor: "🍪",
};

function resolveCategoryEmoji(categoryId: string): string {
  return categoryEmojiById[categoryId] ?? "🍽️";
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

function resolveProductSubtitle(name: string, categoryId: string): string {
  const categoryLabel =
    baseCategories.find((category) => category.id === categoryId)?.label ??
    categoryId;

  return `${name} • ${categoryLabel}`;
}

function toCatalogProduct(item: ProductListApiItem): CatalogProduct {
  return {
    id: item.id,
    name: item.name,
    categoryId: item.categoryId,
    subtitle: resolveProductSubtitle(item.name, item.categoryId),
    price: item.price,
    isAvailable: item.isActive,
    emoji: resolveProductEmoji(item.name, item.categoryId),
    imageUrl: item.imageUrl,
  };
}

function buildInitialCartSeed(
  products: readonly CatalogProduct[],
): ReadonlyArray<{ readonly product: CatalogProduct; readonly quantity: number }> {
  const preferredNames = [
    { name: "Reguler Noodles", quantity: 2 },
    { name: "Chicken Noodles", quantity: 1 },
    { name: "Chicken Curry", quantity: 1 },
    { name: "Ebi Curry", quantity: 1 },
  ];

  const seeded = preferredNames
    .map((entry) => ({
      product: products.find((product) => product.name === entry.name),
      quantity: entry.quantity,
    }))
    .filter(
      (
        entry,
      ): entry is { readonly product: CatalogProduct; readonly quantity: number } =>
        Boolean(entry.product),
    );

  if (seeded.length > 0) {
    return seeded;
  }

  return products
    .slice(0, 3)
    .map((product) => ({
      product,
      quantity: 1,
    }));
}

function resolveWorkspaceFromPathname(pathname: string | null): PosWorkspaceId | null {
  if (!pathname) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const maybeWorkspace = segments[1] ?? "";
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
  const router = useRouter();
  const pathname = usePathname();
  const [catalogRefreshToken, setCatalogRefreshToken] = useState<number>(0);
  const [salesRefreshToken, setSalesRefreshToken] = useState<number>(0);
  const [catalogProducts, setCatalogProducts] = useState<readonly CatalogProduct[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [hasSeededCart, setHasSeededCart] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<readonly CheckoutOrderItem[]>([]);
  const activeNavItemId = useMemo(
    () => resolveWorkspaceFromPathname(pathname) ?? initialWorkspace,
    [initialWorkspace, pathname],
  );

  const categories = useMemo(() => {
    const dynamicCategories = new Map<string, CatalogCategory>();
    for (const category of baseCategories) {
      dynamicCategories.set(category.id, category);
    }

    for (const product of catalogProducts) {
      const categoryId = product.categoryId;

      if (!dynamicCategories.has(categoryId)) {
        dynamicCategories.set(categoryId, {
          id: categoryId,
          label: categoryId[0]?.toUpperCase() + categoryId.slice(1),
          emoji: resolveCategoryEmoji(categoryId),
        });
      }
    }

    return Array.from(dynamicCategories.values());
  }, [catalogProducts]);

  const loadCatalogProducts = useCallback(async (): Promise<readonly CatalogProduct[]> => {
    const { response, data } = await fetchJsonNoStore<ProductListApiResponse>(
      "/api/v1/products?activeOnly=true",
    );

    if (!response.ok || !data) {
      throw new Error("Failed to load catalog products.");
    }

    return data.items.map(toCatalogProduct);
  }, []);

  const seedDemoCatalog = useCallback(async (): Promise<void> => {
    setIsLoadingProducts(true);
    try {
      await Promise.all(
        demoCatalogSeed.map((product) =>
          fetch("/api/v1/products", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(product),
          }),
        ),
      );

      const seededProducts = await loadCatalogProducts();
      setCatalogProducts(seededProducts);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [loadCatalogProducts]);

  const refreshCatalog = useCallback(async (): Promise<void> => {
    setIsLoadingProducts(true);
    try {
      const products = await loadCatalogProducts();
      if (products.length === 0) {
        await seedDemoCatalog();
        return;
      }

      setCatalogProducts(products);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [loadCatalogProducts, seedDemoCatalog]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    if (hasSeededCart || catalogProducts.length === 0) {
      return;
    }

    const bootstrappedItems = buildInitialCartSeed(catalogProducts).map(
      ({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        emoji: product.emoji,
      }),
    );

    if (bootstrappedItems.length > 0) {
      setCartItems(bootstrappedItems);
      setHasSeededCart(true);
    }
  }, [catalogProducts, hasSeededCart]);

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

  const triggerCatalogWorkspaceRefresh = useCallback((): void => {
    setCatalogRefreshToken((current) => current + 1);
  }, []);

  const handleCatalogContentChanged = useCallback(async (): Promise<void> => {
    await refreshCatalog();
    triggerCatalogWorkspaceRefresh();
  }, [refreshCatalog, triggerCatalogWorkspaceRefresh]);

  const handleCheckoutSuccess = useCallback((): void => {
    setCartItems([]);
    setHasSeededCart(true);
    setSalesRefreshToken((current) => current + 1);
  }, []);

  const renderNonSalesWorkspace = (): JSX.Element => {
    if (activeNavItemId === "catalog") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:overflow-y-auto lg:p-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <ProductOnboardingPanel
              onProductCreated={handleCatalogContentChanged}
              refreshToken={catalogRefreshToken}
            />
            <BulkPriceUpdatePanel
              onPricesUpdated={handleCatalogContentChanged}
              refreshToken={catalogRefreshToken}
            />
          </div>
        </section>
      );
    }

    if (activeNavItemId === "inventory") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:overflow-y-auto lg:p-6">
          <StockMovementPanel refreshToken={catalogRefreshToken} />
        </section>
      );
    }

    if (activeNavItemId === "receivables") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:overflow-y-auto lg:p-6">
          <DebtManagementPanel refreshToken={salesRefreshToken} />
        </section>
      );
    }

    if (activeNavItemId === "reporting") {
      return (
        <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:overflow-y-auto lg:p-6">
          <ReportingPanel />
        </section>
      );
    }

    return (
      <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:overflow-y-auto lg:p-6">
        <OfflineSyncPanel />
      </section>
    );
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#f7f7f8]">
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_365px]">
        <LeftNavRail
          items={navItems}
          activeItemId={activeNavItemId}
          onItemSelect={(itemId) => {
            if (isPosWorkspaceId(itemId)) {
              router.push(workspacePathById[itemId]);
            }
          }}
        />

        {activeNavItemId === "sales" ? (
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
              onSeedDemoCatalog={seedDemoCatalog}
            />
            <CheckoutPanel
              items={cartItems}
              subtotal={subtotal}
              discount={0}
              tax={0}
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
