"use client";

import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Boxes,
  MoreHorizontal,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { showErrorToast, showSuccessToast } from "@/hooks/use-app-toast";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import { BulkPriceUpdatePanel } from "@/modules/catalog/presentation/components/BulkPriceUpdatePanel";
import { CategoryInputField } from "@/modules/catalog/presentation/components/CategoryInputField";
import { DEFAULT_PRODUCT_MIN_STOCK } from "@/modules/catalog/domain/constants/ProductDefaults";
import { ManagedProductImageField } from "@/modules/catalog/presentation/components/ManagedProductImageField";
import { buildProductMutationFormData } from "@/modules/catalog/presentation/handlers/buildProductMutationFormData";
import { BulkProductProfileUpdatePanel } from "@/modules/products/presentation/components/BulkProductProfileUpdatePanel";
import { useProductOnboarding } from "@/modules/catalog/presentation/hooks/useProductOnboarding";
import { dedupeCategoryCodes } from "@/shared/core/category/categoryNaming";
import { ProductDisplayCard } from "@/shared/presentation/components/ProductDisplayCard";
import { useInfiniteScrollTrigger } from "@/shared/presentation/hooks/useInfiniteScrollTrigger";

type StockFilter = "all" | "with_stock" | "low_stock" | "out_of_stock" | "inactive";
type SortMode = "stock" | "name" | "recent" | "price";
type StockMovementMode = "inbound" | "adjustment" | "outbound";
type DialogId =
  | "detail"
  | "create"
  | "edit"
  | "stock"
  | "bulkPrices"
  | "bulkProductProfiles"
  | "bulkProducts"
  | "bulkStock"
  | null;

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorPayload {
  readonly message?: string;
  readonly details?: readonly ApiErrorDetail[];
}

interface WorkspaceProductItem {
  readonly id: string;
  readonly sku: string;
  readonly ean?: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly averageCost: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
  readonly stockState: Exclude<StockFilter, "all">;
  readonly lastMovementAt?: string;
  readonly lastMovementType?: StockMovementMode;
}

interface WorkspaceProductsResponse {
  readonly items: readonly WorkspaceProductItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly summary: {
    readonly withStock: number;
    readonly lowStock: number;
    readonly outOfStock: number;
    readonly stockValue: number;
  };
}

interface ProductApiItem {
  readonly id: string;
  readonly sku: string;
  readonly ean?: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

interface ProductResponse {
  readonly item: ProductApiItem;
}

interface ProductListResponse {
  readonly items: readonly ProductApiItem[];
}

interface StockMovementItem {
  readonly movementId: string;
  readonly productId: string;
  readonly movementType: StockMovementMode;
  readonly quantity: number;
  readonly unitCost: number;
  readonly occurredAt: string;
  readonly stockOnHandAfter: number;
  readonly weightedAverageUnitCostAfter: number;
  readonly inventoryValueAfter: number;
  readonly reason?: string;
}

interface StockMovementResponse {
  readonly items: readonly StockMovementItem[];
}

interface BulkCreateProductsResponse {
  readonly importedCount: number;
  readonly items: readonly ProductApiItem[];
  readonly invalidItems: readonly {
    readonly row: number;
    readonly name?: string;
    readonly reason: string;
  }[];
}

interface BulkStockMovementsResponse {
  readonly appliedCount: number;
  readonly items: readonly StockMovementItem[];
  readonly invalidItems: readonly {
    readonly row: number;
    readonly productId: string;
    readonly reason: string;
  }[];
}

interface EditProductFormState {
  readonly name: string;
  readonly sku: string;
  readonly categoryId: string;
  readonly price: string;
  readonly cost: string;
  readonly minStock: string;
  readonly imageUrl: string;
  readonly imageFile: File | null;
  readonly isActive: boolean;
}

interface StockFormState {
  readonly movementType: StockMovementMode;
  readonly quantity: string;
  readonly unitCost: string;
  readonly reason: string;
}

interface ProductsInventoryPanelCapabilities {
  readonly canCreateFromSourcing: boolean;
  readonly canUpdatePrice: boolean;
  readonly canAdjustStock: boolean;
  readonly canRunBulkImport: boolean;
  readonly canViewInventoryCost: boolean;
}

interface WorkspaceLoadOverrides {
  readonly categoryFilter?: string;
  readonly page?: number;
  readonly append?: boolean;
  readonly searchTerm?: string;
  readonly stockFilter?: StockFilter;
}

const WORKSPACE_PAGE_SIZE = 20;

const defaultEditFormState: EditProductFormState = {
  name: "",
  sku: "",
  categoryId: "other",
  price: "",
  cost: "",
  minStock: String(DEFAULT_PRODUCT_MIN_STOCK),
  imageUrl: "",
  imageFile: null,
  isActive: true,
};

const defaultStockFormState = (movementType: StockMovementMode): StockFormState => ({
  movementType,
  quantity: "",
  unitCost: "",
  reason: "",
});

interface DialogProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}

function Dialog({ title, onClose, children }: DialogProps): JSX.Element {
  const { messages } = useI18n();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1040px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]">
          <header className="border-b border-slate-200 px-5 py-4 md:px-6">
            <h3 className="text-[1.8rem] font-semibold tracking-tight text-slate-900">
              {title}
            </h3>
          </header>
          <div className="min-h-0 overflow-y-auto px-5 py-4 md:px-6 md:py-5">{children}</div>
        </div>
        <FloatingModalCloseButton
          onClick={onClose}
          ariaLabel={messages.common.actions.close}
          testId="products-workspace-dialog-close"
        />
      </div>
    </div>
  );
}

function resolveApiMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof (payload as ApiErrorPayload).message === "string"
  ) {
    return (payload as ApiErrorPayload).message as string;
  }

  return fallback;
}

