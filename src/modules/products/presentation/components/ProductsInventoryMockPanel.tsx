"use client";

import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Boxes,
  ClipboardList,
  ImageIcon,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";

type ProductCategory = "beverages" | "snacks" | "candy" | "pantry" | "other";
type StockState = "all" | "with_stock" | "low_stock" | "out_of_stock";
type SortMode = "stock" | "name" | "recent";
type MockDialogId =
  | "detail"
  | "create"
  | "edit"
  | "stock"
  | "bulkProducts"
  | "bulkStock"
  | null;

interface MockMovement {
  readonly id: string;
  readonly type: "inbound" | "adjustment" | "outbound";
  readonly quantity: number;
  readonly when: string;
  readonly actor: string;
}

interface MockProduct {
  readonly id: string;
  readonly name: string;
  readonly categoryId: ProductCategory;
  readonly sku: string;
  readonly barcode: string;
  readonly price: number;
  readonly averageCost: number;
  readonly stock: number;
  readonly minStock: number;
  readonly isActive: boolean;
  readonly supplier: string;
  readonly emoji: string;
  readonly lastMovement: string;
  readonly movements: readonly MockMovement[];
}

const mockProducts: readonly MockProduct[] = [
  {
    id: "prod-bev-001",
    name: "Coca-Cola 500 ml",
    categoryId: "beverages",
    sku: "BEB-001",
    barcode: "7790895000012",
    price: 1800,
    averageCost: 940,
    stock: 36,
    minStock: 12,
    isActive: true,
    supplier: "Distribuidora Centro",
    emoji: "🥤",
    lastMovement: "Ingreso de 24 botellas hoy, 09:10",
    movements: [
      { id: "mov-001", type: "inbound", quantity: 24, when: "Hoy 09:10", actor: "Maxi" },
      { id: "mov-002", type: "outbound", quantity: 8, when: "Ayer 17:40", actor: "Caja" },
      { id: "mov-003", type: "adjustment", quantity: 2, when: "Ayer 08:25", actor: "Depósito" },
    ],
  },
  {
    id: "prod-snack-001",
    name: "Papas Lays clásicas",
    categoryId: "snacks",
    sku: "SNA-014",
    barcode: "7790314000148",
    price: 2200,
    averageCost: 1100,
    stock: 6,
    minStock: 8,
    isActive: true,
    supplier: "Mayorista San Juan",
    emoji: "🥔",
    lastMovement: "Salida de 5 paquetes hoy, 10:45",
    movements: [
      { id: "mov-004", type: "outbound", quantity: 5, when: "Hoy 10:45", actor: "Caja" },
      { id: "mov-005", type: "inbound", quantity: 12, when: "Ayer 07:30", actor: "Maxi" },
      { id: "mov-006", type: "adjustment", quantity: 1, when: "Lun 18:10", actor: "Depósito" },
    ],
  },
  {
    id: "prod-candy-001",
    name: "Alfajor triple chocolate",
    categoryId: "candy",
    sku: "GOL-002",
    barcode: "7791234000206",
    price: 1500,
    averageCost: 760,
    stock: 0,
    minStock: 5,
    isActive: true,
    supplier: "Distribuidora Dulce Sur",
    emoji: "🍫",
    lastMovement: "Sin stock desde hoy, 12:20",
    movements: [
      { id: "mov-007", type: "outbound", quantity: 4, when: "Hoy 12:20", actor: "Caja" },
      { id: "mov-008", type: "outbound", quantity: 3, when: "Hoy 11:30", actor: "Caja" },
      { id: "mov-009", type: "inbound", quantity: 7, when: "Ayer 08:00", actor: "Maxi" },
    ],
  },
  {
    id: "prod-pantry-001",
    name: "Yerba mate 1 kg",
    categoryId: "pantry",
    sku: "ALM-010",
    barcode: "7792712000334",
    price: 6200,
    averageCost: 3900,
    stock: 12,
    minStock: 6,
    isActive: true,
    supplier: "Almacén Federal",
    emoji: "🧉",
    lastMovement: "Ingreso de 10 paquetes ayer, 15:15",
    movements: [
      { id: "mov-010", type: "inbound", quantity: 10, when: "Ayer 15:15", actor: "Maxi" },
      { id: "mov-011", type: "outbound", quantity: 2, when: "Ayer 16:40", actor: "Caja" },
      { id: "mov-012", type: "outbound", quantity: 1, when: "Ayer 17:20", actor: "Caja" },
    ],
  },
  {
    id: "prod-other-001",
    name: "Pilas AA x2",
    categoryId: "other",
    sku: "OTR-050",
    barcode: "7794001000507",
    price: 3400,
    averageCost: 1800,
    stock: 3,
    minStock: 4,
    isActive: true,
    supplier: "Electronica Express",
    emoji: "🔋",
    lastMovement: "Salida de 2 packs hoy, 08:55",
    movements: [
      { id: "mov-013", type: "outbound", quantity: 2, when: "Hoy 08:55", actor: "Caja" },
      { id: "mov-014", type: "inbound", quantity: 5, when: "Ayer 12:15", actor: "Maxi" },
      { id: "mov-015", type: "adjustment", quantity: 1, when: "Mar 14:35", actor: "Depósito" },
    ],
  },
  {
    id: "prod-bev-002",
    name: "Agua mineral 500 ml",
    categoryId: "beverages",
    sku: "BEB-008",
    barcode: "7795511000608",
    price: 1200,
    averageCost: 510,
    stock: 9,
    minStock: 4,
    isActive: false,
    supplier: "Distribuidora Centro",
    emoji: "💧",
    lastMovement: "Producto pausado por cambio de proveedor",
    movements: [
      { id: "mov-016", type: "adjustment", quantity: 2, when: "Lun 09:40", actor: "Maxi" },
      { id: "mov-017", type: "outbound", quantity: 5, when: "Dom 13:05", actor: "Caja" },
      { id: "mov-018", type: "inbound", quantity: 16, when: "Sáb 07:20", actor: "Maxi" },
    ],
  },
] as const;

