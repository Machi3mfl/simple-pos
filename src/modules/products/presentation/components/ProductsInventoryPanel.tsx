"use client";

import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Boxes,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";

type StockFilter = "all" | "with_stock" | "low_stock" | "out_of_stock" | "inactive";
type SortMode = "stock" | "name" | "recent" | "price";
type StockMovementMode = "inbound" | "adjustment" | "outbound";
type DialogId =
  | "detail"
  | "create"
  | "edit"
  | "stock"
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

interface FeedbackState {
  readonly type: "success" | "error";
  readonly message: string;
}

interface ProductFormState {
  readonly name: string;
  readonly sku: string;
  readonly categoryId: string;
  readonly price: string;
  readonly cost: string;
  readonly initialStock: string;
  readonly minStock: string;
  readonly imageUrl: string;
}

interface EditProductFormState {
  readonly name: string;
  readonly sku: string;
  readonly categoryId: string;
  readonly price: string;
  readonly cost: string;
  readonly minStock: string;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

interface StockFormState {
  readonly movementType: StockMovementMode;
  readonly quantity: string;
  readonly unitCost: string;
  readonly reason: string;
}

const defaultCreateFormState: ProductFormState = {
  name: "",
  sku: "",
  categoryId: "other",
  price: "",
  cost: "",
  initialStock: "0",
  minStock: "0",
  imageUrl: "",
};

const defaultEditFormState: EditProductFormState = {
  name: "",
  sku: "",
  categoryId: "other",
  price: "",
  cost: "",
  minStock: "0",
  imageUrl: "",
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
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 md:px-6">
            <h3 className="text-[1.8rem] font-semibold tracking-tight text-slate-900">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              data-testid="products-workspace-dialog-close"
              className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600"
              aria-label={messages.common.actions.close}
            >
              <X size={18} />
            </button>
          </header>
          <div className="min-h-0 overflow-y-auto px-5 py-4 md:px-6 md:py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ProductImage({
  imageUrl,
  name,
  className,
  imageClassName,
}: {
  readonly imageUrl?: string;
  readonly name: string;
  readonly className?: string;
  readonly imageClassName?: string;
}): JSX.Element {
  return (
    <div
      className={[
        "mx-auto flex items-center justify-center rounded-full bg-slate-100",
        className ?? "size-[4.6rem] lg:size-[5.1rem]",
      ].join(" ")}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Operators can use arbitrary external image URLs, so next/image domain allowlists would block valid product photos here.
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className={imageClassName ?? "h-[72%] w-[72%] object-contain"}
        />
      ) : (
        <Package size={32} className="text-slate-400" />
      )}
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