function parsePastedRows(input: string): string[][] {
  return input
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0)
    .map((row) => row.split(/[,;\t]/).map((cell) => cell.trim()));
}

function mergeWorkspaceItems(
  currentItems: readonly WorkspaceProductItem[],
  incomingItems: readonly WorkspaceProductItem[],
): readonly WorkspaceProductItem[] {
  const seen = new Set<string>();
  const merged: WorkspaceProductItem[] = [];

  for (const item of [...currentItems, ...incomingItems]) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

export function ProductsInventoryPanel({
  capabilities = {
    canCreateFromSourcing: true,
    canUpdatePrice: true,
    canAdjustStock: true,
    canRunBulkImport: true,
    canViewInventoryCost: true,
  },
}: {
  readonly capabilities?: ProductsInventoryPanelCapabilities;
}): JSX.Element {
  const {
    messages,
    formatCurrency,
    formatDateTime,
    humanizeIdentifier,
    labelForCategory,
    labelForMovementType,
  } = useI18n();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [sortMode, setSortMode] = useState<SortMode>("stock");
  const [workspace, setWorkspace] = useState<WorkspaceProductsResponse | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<DialogId>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(false);
  const [isLoadingMoreWorkspace, setIsLoadingMoreWorkspace] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [movementHistory, setMovementHistory] = useState<readonly StockMovementItem[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState<boolean>(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<EditProductFormState>(defaultEditFormState);
  const [stockForm, setStockForm] = useState<StockFormState>(defaultStockFormState("inbound"));
  const [bulkProductsInput, setBulkProductsInput] = useState<string>("");
  const [bulkStockInput, setBulkStockInput] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<number>(0);
  const workspaceRequestTokenRef = useRef<number>(0);
  const publishWorkspaceFeedback = useCallback(
    ({
      type,
      message,
      title,
    }: {
      readonly type: "success" | "error";
      readonly message: string;
      readonly title?: string;
    }): void => {
      const payload = {
        title,
        description: message,
        testId: "products-workspace-feedback",
      };

      if (type === "error") {
        showErrorToast(payload);
        return;
      }

      showSuccessToast(payload);
    },
    [],
  );
  const {
    categories: onboardingCategories,
    feedback: onboardingFeedback,
    form: onboardingForm,
    isSubmitting: isSubmittingCreate,
    setForm: setOnboardingForm,
    submit: submitProductOnboarding,
  } = useProductOnboarding({
    onProductCreated: async (createdProduct) => {
      const searchValue = createdProduct.sku || createdProduct.name;
      setCategoryFilter("all");
      setStockFilter("all");
      setSearchTerm(searchValue);
      setSelectedProductId(createdProduct.id);
      setOpenDialog(null);
      await refreshWorkspace({
        categoryFilter: "all",
        searchTerm: searchValue,
        stockFilter: "all",
      });
      publishWorkspaceFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.productCreated(createdProduct.name),
      });
    },
    refreshToken,
  });
  useEffect(() => {
    if (!onboardingFeedback) {
      return;
    }

    publishWorkspaceFeedback({
      type: onboardingFeedback.type,
      message: onboardingFeedback.message,
    });
  }, [onboardingFeedback, publishWorkspaceFeedback]);

  const selectedProduct =
    workspace?.items.find((item) => item.id === selectedProductId) ?? workspace?.items[0] ?? null;

  const categoryOptions = useMemo(() => {
    return ["all", ...dedupeCategoryCodes((workspace?.items ?? []).map((item) => item.categoryId))];
  }, [workspace?.items]);

  const loadWorkspace = useCallback(async (overrides?: WorkspaceLoadOverrides): Promise<void> => {
    const append = overrides?.append ?? false;
    const requestToken = workspaceRequestTokenRef.current + 1;
    workspaceRequestTokenRef.current = requestToken;
    const effectiveSearchTerm = overrides?.searchTerm ?? deferredSearchTerm;
    const effectiveCategoryFilter = overrides?.categoryFilter ?? categoryFilter;
    const effectiveStockFilter = overrides?.stockFilter ?? stockFilter;
    const effectivePage = overrides?.page ?? 1;
    const params = new URLSearchParams();
    if (effectiveSearchTerm.trim().length > 0) {
      params.set("q", effectiveSearchTerm.trim());
    }
    if (effectiveCategoryFilter !== "all") {
      params.set("categoryId", effectiveCategoryFilter);
    }
    if (effectiveStockFilter !== "all") {
      params.set("stockState", effectiveStockFilter);
    }
    params.set("activeOnly", String(activeOnly));
    params.set("sort", sortMode);
    params.set("page", String(effectivePage));
    params.set("pageSize", String(WORKSPACE_PAGE_SIZE));

    if (append) {
      setIsLoadingMoreWorkspace(true);
    } else {
      setIsLoadingWorkspace(true);
    }

    try {
      const { response, data } = await fetchJsonNoStore<WorkspaceProductsResponse>(
        `/api/v1/products/workspace?${params.toString()}`,
      );

      if (!response.ok || !data) {
        if (workspaceRequestTokenRef.current !== requestToken) {
          return;
        }
        publishWorkspaceFeedback({
          type: "error",
          message: messages.productsWorkspace.loadError,
        });
        return;
      }

      if (workspaceRequestTokenRef.current !== requestToken) {
        return;
      }

      setWorkspace((current) => {
        if (!append || !current) {
          return data;
        }

        return {
          ...data,
          items: mergeWorkspaceItems(current.items, data.items),
        };
      });
    } catch {
      if (workspaceRequestTokenRef.current !== requestToken) {
        return;
      }
      publishWorkspaceFeedback({
        type: "error",
        message: messages.productsWorkspace.loadError,
      });
    } finally {
      if (workspaceRequestTokenRef.current === requestToken) {
        setIsLoadingWorkspace(false);
        setIsLoadingMoreWorkspace(false);
      }
    }
  }, [
    activeOnly,
    categoryFilter,
    deferredSearchTerm,
    messages.productsWorkspace.loadError,
    publishWorkspaceFeedback,
    sortMode,
    stockFilter,
  ]);

  useEffect(() => {
    void loadWorkspace({ page: 1 });
  }, [
    activeOnly,
    categoryFilter,
    deferredSearchTerm,
    loadWorkspace,
    sortMode,
    stockFilter,
  ]);

  useEffect(() => {
    if (!workspace?.items.length) {
      setSelectedProductId(null);
      return;
    }

    if (!selectedProductId || !workspace.items.some((item) => item.id === selectedProductId)) {
      setSelectedProductId(workspace.items[0].id);
    }
  }, [selectedProductId, workspace?.items]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setEditForm({
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      categoryId: selectedProduct.categoryId,
      price: String(selectedProduct.price),
      cost: selectedProduct.averageCost > 0 ? String(selectedProduct.averageCost) : "",
      minStock: String(selectedProduct.minStock),
      imageUrl: "",
      imageFile: null,
      isActive: selectedProduct.isActive,
    });
  }, [selectedProduct]);

  useEffect(() => {
    if (openDialog !== "detail" || !selectedProduct) {
      return;
    }

    const productId = selectedProduct.id;

    async function loadMovements(): Promise<void> {
      setIsLoadingMovements(true);
      try {
        const { response, data } = await fetchJsonNoStore<StockMovementResponse>(
          `/api/v1/stock-movements?productId=${productId}`,
        );

        if (!response.ok || !data) {
          publishWorkspaceFeedback({
            type: "error",
            message: messages.productsWorkspace.movementsLoadError,
          });
          return;
        }

        setMovementHistory(data.items.slice(0, 6));
      } catch {
        publishWorkspaceFeedback({
          type: "error",
          message: messages.productsWorkspace.movementsLoadError,
        });
      } finally {
        setIsLoadingMovements(false);
      }
    }

    void loadMovements();
  }, [
    messages.productsWorkspace.movementsLoadError,
    openDialog,
    publishWorkspaceFeedback,
    refreshToken,
    selectedProduct,
  ]);

  async function refreshWorkspace(overrides?: WorkspaceLoadOverrides): Promise<void> {
    setRefreshToken((current) => current + 1);
    await loadWorkspace(overrides);
  }

  async function handleEditProduct(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/products/${selectedProduct.id}`, {
        method: "PATCH",
        body: buildProductMutationFormData(
          {
            sku: editForm.sku,
            name: editForm.name,
            categoryId: editForm.categoryId,
            price: Number(editForm.price),
            cost: editForm.cost.trim().length > 0 ? Number(editForm.cost) : undefined,
            minStock: Number(editForm.minStock),
            isActive: editForm.isActive,
          },
          {
            imageUrl: editForm.imageUrl,
            imageFile: editForm.imageFile,
          },
        ),
      });

      const payload = (await response.json()) as ProductResponse | ApiErrorPayload;
      if (!response.ok) {
        publishWorkspaceFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.updateProduct),
        });
        return;
      }

      publishWorkspaceFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.productUpdated(
          (payload as ProductResponse).item.name,
        ),
      });
      setOpenDialog(null);
      await refreshWorkspace();
    } catch {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.updateProduct,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchiveProduct(): Promise<void> {
    if (!selectedProduct) {
      return;
    }

    const confirmed = window.confirm(
      messages.productsWorkspace.feedback.archiveConfirm(selectedProduct.name),
    );
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/products/${selectedProduct.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ isActive: false }),
      });

      const payload = (await response.json()) as ProductResponse | ApiErrorPayload;
      if (!response.ok) {
        publishWorkspaceFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.archiveProduct),
        });
        return;
      }

      publishWorkspaceFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.productArchived(selectedProduct.name),
      });
      setOpenDialog(null);
      await refreshWorkspace();
    } catch {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.archiveProduct,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStockMovement(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }

    const parsedQuantity = Number(stockForm.quantity);
    const parsedUnitCost = Number(stockForm.unitCost);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.inventory.invalidQuantity,
      });
      return;
    }

    if (
      stockForm.movementType === "inbound" &&
      (!Number.isFinite(parsedUnitCost) || parsedUnitCost <= 0)
    ) {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.inventory.invalidInboundCost,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/stock-movements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          movementType: stockForm.movementType,
          quantity: parsedQuantity,
          unitCost:
            stockForm.movementType === "inbound" && stockForm.unitCost.trim().length > 0
              ? parsedUnitCost
              : undefined,
          reason: stockForm.reason.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as StockMovementItem | ApiErrorPayload;
      if (!response.ok) {
        publishWorkspaceFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.stockRegister),
        });
        return;
      }

      publishWorkspaceFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.stockRegistered(selectedProduct.name),
      });
      setStockForm(defaultStockFormState(stockForm.movementType));
      setOpenDialog("detail");
      await refreshWorkspace();
    } catch {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.stockRegister,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBulkProducts(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const rows = parsePastedRows(bulkProductsInput);
    if (rows.length === 0) {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.bulkProductsEmpty,
      });
      return;
    }

    const normalizedRows =
      rows[0]?.[0]?.toLowerCase() === "name" ? rows.slice(1) : rows;

    const items = normalizedRows.map((columns) => ({
      name: columns[0] ?? "",
      sku: columns[1] || undefined,
      categoryId: columns[2] ?? "other",
      price: Number(columns[3] ?? 0),
      cost: columns[4] ? Number(columns[4]) : undefined,
      initialStock: Number(columns[5] ?? 0),
      minStock: Number(columns[6] ?? DEFAULT_PRODUCT_MIN_STOCK),
      imageUrl: columns[7] || undefined,
      ean: columns[8] || undefined,
    }));

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/products/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ items }),
      });
      const payload = (await response.json()) as BulkCreateProductsResponse | ApiErrorPayload;
      if (!response.ok) {
        publishWorkspaceFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.bulkProducts),
        });
        return;
      }

      const result = payload as BulkCreateProductsResponse;
      publishWorkspaceFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.bulkProductsImported(
          result.importedCount,
          result.invalidItems.length,
        ),
      });
      setBulkProductsInput("");
      setOpenDialog(null);
      await refreshWorkspace();
    } catch {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.bulkProducts,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBulkStock(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const rows = parsePastedRows(bulkStockInput);
    if (rows.length === 0) {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.bulkStockEmpty,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { response: lookupResponse, data: lookupData } =
        await fetchJsonNoStore<ProductListResponse>("/api/v1/products");

      if (!lookupResponse.ok || !lookupData) {
        publishWorkspaceFeedback({
          type: "error",
          message: messages.productsWorkspace.loadError,
        });
        return;
      }

      const productIdBySku = new Map<string, string>(
        lookupData.items.map((item) => [item.sku.toUpperCase(), item.id]),
      );
      const normalizedRows = rows[0]?.[0]?.toLowerCase() === "sku" ? rows.slice(1) : rows;
      const items = normalizedRows.map((columns) => {
        const sku = (columns[0] ?? "").toUpperCase();
        return {
          productId: productIdBySku.get(sku) ?? sku,
          movementType: (columns[1] ?? "inbound") as StockMovementMode,
          quantity: Number(columns[2] ?? 0),
          unitCost: columns[3] ? Number(columns[3]) : undefined,
          reason: columns[4] || undefined,
        };
      });

      const response = await fetch("/api/v1/stock-movements/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ items }),
      });
      const payload = (await response.json()) as BulkStockMovementsResponse | ApiErrorPayload;
      if (!response.ok) {
        publishWorkspaceFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.bulkStock),
        });
        return;
      }

      const result = payload as BulkStockMovementsResponse;
      publishWorkspaceFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.bulkStockImported(
          result.appliedCount,
          result.invalidItems.length,
        ),
      });
      setBulkStockInput("");
      setOpenDialog(null);
      await refreshWorkspace();
    } catch {
      publishWorkspaceFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.bulkStock,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const workspaceItems = workspace?.items ?? [];
  const canEditProduct =
    capabilities.canCreateFromSourcing ||
    capabilities.canUpdatePrice ||
    capabilities.canAdjustStock;
  const canShowPrimaryActions =
    capabilities.canCreateFromSourcing ||
    capabilities.canUpdatePrice ||
    capabilities.canRunBulkImport ||
    canEditProduct;
  const hasMoreWorkspaceItems =
    workspace !== null && workspace.page < workspace.totalPages;
  const loadNextWorkspacePage = useCallback(async (): Promise<void> => {
    if (
      !workspace ||
      isLoadingWorkspace ||
      isLoadingMoreWorkspace ||
      workspace.page >= workspace.totalPages
    ) {
      return;
    }

    await loadWorkspace({
      page: workspace.page + 1,
      append: true,
    });
  }, [isLoadingMoreWorkspace, isLoadingWorkspace, loadWorkspace, workspace]);
  const {
    isObserverSupported: isWorkspaceInfiniteScrollObserverSupported,
    setScrollRoot: setWorkspaceScrollRoot,
    setSentinel: setWorkspaceSentinel,
  } = useInfiniteScrollTrigger({
    enabled: workspaceItems.length > 0,
    hasMore: hasMoreWorkspaceItems,
    isLoading: isLoadingWorkspace || isLoadingMoreWorkspace,
    onLoadMore: loadNextWorkspacePage,
    triggerKey: `${deferredSearchTerm.trim().toLowerCase()}:${categoryFilter}:${stockFilter}:${activeOnly}:${sortMode}:${workspace?.page ?? 0}:${workspaceItems.length}`,
  });

  return (
    <section
      ref={setWorkspaceScrollRoot}
      className="min-h-0 min-w-0 overflow-y-auto bg-[#f5f6f8] p-3 lg:col-span-2 lg:h-full lg:p-4"
    >
      <div className="flex w-full flex-col gap-3">
        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="px-5 py-4 lg:px-6 lg:py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-[2.4rem] leading-none font-semibold tracking-tight text-slate-950 lg:text-[2.85rem] xl:whitespace-nowrap">
                  {messages.productsWorkspace.title}
                </h1>
              </div>

              {canShowPrimaryActions ? (
                <div className="flex flex-wrap gap-1.5 lg:flex-nowrap lg:items-center lg:justify-end">
                  {capabilities.canCreateFromSourcing ? (
                    <Link
                      href="/products/sourcing"
                      data-testid="products-workspace-open-create-button"
                      className="flex min-h-[3.2rem] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-blue-600 px-3 text-[0.88rem] font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.25)] lg:min-h-[3.35rem]"
                    >
                      <Plus size={18} />
                      {messages.productsWorkspace.actions.newProduct}
                    </Link>
                  ) : null}
                  {capabilities.canUpdatePrice ? (
                    <button
                      type="button"
                      onClick={() => setOpenDialog("bulkPrices")}
                      data-testid="products-workspace-open-bulk-prices-button"
                      className="flex min-h-[3.2rem] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3 text-[0.88rem] font-semibold text-slate-800 lg:min-h-[3.35rem]"
                    >
                      <ArrowUpDown size={18} />
                      {messages.productsWorkspace.actions.bulkPrices}
                    </button>
                  ) : null}
                  {canEditProduct ? (
                    <button
                      type="button"
                      onClick={() => setOpenDialog("bulkProductProfiles")}
                      data-testid="products-workspace-open-bulk-profile-button"
                      className="flex min-h-[3.2rem] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3 text-[0.88rem] font-semibold text-slate-800 lg:min-h-[3.35rem]"
                    >
                      <Pencil size={18} />
                      {messages.productsWorkspace.actions.bulkProductProfiles}
                    </button>
                  ) : null}
                  {capabilities.canRunBulkImport ? (
                    <Popover open={isMoreActionsOpen} onOpenChange={setIsMoreActionsOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          data-testid="products-workspace-open-more-actions-button"
                          className="flex min-h-[3.2rem] min-w-[3.2rem] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 lg:min-h-[3.35rem] lg:min-w-[3.35rem]"
                          aria-label={messages.productsWorkspace.actions.more}
                        >
                          <MoreHorizontal size={20} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-[15rem] rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-[0_18px_44px_rgba(15,23,42,0.12)]"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreActionsOpen(false);
                              setOpenDialog("bulkProducts");
                            }}
                            data-testid="products-workspace-open-bulk-products-button"
                            className="flex min-h-[3.2rem] items-center gap-3 rounded-[1.1rem] px-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                          >
                            <Upload size={18} />
                            {messages.productsWorkspace.actions.bulkProducts}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreActionsOpen(false);
                              setOpenDialog("bulkStock");
                            }}
                            data-testid="products-workspace-open-bulk-stock-button"
                            className="flex min-h-[3.2rem] items-center gap-3 rounded-[1.1rem] px-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                          >
                            <PackagePlus size={18} />
                            {messages.productsWorkspace.actions.bulkStock}
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {messages.productsWorkspace.summary.withStock}
                </p>
                <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-slate-900">
                  {workspace?.summary.withStock ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                  {messages.productsWorkspace.summary.lowStock}
                </p>
                <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-amber-800">
                  {workspace?.summary.lowStock ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
                  {messages.productsWorkspace.summary.outOfStock}
                </p>
                <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-rose-800">
                  {workspace?.summary.outOfStock ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  {messages.productsWorkspace.summary.stockValue}
                </p>
                <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-emerald-900">
                  {formatCurrency(workspace?.summary.stockValue ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <header className="border-b border-slate-200 px-4 py-4 lg:px-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">
                    {messages.productsWorkspace.listTitle}
                  </h2>
                </div>
                <label className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 xl:max-w-[22rem]">
                  <Search size={18} className="text-slate-400" />
                  <input
                    data-testid="products-workspace-search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={messages.productsWorkspace.searchPlaceholder}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "all", label: messages.productsWorkspace.filters.all },
                    { id: "with_stock", label: messages.productsWorkspace.filters.withStock },
                    { id: "low_stock", label: messages.productsWorkspace.filters.lowStock },
                    { id: "out_of_stock", label: messages.productsWorkspace.filters.outOfStock },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStockFilter(filter.id as StockFilter)}
                      className={[
                        "min-h-[2.85rem] rounded-full px-4 text-sm font-semibold transition",
                        stockFilter === filter.id
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700",
                      ].join(" ")}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    data-testid="products-workspace-category-select"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="min-h-[2.85rem] rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none"
                  >
                    {categoryOptions.map((categoryId) => (
                      <option key={categoryId} value={categoryId}>
                        {categoryId === "all"
                          ? messages.productsWorkspace.filters.allCategories
                          : labelForCategory(categoryId)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setActiveOnly((current) => !current)}
                    data-testid="products-workspace-active-only-button"
                    className={[
                      "min-h-[2.85rem] rounded-full px-4 text-sm font-semibold transition",
                      activeOnly
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    {messages.productsWorkspace.filters.activeOnly}
                  </button>
                  <div className="flex min-h-[2.85rem] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
                    <ArrowUpDown size={16} />
                    <select
                      data-testid="products-workspace-sort-select"
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="bg-transparent outline-none"
                    >
                      <option value="stock">{messages.productsWorkspace.filters.orderByStock}</option>
                      <option value="name">{messages.productsWorkspace.filters.orderByName}</option>
                      <option value="recent">{messages.productsWorkspace.filters.orderByRecent}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {isLoadingWorkspace ? (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500" data-testid="products-workspace-loading">
              {messages.common.states.loading}
            </div>
          ) : workspaceItems.length === 0 ? (
            <div className="px-5 py-10 text-center text-base font-semibold text-slate-500">
              {messages.productsWorkspace.emptyState}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:px-5">
                {workspaceItems.map((product) => {
                  const statusTone =
                    product.stockState === "with_stock"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : product.stockState === "low_stock"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : product.stockState === "out_of_stock"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-100 text-slate-600";

                  const statusText =
                    product.stockState === "with_stock" || product.stockState === "low_stock"
                      ? `${messages.productsWorkspace.status.inStock} ${product.stock}`
                      : product.stockState === "out_of_stock"
                          ? messages.productsWorkspace.status.outOfStock
                          : messages.productsWorkspace.status.inactive;

                  return (
                    <ProductDisplayCard
                      key={product.id}
                      as="button"
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setOpenDialog("detail");
                      }}
                      testId={`products-workspace-card-${product.id}`}
                      contentClassName="min-h-[20.5rem] gap-3 p-5"
                      headerRight={
                        <span
                          className={[
                            "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold",
                            statusTone,
                          ].join(" ")}
                        >
                          {statusText}
                        </span>
                      }
                      media={
                        product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Workspace cards can show operator-provided or imported images that are not constrained to next/image allowlists.
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Package size={44} className="text-slate-400" />
                        )
                      }
                      mediaClassName="h-[7.6rem] rounded-[1.45rem] bg-transparent p-0 lg:h-[8.2rem]"
                      title={product.name}
                      subtitle={`${labelForCategory(product.categoryId)} • ${product.sku}`}
                      titleClassName="text-[1.16rem] leading-[1.08]"
                      subtitleClassName="text-[0.82rem] leading-tight"
                      footer={
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[1.35rem] leading-none font-bold tracking-tight text-slate-900">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="text-[0.74rem] font-semibold text-blue-700">
                            {messages.productsWorkspace.detailTitle}
                          </span>
                        </div>
                      }
                    />
                  );
                })}
              </div>

              <footer className="flex flex-col items-center gap-3 border-t border-slate-200 px-5 py-4 text-center">
                <p className="text-sm font-medium text-slate-500">
                  {workspaceItems.length} de {workspace?.totalItems ?? workspaceItems.length} productos cargados
                </p>
                {hasMoreWorkspaceItems ? (
                  <>
                    <div
                      ref={setWorkspaceSentinel}
                      data-testid="products-workspace-infinite-scroll-sentinel"
                      className="h-2 w-full"
                      aria-hidden
                    />
                    <p
                      data-testid="products-workspace-infinite-scroll-status"
                      className="text-sm font-medium text-slate-500"
                    >
                      {isLoadingMoreWorkspace
                        ? messages.productsWorkspace.pagination.loadingMore
                        : messages.productsWorkspace.pagination.continueScrolling}
                    </p>
                    {!isWorkspaceInfiniteScrollObserverSupported ? (
                      <button
                        type="button"
                        onClick={() => void loadNextWorkspacePage()}
                        data-testid="products-workspace-load-more-button"
                        disabled={isLoadingMoreWorkspace}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                      >
                        {messages.common.actions.loadMore}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p
                    data-testid="products-workspace-infinite-scroll-status"
                    className="text-sm font-medium text-slate-500"
                  >
                    {messages.productsWorkspace.pagination.endReached}
                  </p>
                )}
              </footer>
            </>
          )}
        </article>
      </div>

      {openDialog === "detail" && selectedProduct ? (
        <Dialog title={messages.productsWorkspace.dialogs.detailTitle} onClose={() => setOpenDialog(null)}>
          <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-3">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
                <div className="flex h-[18rem] items-center justify-center bg-slate-50">
                  {selectedProduct.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Operators can work with arbitrary sourced product images that are not constrained to next/image allowlists.
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Package size={56} className="text-slate-400" />
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.fields.currentStock}
                  </p>
                  <p className="mt-2 text-[2.2rem] leading-none font-bold tracking-tight text-slate-950">
                    {selectedProduct.stock}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.detail.salesPrice}
                  </p>
                  <p className="mt-2 text-[2.2rem] leading-none font-bold tracking-tight text-slate-950">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                </div>
                {capabilities.canViewInventoryCost ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {messages.productsWorkspace.detail.averageCost}
                    </p>
                    <p className="mt-2 text-[1.6rem] leading-none font-bold tracking-tight text-slate-900">
                      {formatCurrency(selectedProduct.averageCost)}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.detail.minStock}
                  </p>
                  <p className="mt-2 text-[1.6rem] leading-none font-bold tracking-tight text-slate-900">
                    {selectedProduct.minStock}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[2rem] leading-tight font-semibold tracking-tight text-slate-950">
                    {selectedProduct.name}
                  </h3>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {selectedProduct.stockState === "with_stock"
                      ? messages.productsWorkspace.status.inStock
                      : selectedProduct.stockState === "low_stock"
                        ? messages.productsWorkspace.status.lowStock
                        : selectedProduct.stockState === "out_of_stock"
                          ? messages.productsWorkspace.status.outOfStock
                          : messages.productsWorkspace.status.inactive}
                  </span>
                </div>
                <p className="mt-2 text-base font-medium text-slate-500">
                  {labelForCategory(selectedProduct.categoryId)} • {selectedProduct.sku}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.detail.sku}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {selectedProduct.sku}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.detail.ean}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {selectedProduct.ean ?? messages.productsWorkspace.detail.noEan}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.detail.lastMovement}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {selectedProduct.lastMovementAt
                      ? formatDateTime(selectedProduct.lastMovementAt)
                      : messages.productsWorkspace.detail.noMovement}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.quickActionsTitle}
                </p>
                {capabilities.canAdjustStock || canEditProduct ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {capabilities.canAdjustStock ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setStockForm(defaultStockFormState("inbound"));
                            setOpenDialog("stock");
                          }}
                          data-testid="products-workspace-open-add-stock-button"
                          className="flex min-h-[4rem] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white"
                        >
                          <Boxes size={18} />
                          {messages.productsWorkspace.actions.addStock}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStockForm(defaultStockFormState("adjustment"));
                            setOpenDialog("stock");
                          }}
                          data-testid="products-workspace-open-adjust-stock-button"
                          className="flex min-h-[4rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800"
                        >
                          <AlertTriangle size={18} />
                          {messages.productsWorkspace.actions.adjustStock}
                        </button>
                      </>
                    ) : null}
                    {canEditProduct ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setOpenDialog("edit")}
                          data-testid="products-workspace-open-edit-button"
                          className="flex min-h-[4rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800"
                        >
                          <Pencil size={18} />
                          {messages.productsWorkspace.actions.editProduct}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleArchiveProduct()}
                          data-testid="products-workspace-archive-button"
                          className="flex min-h-[4rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800"
                        >
                          <Archive size={18} />
                          {messages.productsWorkspace.actions.archiveProduct}
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-500">
                    {messages.accessControl.readOnlyWorkspaceHint}
                  </div>
                )}
              </div>

              <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <header className="flex items-center justify-between gap-3">
                  <h3 className="text-[1.35rem] font-semibold tracking-tight text-slate-900">
                    {messages.productsWorkspace.movementHistoryTitle}
                  </h3>
                </header>

                <div className="mt-4 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
                  {isLoadingMovements ? (
                    <p className="text-sm font-medium text-slate-500">
                      {messages.common.states.loading}
                    </p>
                  ) : movementHistory.length === 0 ? (
                    <p className="text-sm font-medium text-slate-500">
                      {messages.productsWorkspace.detail.noMovementHistory}
                    </p>
                  ) : (
                    movementHistory.map((movement) => (
                      <div
                        key={movement.movementId}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base font-semibold text-slate-900">
                            {labelForMovementType(movement.movementType)}
                          </p>
                          <p className="text-sm font-semibold text-slate-700">
                            {movement.quantity} un.
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(movement.occurredAt)}
                          {movement.reason ? ` • ${humanizeIdentifier(movement.reason)}` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </div>
        </Dialog>
      ) : null}

      {openDialog === "create" ? (
        <Dialog title={messages.productsWorkspace.dialogs.createTitle} onClose={() => setOpenDialog(null)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitProductOnboarding}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.name}
              </span>
              <input
                data-testid="products-workspace-create-name-input"
                required
                minLength={2}
                value={onboardingForm.name}
                onChange={(event) =>
                  setOnboardingForm((current) => ({ ...current, name: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.sku}
              </span>
              <input
                data-testid="products-workspace-create-sku-input"
                value={onboardingForm.sku}
                onChange={(event) =>
                  setOnboardingForm((current) => ({ ...current, sku: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <CategoryInputField
              label={messages.productsWorkspace.fields.category}
              inputTestId="products-workspace-create-category-input"
              categoryCode={onboardingForm.categoryId}
              knownCategoryCodes={onboardingCategories}
              onCategoryCodeChange={(nextCategoryCode) =>
                setOnboardingForm((current) => ({
                  ...current,
                  categoryId: nextCategoryCode,
                }))
              }
              required
            />
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.price}
              </span>
              <input
                data-testid="products-workspace-create-price-input"
                required
                type="number"
                step="0.01"
                min="0.01"
                value={onboardingForm.price}
                onChange={(event) =>
                  setOnboardingForm((current) => ({ ...current, price: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.cost}
              </span>
              <input
                data-testid="products-workspace-create-cost-input"
                type="number"
                step="0.01"
                min="0.01"
                value={onboardingForm.cost}
                onChange={(event) =>
                  setOnboardingForm((current) => ({ ...current, cost: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.catalog.onboarding.initialStockLabel}
              </span>
              <input
                data-testid="products-workspace-create-stock-input"
                required
                type="number"
                min="0"
                step="1"
                value={onboardingForm.initialStock}
                onChange={(event) =>
                  setOnboardingForm((current) => ({
                    ...current,
                    initialStock: event.target.value,
                  }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.minStock}
              </span>
              <input
                data-testid="products-workspace-create-min-stock-input"
                required
                type="number"
                min="0"
                step="1"
                value={onboardingForm.minStock}
                onChange={(event) =>
                  setOnboardingForm((current) => ({ ...current, minStock: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <ManagedProductImageField
              className="md:col-span-2"
              label={messages.productsWorkspace.fields.image}
              previewAlt={onboardingForm.name.trim() || messages.productsWorkspace.fields.image}
              imageUrl={onboardingForm.imageUrl}
              imageFile={onboardingForm.imageFile}
              urlInputTestId="products-workspace-create-image-input"
              fileInputTestId="products-workspace-create-image-file-input"
              onImageUrlChange={(value) =>
                setOnboardingForm((current) => ({ ...current, imageUrl: value }))
              }
              onImageFileChange={(file) =>
                setOnboardingForm((current) => ({ ...current, imageFile: file }))
              }
            />
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenDialog(null)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                {messages.common.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmittingCreate}
                data-testid="products-workspace-create-submit-button"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmittingCreate
                  ? messages.common.states.creating
                  : messages.common.actions.createProduct}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}

      {openDialog === "bulkPrices" ? (
        <Dialog
          title={messages.productsWorkspace.actions.bulkPrices}
          onClose={() => setOpenDialog(null)}
        >
          <BulkPriceUpdatePanel
            variant="dialog"
            refreshToken={refreshToken}
            onPricesUpdated={async (result) => {
              setOpenDialog(null);
              await refreshWorkspace();
              publishWorkspaceFeedback({
                type: "success",
                message: messages.catalog.bulkPriceUpdate.applied(result.updatedCount),
              });
            }}
          />
        </Dialog>
      ) : null}

      {openDialog === "bulkProductProfiles" ? (
        <Dialog
          title={messages.productsWorkspace.actions.bulkProductProfiles}
          onClose={() => setOpenDialog(null)}
        >
          <BulkProductProfileUpdatePanel
            canAdjustStock={capabilities.canAdjustStock}
            refreshToken={refreshToken}
            onProfilesUpdated={async (result) => {
              setOpenDialog(null);
              await refreshWorkspace();
              publishWorkspaceFeedback({
                type: "success",
                message: messages.productsWorkspace.feedback.bulkProductProfilesUpdated(
                  result.updatedProducts,
                  result.adjustedStockProducts,
                ),
              });
            }}
          />
        </Dialog>
      ) : null}

      {openDialog === "edit" && selectedProduct ? (
        <Dialog title={messages.productsWorkspace.dialogs.editTitle} onClose={() => setOpenDialog(null)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleEditProduct}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.name}
              </span>
              <input
                data-testid="products-workspace-edit-name-input"
                required
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, name: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.sku}
              </span>
              <input
                data-testid="products-workspace-edit-sku-input"
                value={editForm.sku}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, sku: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <CategoryInputField
              label={messages.productsWorkspace.fields.category}
              inputTestId="products-workspace-edit-category-input"
              categoryCode={editForm.categoryId}
              knownCategoryCodes={[
                ...onboardingCategories,
                ...((workspace?.items ?? []).map((item) => item.categoryId)),
              ]}
              onCategoryCodeChange={(nextCategoryCode) =>
                setEditForm((current) => ({ ...current, categoryId: nextCategoryCode }))
              }
              required
            />
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.price}
              </span>
              <input
                data-testid="products-workspace-edit-price-input"
                required
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.price}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, price: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.cost}
              </span>
              <input
                data-testid="products-workspace-edit-cost-input"
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.cost}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, cost: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.minStock}
              </span>
              <input
                data-testid="products-workspace-edit-min-stock-input"
                required
                type="number"
                min="0"
                step="1"
                value={editForm.minStock}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, minStock: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <ManagedProductImageField
              className="md:col-span-2"
              label={messages.productsWorkspace.fields.image}
              previewAlt={editForm.name.trim() || selectedProduct.name}
              currentImageUrl={selectedProduct.imageUrl}
              imageUrl={editForm.imageUrl}
              imageFile={editForm.imageFile}
              urlInputTestId="products-workspace-edit-image-input"
              fileInputTestId="products-workspace-edit-image-file-input"
              onImageUrlChange={(value) =>
                setEditForm((current) => ({ ...current, imageUrl: value }))
              }
              onImageFileChange={(file) =>
                setEditForm((current) => ({ ...current, imageFile: file }))
              }
            />
            <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                data-testid="products-workspace-edit-active-checkbox"
                type="checkbox"
                checked={editForm.isActive}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              {messages.productsWorkspace.forms.activeOnlyHelp}
            </label>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenDialog(null)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                {messages.common.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="products-workspace-edit-submit-button"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? messages.common.states.saving : messages.common.actions.apply}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}

      {openDialog === "stock" && selectedProduct ? (
        <Dialog title={messages.productsWorkspace.dialogs.stockTitle} onClose={() => setOpenDialog("detail")}>
          <form
            noValidate
            className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
            onSubmit={handleStockMovement}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.name}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {selectedProduct.name}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {(["inbound", "adjustment", "outbound"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setStockForm((current) => ({
                        ...current,
                        movementType: mode,
                        unitCost: mode === "inbound" ? current.unitCost : "",
                      }))
                    }
                    data-testid={`products-workspace-stock-mode-${mode}`}
                    className={[
                      "min-h-[4rem] rounded-2xl border px-4 py-4 text-center text-base font-semibold",
                      stockForm.movementType === mode
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    {messages.productsWorkspace.modals.stockModes[mode]}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {messages.productsWorkspace.fields.quantity}
                  </span>
                  <input
                    data-testid="products-workspace-stock-quantity-input"
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={stockForm.quantity}
                    onChange={(event) =>
                      setStockForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {messages.productsWorkspace.fields.cost}
                  </span>
                  <input
                    data-testid="products-workspace-stock-unit-cost-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required={stockForm.movementType === "inbound"}
                    disabled={stockForm.movementType !== "inbound"}
                    value={stockForm.unitCost}
                    onChange={(event) =>
                      setStockForm((current) => ({ ...current, unitCost: event.target.value }))
                    }
                    className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none disabled:opacity-50"
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {messages.common.labels.notesOptional}
                  </span>
                  <input
                    data-testid="products-workspace-stock-reason-input"
                    value={stockForm.reason}
                    onChange={(event) =>
                      setStockForm((current) => ({ ...current, reason: event.target.value }))
                    }
                    className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.modals.stockSummaryTitle}
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.fields.currentStock}
                  </p>
                  <p className="mt-1 text-[1.6rem] font-bold text-slate-900">
                    {selectedProduct.stock}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.common.labels.method}
                  </p>
                  <p className="mt-1 text-[1.2rem] font-bold text-slate-900">
                    {labelForMovementType(stockForm.movementType)}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenDialog("detail")}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  {messages.common.actions.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="products-workspace-stock-submit-button"
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSubmitting
                    ? messages.common.states.registering
                    : messages.common.actions.registerMovement}
                </button>
              </div>
            </div>
          </form>
        </Dialog>
      ) : null}

      {openDialog === "bulkProducts" ? (
        <Dialog title={messages.productsWorkspace.dialogs.bulkProductsTitle} onClose={() => setOpenDialog(null)}>
          <form className="space-y-4" onSubmit={handleBulkProducts}>
            <p className="text-sm text-slate-500">
              {messages.productsWorkspace.bulk.productsPasteHint}
            </p>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">{messages.productsWorkspace.bulk.directApplyTitle}</p>
              <p className="mt-1">{messages.productsWorkspace.bulk.directApplyBody}</p>
              <p className="mt-1 text-amber-700">
                {messages.productsWorkspace.bulk.advancedFlow}
              </p>
            </div>
            <textarea
              data-testid="products-workspace-bulk-products-input"
              value={bulkProductsInput}
              onChange={(event) => setBulkProductsInput(event.target.value)}
              placeholder={messages.productsWorkspace.bulk.productsPlaceholder}
              className="min-h-[18rem] w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenDialog(null)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                {messages.common.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="products-workspace-bulk-products-submit-button"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? messages.common.states.creating : messages.productsWorkspace.actions.bulkProducts}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}

      {openDialog === "bulkStock" ? (
        <Dialog title={messages.productsWorkspace.dialogs.bulkStockTitle} onClose={() => setOpenDialog(null)}>
          <form className="space-y-4" onSubmit={handleBulkStock}>
            <p className="text-sm text-slate-500">
              {messages.productsWorkspace.bulk.stockPasteHint}
            </p>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">{messages.productsWorkspace.bulk.directApplyTitle}</p>
              <p className="mt-1">{messages.productsWorkspace.bulk.directApplyBody}</p>
              <p className="mt-1 text-amber-700">
                {messages.productsWorkspace.bulk.advancedFlow}
              </p>
            </div>
            <textarea
              data-testid="products-workspace-bulk-stock-input"
              value={bulkStockInput}
              onChange={(event) => setBulkStockInput(event.target.value)}
              placeholder={messages.productsWorkspace.bulk.stockPlaceholder}
              className="min-h-[18rem] w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenDialog(null)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                {messages.common.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="products-workspace-bulk-stock-submit-button"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? messages.common.states.registering : messages.productsWorkspace.actions.bulkStock}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </section>
  );
}