function resolveStockStatus(product: MockProduct): "in_stock" | "low_stock" | "out_of_stock" | "inactive" {
  if (!product.isActive) {
    return "inactive";
  }

  if (product.stock <= 0) {
    return "out_of_stock";
  }

  if (product.stock <= product.minStock) {
    return "low_stock";
  }

  return "in_stock";
}

function stockStatusWeight(product: MockProduct): number {
  const status = resolveStockStatus(product);

  switch (status) {
    case "in_stock":
      return 0;
    case "low_stock":
      return 1;
    case "out_of_stock":
      return 2;
    default:
      return 3;
  }
}

function resolveStatusTone(status: ReturnType<typeof resolveStockStatus>): string {
  switch (status) {
    case "in_stock":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "low_stock":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "out_of_stock":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

interface MockDialogProps {
  readonly title: string;
  readonly description?: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
  readonly footerNote?: string;
}

function MockDialog({
  title,
  description,
  onClose,
  children,
  footerNote,
}: MockDialogProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1040px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 md:px-6">
            <div>
              <h3 className="text-[1.8rem] font-semibold tracking-tight text-slate-900">
                {title}
              </h3>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600"
              aria-label="cerrar modal"
            >
              <X size={18} />
            </button>
          </header>
          <div className="min-h-0 overflow-y-auto px-5 py-4 md:px-6 md:py-5">{children}</div>
          {footerNote ? (
            <footer className="rounded-b-[2rem] bg-slate-50 px-5 py-4 md:px-6">
              <p className="text-sm font-medium text-slate-600">{footerNote}</p>
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProductsInventoryMockPanel(): JSX.Element {
  const { messages, formatCurrency, humanizeIdentifier } = useI18n();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [stockFilter, setStockFilter] = useState<StockState>("all");
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [sortMode, setSortMode] = useState<SortMode>("stock");
  const [selectedProductId, setSelectedProductId] = useState<string>(mockProducts[0].id);
  const [openDialog, setOpenDialog] = useState<MockDialogId>(null);
  const productCategoryLabels = messages.productsWorkspace.categories;
  const labelForProductCategory = (categoryId: ProductCategory): string =>
    productCategoryLabels[categoryId] ?? humanizeIdentifier(categoryId);
  const openProductDetail = (productId: string): void => {
    setSelectedProductId(productId);
    setOpenDialog("detail");
  };

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...mockProducts]
      .filter((product) => {
        if (activeOnly && !product.isActive) {
          return false;
        }

        if (categoryFilter !== "all" && product.categoryId !== categoryFilter) {
          return false;
        }

        if (stockFilter === "with_stock" && product.stock <= 0) {
          return false;
        }

        if (stockFilter === "low_stock") {
          const status = resolveStockStatus(product);
          if (status !== "low_stock") {
            return false;
          }
        }

        if (stockFilter === "out_of_stock" && product.stock > 0) {
          return false;
        }

        if (normalizedSearch.length > 0) {
          return (
            product.name.toLowerCase().includes(normalizedSearch) ||
            product.sku.toLowerCase().includes(normalizedSearch) ||
            product.barcode.includes(normalizedSearch)
          );
        }

        return true;
      })
      .sort((left, right) => {
        if (sortMode === "name") {
          return left.name.localeCompare(right.name, "es");
        }

        if (sortMode === "recent") {
          return right.lastMovement.localeCompare(left.lastMovement, "es");
        }

        const statusDelta = stockStatusWeight(left) - stockStatusWeight(right);
        if (statusDelta !== 0) {
          return statusDelta;
        }

        return right.stock - left.stock;
      });
  }, [activeOnly, categoryFilter, searchTerm, sortMode, stockFilter]);

  useEffect(() => {
    if (visibleProducts.length === 0) {
      return;
    }

    if (!visibleProducts.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(visibleProducts[0].id);
    }
  }, [selectedProductId, visibleProducts]);

  const selectedProduct =
    visibleProducts.find((product) => product.id === selectedProductId) ?? visibleProducts[0];

  const withStockCount = mockProducts.filter((product) => product.stock > 0 && product.isActive).length;
  const lowStockCount = mockProducts.filter(
    (product) => resolveStockStatus(product) === "low_stock",
  ).length;
  const outOfStockCount = mockProducts.filter(
    (product) => resolveStockStatus(product) === "out_of_stock",
  ).length;
  const estimatedInventoryValue = mockProducts.reduce(
    (sum, product) => sum + product.stock * product.averageCost,
    0,
  );

  if (!selectedProduct) {
    return (
      <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:overflow-y-auto lg:p-6">
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">No hay productos.</p>
        </div>
      </section>
    );
  }

  const selectedStatus = resolveStockStatus(selectedProduct);
  const selectedStatusTone = resolveStatusTone(selectedStatus);
  const statusLabel =
    selectedStatus === "in_stock"
      ? messages.productsWorkspace.status.inStock
      : selectedStatus === "low_stock"
        ? messages.productsWorkspace.status.lowStock
        : selectedStatus === "out_of_stock"
          ? messages.productsWorkspace.status.outOfStock
          : messages.productsWorkspace.status.inactive;

  return (
    <section className="min-h-0 min-w-0 overflow-y-auto bg-[#f5f6f8] p-3 lg:col-span-2 lg:h-full lg:p-4">
      <div className="flex w-full flex-col gap-3">
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
                  className="flex min-h-[4.25rem] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.25)]"
                >
                  <Plus size={20} />
                  {messages.productsWorkspace.actions.newProduct}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDialog("bulkProducts")}
                  className="flex min-h-[4.25rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800"
                >
                  <Upload size={20} />
                  {messages.productsWorkspace.actions.bulkProducts}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDialog("bulkStock")}
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
                  {withStockCount}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                  {messages.productsWorkspace.summary.lowStock}
                </p>
                <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-amber-800">
                  {lowStockCount}
                </p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
                  {messages.productsWorkspace.summary.outOfStock}
                </p>
                <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-rose-800">
                  {outOfStockCount}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  {messages.productsWorkspace.summary.stockValue}
                </p>
                <p className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-emerald-900">
                  {formatCurrency(estimatedInventoryValue)}
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
                      onClick={() => setStockFilter(filter.id as StockState)}
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
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(event.target.value as ProductCategory | "all")
                    }
                    className="min-h-[2.85rem] rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">{messages.productsWorkspace.filters.allCategories}</option>
                    <option value="beverages">{messages.productsWorkspace.categories.beverages}</option>
                    <option value="snacks">{messages.productsWorkspace.categories.snacks}</option>
                    <option value="candy">{messages.productsWorkspace.categories.candy}</option>
                    <option value="pantry">{messages.productsWorkspace.categories.pantry}</option>
                    <option value="other">{messages.productsWorkspace.categories.other}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setActiveOnly((current) => !current)}
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

          <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] lg:px-5">
            {visibleProducts.map((product) => {
              const status = resolveStockStatus(product);
              const statusTone = resolveStatusTone(status);

              const statusText =
                status === "in_stock"
                  ? messages.productsWorkspace.status.inStock
                  : status === "low_stock"
                    ? messages.productsWorkspace.status.lowStock
                    : status === "out_of_stock"
                      ? messages.productsWorkspace.status.outOfStock
                      : messages.productsWorkspace.status.inactive;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProductDetail(product.id)}
                  data-testid={`products-workspace-card-${product.id}`}
                  className="rounded-[1.25rem] border border-slate-200 bg-white p-3 text-left shadow-[0_20px_30px_rgba(15,23,42,0.09)] transition hover:-translate-y-0.5"
                >
                  <div className="mx-auto mt-0.5 flex size-[4.6rem] items-center justify-center rounded-full bg-slate-100 text-[2.3rem] lg:size-[5.1rem] lg:text-[2.6rem]">
                    <span aria-hidden>{product.emoji}</span>
                  </div>

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
                      {labelForProductCategory(product.categoryId)} • {product.sku}
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
        </article>
      </div>

      {openDialog === "detail" ? (
        <MockDialog
          title={messages.productsWorkspace.dialogs.detailTitle}
          onClose={() => setOpenDialog(null)}
        >
          <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-3">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex min-h-[12rem] items-center justify-center rounded-[1.5rem] bg-white">
                  <div className="mx-auto flex size-32 items-center justify-center rounded-full bg-slate-100 text-[4.2rem]">
                    <span aria-hidden>{selectedProduct.emoji}</span>
                  </div>
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
                  <span
                    className={[
                      "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                      selectedStatusTone,
                    ].join(" ")}
                  >
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-base font-medium text-slate-500">
                  {labelForProductCategory(selectedProduct.categoryId)} • {selectedProduct.barcode}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.detail.sku}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{selectedProduct.sku}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {messages.productsWorkspace.detail.supplier}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {selectedProduct.supplier}
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
                    onClick={() => setOpenDialog("stock")}
                    className="flex min-h-[4rem] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white"
                  >
                    <Boxes size={18} />
                    {messages.productsWorkspace.actions.addStock}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDialog("stock")}
                    className="flex min-h-[4rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800"
                  >
                    <AlertTriangle size={18} />
                    {messages.productsWorkspace.actions.adjustStock}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDialog("edit")}
                    className="flex min-h-[4rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800"
                  >
                    <Pencil size={18} />
                    {messages.productsWorkspace.actions.editProduct}
                  </button>
                  <button
                    type="button"
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
                  <button type="button" className="text-sm font-semibold text-blue-700">
                    {messages.productsWorkspace.actions.viewAllMovements}
                  </button>
                </header>

                <div className="mt-4 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
                  {selectedProduct.movements.map((movement) => (
                    <div
                      key={movement.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-slate-900">
                          {movement.type === "inbound"
                            ? messages.productsWorkspace.modals.stockModes.inbound
                            : movement.type === "adjustment"
                              ? messages.productsWorkspace.modals.stockModes.adjustment
                              : messages.productsWorkspace.modals.stockModes.outbound}
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {movement.quantity} un.
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {movement.when} • {movement.actor}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </MockDialog>
      ) : null}

      {openDialog === "create" ? (
        <MockDialog
          title={messages.productsWorkspace.dialogs.createTitle}
          onClose={() => setOpenDialog(null)}
        >
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.name}
                </span>
                <div className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  Alfajor triple blanco
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.sku}
                </span>
                <div className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  GOL-021
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.barcode}
                </span>
                <div className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  7797011020214
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.category}
                </span>
                <div className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  {labelForProductCategory("candy")}
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.price}
                </span>
                <div className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  {formatCurrency(1800)}
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.cost}
                </span>
                <div className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  {formatCurrency(920)}
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.minStock}
                </span>
                <div className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  8
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.productsWorkspace.fields.image}
                </span>
                <div className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  Foto frontal del producto
                </div>
              </label>
            </div>

            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex min-h-[16rem] items-center justify-center rounded-[1.5rem] bg-white">
                <div className="text-center">
                  <ImageIcon size={36} className="mx-auto text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    Vista previa de imagen grande
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MockDialog>
      ) : null}

      {openDialog === "edit" ? (
        <MockDialog
          title={messages.productsWorkspace.dialogs.editTitle}
          onClose={() => setOpenDialog(null)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.name}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedProduct.name}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.image}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Reemplazar foto / mantener actual
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.price}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatCurrency(selectedProduct.price)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.fields.minStock}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {selectedProduct.minStock}
              </p>
            </div>
          </div>
        </MockDialog>
      ) : null}

      {openDialog === "stock" ? (
        <MockDialog
          title={messages.productsWorkspace.dialogs.stockTitle}
          onClose={() => setOpenDialog(null)}
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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
                  <div
                    key={mode}
                    className={[
                      "min-h-[4rem] rounded-2xl border px-4 py-4 text-center text-base font-semibold",
                      mode === "inbound"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    {messages.productsWorkspace.modals.stockModes[mode]}
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-700">
                    {messages.productsWorkspace.fields.quantity}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">12 unidades</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-700">
                    {messages.productsWorkspace.fields.supplier}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Proveedor + remito</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-700">Resumen visible antes de confirmar</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Stock actual
                  </p>
                  <p className="mt-1 text-[1.6rem] font-bold text-slate-900">
                    {selectedProduct.stock}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Nuevo stock
                  </p>
                  <p className="mt-1 text-[1.6rem] font-bold text-slate-900">
                    {selectedProduct.stock + 12}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MockDialog>
      ) : null}

      {openDialog === "bulkProducts" ? (
        <MockDialog
          title={messages.productsWorkspace.dialogs.bulkProductsTitle}
          onClose={() => setOpenDialog(null)}
        >
          <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="space-y-3">
              {[
                messages.productsWorkspace.modals.wizardSteps.stepOne,
                messages.productsWorkspace.modals.wizardSteps.stepTwo,
                messages.productsWorkspace.modals.wizardSteps.stepThree,
              ].map((step, index) => (
                <div
                  key={step}
                  className={[
                    "rounded-2xl border px-4 py-4 text-base font-semibold",
                    index === 0
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700",
                  ].join(" ")}
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 p-6">
              <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] bg-white text-center">
                <Upload size={34} className="text-slate-400" />
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  Arrastrar archivo o pegar tabla
                </p>
                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  CSV, Excel o tabla copiada. La segunda etapa debería mostrar errores por fila antes
                  de permitir confirmar.
                </p>
              </div>
            </div>
          </div>
        </MockDialog>
      ) : null}

      {openDialog === "bulkStock" ? (
        <MockDialog
          title={messages.productsWorkspace.dialogs.bulkStockTitle}
          onClose={() => setOpenDialog(null)}
        >
          <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="space-y-3">
              {[
                messages.productsWorkspace.modals.wizardSteps.stepOne,
                messages.productsWorkspace.modals.wizardSteps.stepTwo,
                messages.productsWorkspace.modals.wizardSteps.stepThree,
              ].map((step, index) => (
                <div
                  key={step}
                  className={[
                    "rounded-2xl border px-4 py-4 text-base font-semibold",
                    index === 0
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700",
                  ].join(" ")}
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="space-y-4 rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 p-6">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-4 text-center text-base font-semibold text-blue-700">
                  {messages.productsWorkspace.modals.stockModes.inbound}
                </div>
                <div className="rounded-2xl bg-white px-4 py-4 text-center text-base font-semibold text-slate-700">
                  {messages.productsWorkspace.modals.stockModes.adjustment}
                </div>
                <div className="rounded-2xl bg-white px-4 py-4 text-center text-base font-semibold text-slate-700">
                  {messages.productsWorkspace.modals.stockModes.outbound}
                </div>
              </div>
              <div className="flex min-h-[13rem] flex-col items-center justify-center rounded-[1.5rem] bg-white text-center">
                <ClipboardList size={34} className="text-slate-400" />
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  Plantilla de movimiento por lote
                </p>
                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  Ideal para reposición de proveedor, conteo general o ajustes de cámara.
                </p>
              </div>
            </div>
          </div>
        </MockDialog>
      ) : null}
    </section>
  );
}