export function ProductsInventoryPanel(): JSX.Element {
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
  const [page, setPage] = useState<number>(1);
  const [workspace, setWorkspace] = useState<WorkspaceProductsResponse | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<DialogId>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [movementHistory, setMovementHistory] = useState<readonly StockMovementItem[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<ProductFormState>(defaultCreateFormState);
  const [editForm, setEditForm] = useState<EditProductFormState>(defaultEditFormState);
  const [stockForm, setStockForm] = useState<StockFormState>(defaultStockFormState("inbound"));
  const [bulkProductsInput, setBulkProductsInput] = useState<string>("");
  const [bulkStockInput, setBulkStockInput] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<number>(0);

  const selectedProduct =
    workspace?.items.find((item) => item.id === selectedProductId) ?? workspace?.items[0] ?? null;

  const categoryOptions = useMemo(() => {
    const categorySet = new Set<string>(["all"]);
    for (const item of workspace?.items ?? []) {
      categorySet.add(item.categoryId);
    }

    return Array.from(categorySet.values());
  }, [workspace?.items]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, stockFilter, activeOnly, sortMode, deferredSearchTerm]);

  useEffect(() => {
    async function loadWorkspace(): Promise<void> {
      setIsLoadingWorkspace(true);
      const params = new URLSearchParams();
      if (deferredSearchTerm.trim().length > 0) {
        params.set("q", deferredSearchTerm.trim());
      }
      if (categoryFilter !== "all") {
        params.set("categoryId", categoryFilter);
      }
      if (stockFilter !== "all") {
        params.set("stockState", stockFilter);
      }
      params.set("activeOnly", String(activeOnly));
      params.set("sort", sortMode);
      params.set("page", String(page));
      params.set("pageSize", "20");

      try {
        const { response, data } = await fetchJsonNoStore<WorkspaceProductsResponse>(
          `/api/v1/products/workspace?${params.toString()}`,
        );

        if (!response.ok || !data) {
          setFeedback({
            type: "error",
            message: messages.productsWorkspace.loadError,
          });
          return;
        }

        setWorkspace(data);
      } catch {
        setFeedback({
          type: "error",
          message: messages.productsWorkspace.loadError,
        });
      } finally {
        setIsLoadingWorkspace(false);
      }
    }

    void loadWorkspace();
  }, [
    activeOnly,
    categoryFilter,
    deferredSearchTerm,
    messages.productsWorkspace.loadError,
    page,
    refreshToken,
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
      imageUrl: selectedProduct.imageUrl,
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
          setFeedback({
            type: "error",
            message: messages.productsWorkspace.movementsLoadError,
          });
          return;
        }

        setMovementHistory(data.items.slice(0, 6));
      } catch {
        setFeedback({
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
    refreshToken,
    selectedProduct,
  ]);

  async function refreshWorkspace(): Promise<void> {
    setRefreshToken((current) => current + 1);
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sku: createForm.sku.trim() || undefined,
          name: createForm.name.trim(),
          categoryId: createForm.categoryId.trim(),
          price: Number(createForm.price),
          cost: createForm.cost.trim().length > 0 ? Number(createForm.cost) : undefined,
          initialStock: Number(createForm.initialStock),
          minStock: Number(createForm.minStock),
          imageUrl: createForm.imageUrl.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as ProductResponse | ApiErrorPayload;
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.createProduct),
        });
        return;
      }

      setFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.productCreated(
          (payload as ProductResponse).item.name,
        ),
      });
      setCreateForm(defaultCreateFormState);
      setOpenDialog(null);
      await refreshWorkspace();
    } catch {
      setFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.createProduct,
      });
    } finally {
      setIsSubmitting(false);
    }
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
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sku: editForm.sku.trim(),
          name: editForm.name.trim(),
          categoryId: editForm.categoryId.trim(),
          price: Number(editForm.price),
          cost: editForm.cost.trim().length > 0 ? Number(editForm.cost) : undefined,
          minStock: Number(editForm.minStock),
          imageUrl: editForm.imageUrl.trim(),
          isActive: editForm.isActive,
        }),
      });

      const payload = (await response.json()) as ProductResponse | ApiErrorPayload;
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.updateProduct),
        });
        return;
      }

      setFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.productUpdated(
          (payload as ProductResponse).item.name,
        ),
      });
      setOpenDialog(null);
      await refreshWorkspace();
    } catch {
      setFeedback({
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
        setFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.archiveProduct),
        });
        return;
      }

      setFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.productArchived(selectedProduct.name),
      });
      setOpenDialog(null);
      await refreshWorkspace();
    } catch {
      setFeedback({
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
          quantity: Number(stockForm.quantity),
          unitCost:
            stockForm.movementType === "inbound" && stockForm.unitCost.trim().length > 0
              ? Number(stockForm.unitCost)
              : undefined,
          reason: stockForm.reason.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as StockMovementItem | ApiErrorPayload;
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.stockRegister),
        });
        return;
      }

      setFeedback({
        type: "success",
        message: messages.productsWorkspace.feedback.stockRegistered(selectedProduct.name),
      });
      setStockForm(defaultStockFormState(stockForm.movementType));
      setOpenDialog("detail");
      await refreshWorkspace();
    } catch {
      setFeedback({
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
      setFeedback({
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
      minStock: Number(columns[6] ?? 0),
      imageUrl: columns[7] || undefined,
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
        setFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.bulkProducts),
        });
        return;
      }

      const result = payload as BulkCreateProductsResponse;
      setFeedback({
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
      setFeedback({
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
      setFeedback({
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
        setFeedback({
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
        setFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.productsWorkspace.errors.bulkStock),
        });
        return;
      }

      const result = payload as BulkStockMovementsResponse;
      setFeedback({
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
      setFeedback({
        type: "error",
        message: messages.productsWorkspace.errors.bulkStock,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const workspaceItems = workspace?.items ?? [];

  return (
    <section className="min-h-0 min-w-0 overflow-y-auto bg-[#f5f6f8] p-3 lg:col-span-2 lg:h-full lg:p-4">
      <div className="flex w-full flex-col gap-3">
        {feedback ? (
          <div
            data-testid="products-workspace-feedback"
            className={[
              "rounded-2xl border px-4 py-3 text-sm font-semibold",
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700",
            ].join(" ")}
          >
            {feedback.message}
          </div>
        ) : null}

        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="px-5 py-4 lg:px-6 lg:py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-[2.4rem] leading-none font-semibold tracking-tight text-slate-950 lg:text-[2.85rem]">
                  {messages.productsWorkspace.title}
                </h1>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:w-[36rem]">
                <button
                  type="button"
                  onClick={() => setOpenDialog("create")}
                  data-testid="products-workspace-open-create-button"
                  className="flex min-h-[4.25rem] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.25)]"
                >
                  <Plus size={20} />
                  {messages.productsWorkspace.actions.newProduct}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDialog("bulkProducts")}
                  data-testid="products-workspace-open-bulk-products-button"
                  className="flex min-h-[4.25rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800"
                >
                  <Upload size={20} />
                  {messages.productsWorkspace.actions.bulkProducts}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDialog("bulkStock")}
                  data-testid="products-workspace-open-bulk-stock-button"
                  className="flex min-h-[4.25rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800"
                >
                  <PackagePlus size={20} />
                  {messages.productsWorkspace.actions.bulkStock}
                </button>
              </div>
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
              <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] lg:px-5">
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
                    product.stockState === "with_stock"
                      ? messages.productsWorkspace.status.inStock
                      : product.stockState === "low_stock"
                        ? messages.productsWorkspace.status.lowStock
                        : product.stockState === "out_of_stock"
                          ? messages.productsWorkspace.status.outOfStock
                          : messages.productsWorkspace.status.inactive;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setOpenDialog("detail");
                      }}
                      data-testid={`products-workspace-card-${product.id}`}
                      className="rounded-[1.25rem] border border-slate-200 bg-white p-3 text-left shadow-[0_20px_30px_rgba(15,23,42,0.09)] transition hover:-translate-y-0.5"
                    >
                      <ProductImage imageUrl={product.imageUrl} name={product.name} />

                      <div className="mt-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[1.22rem] leading-[1.04] font-semibold tracking-tight text-slate-900">
                            {product.name}
                          </h3>
                          <span
                            className={[
                              "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold",
                              statusTone,
                            ].join(" ")}
                          >
                            {statusText}
                          </span>
                        </div>

                        <p className="mt-px text-[0.76rem] leading-tight text-slate-500">
                          {labelForCategory(product.categoryId)} • {product.sku}
                        </p>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
                          <p className="whitespace-nowrap text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                            {messages.productsWorkspace.fields.currentStockShort}
                          </p>
                          <p className="text-[0.92rem] font-bold tracking-tight text-slate-900">
                            {product.stock}
                          </p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
                          <p className="whitespace-nowrap text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                            {messages.productsWorkspace.fields.minStockShort}
                          </p>
                          <p className="text-[0.92rem] font-bold tracking-tight text-slate-900">
                            {product.minStock}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <span className="text-[1.35rem] leading-none font-bold tracking-tight text-slate-900">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-[0.74rem] font-semibold text-blue-700">
                          {messages.productsWorkspace.detailTitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <p className="text-sm font-medium text-slate-500">
                  {messages.productsWorkspace.pagination.pageLabel(
                    workspace?.page ?? 1,
                    workspace?.totalPages ?? 1,
                  )}{" "}
                  • {workspace?.totalItems ?? 0} productos
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={(workspace?.page ?? 1) <= 1}
                    data-testid="products-workspace-pagination-prev"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                  >
                    {messages.productsWorkspace.pagination.previous}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(workspace?.totalPages ?? current, current + 1),
                      )
                    }
                    disabled={(workspace?.page ?? 1) >= (workspace?.totalPages ?? 1)}
                    data-testid="products-workspace-pagination-next"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                  >
                    {messages.productsWorkspace.pagination.next}
                  </button>
                </div>
              </footer>
            </>
          )}
        </article>
      </div>

      {openDialog === "detail" && selectedProduct ? (
        <Dialog title={messages.productsWorkspace.dialogs.detailTitle} onClose={() => setOpenDialog(null)}>
          <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-3">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex min-h-[12rem] items-center justify-center rounded-[1.5rem] bg-white">
                  <ProductImage
                    imageUrl={selectedProduct.imageUrl}
                    name={selectedProduct.name}
                    className="size-32"
                    imageClassName="h-[78%] w-[78%] object-contain"
                  />
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
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.detail.averageCost}
                  </p>
                  <p className="mt-2 text-[1.6rem] leading-none font-bold tracking-tight text-slate-900">
                    {formatCurrency(selectedProduct.averageCost)}
                  </p>
                </div>
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

              <div className="grid gap-3 sm:grid-cols-2">
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                </div>
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
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateProduct}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.name}
              </span>
              <input
                data-testid="products-workspace-create-name-input"
                required
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
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
                value={createForm.sku}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, sku: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.category}
              </span>
              <input
                data-testid="products-workspace-create-category-input"
                required
                value={createForm.categoryId}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
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
                value={createForm.price}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, price: event.target.value }))
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
                value={createForm.cost}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, cost: event.target.value }))
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
                value={createForm.initialStock}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, initialStock: event.target.value }))
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
                value={createForm.minStock}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, minStock: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
            <label className="md:col-span-2 flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.image}
              </span>
              <input
                data-testid="products-workspace-create-image-input"
                value={createForm.imageUrl}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, imageUrl: event.target.value }))
                }
                placeholder={messages.common.placeholders.imageUrl}
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
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
                data-testid="products-workspace-create-submit-button"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? messages.common.states.creating : messages.common.actions.createProduct}
              </button>
            </div>
          </form>
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
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.category}
              </span>
              <input
                data-testid="products-workspace-edit-category-input"
                required
                value={editForm.categoryId}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
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
            <label className="md:col-span-2 flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.image}
              </span>
              <input
                data-testid="products-workspace-edit-image-input"
                value={editForm.imageUrl}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, imageUrl: event.target.value }))
                }
                className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
              />
            </label>
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
          <form className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]" onSubmit={handleStockMovement}>
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
