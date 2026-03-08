import { expect, test, type Page } from "../e2e/support/test";
import type { ProductResponseDTO } from "../../src/modules/catalog/presentation/dtos/product-response.dto";
import type { ListStockMovementsResponseDTO, StockMovementHistoryItemDTO } from "../../src/modules/inventory/presentation/dtos/list-stock-movements-response.dto";
import type { StockMovementResponseDTO } from "../../src/modules/inventory/presentation/dtos/stock-movement-response.dto";
import { createTutorialActorSnapshot } from "./support/tutorial-actor-snapshot";
import { createTutorialDriver } from "./support/tutorial-driver";

test.use({
  loginAsAppUserId: null,
});

type ProductsWorkspaceStockState = "with_stock" | "low_stock" | "out_of_stock" | "inactive";
type StockMovementType = "inbound" | "outbound" | "adjustment";

interface TutorialProductState {
  readonly id: string;
  readonly sku: string;
  readonly ean: string;
  readonly name: string;
  readonly categoryId: string;
  readonly imageUrl: string;
  readonly isActive: boolean;
  price: number;
  averageCost: number;
  stock: number;
  minStock: number;
  lastMovementAt?: string;
  lastMovementType?: StockMovementType;
}

interface WorkspaceProductsResponse {
  readonly items: readonly TutorialProductState[];
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

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6BYAAAAASUVORK5CYII=";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;
const actorId = "user_manager_maxi";
const actorDisplayName = "Maxi";
const trackedProductId = "product-tutorial-cookies";
const trackedProductName = "Galletitas tutorial vainilla";
const trackedProductSearchTerm = "vainilla";
const trackedProductUpdatedPrice = 4200;
const trackedProductUpdatedMinStock = 5;
const trackedProductAddedStock = 6;
const trackedProductUnitCost = 1900;
const trackedProductReason = "reposicion tutorial";
const tutorialActorSnapshot = createTutorialActorSnapshot({
  actorId,
  displayName: actorDisplayName,
  assignedRegisterIds: ["cash-register-main"],
});

function createInitialProducts(): TutorialProductState[] {
  return [
    {
      id: trackedProductId,
      sku: "GAL-TUT-001",
      ean: "7790000001001",
      name: trackedProductName,
      categoryId: "desayuno-y-merienda",
      price: 3850,
      averageCost: 1700,
      stock: 3,
      minStock: 2,
      imageUrl: TINY_PNG_DATA_URL,
      isActive: true,
      lastMovementAt: "2026-03-06T14:20:00.000Z",
      lastMovementType: "inbound",
    },
    {
      id: "product-tutorial-yerba",
      sku: "YER-TUT-002",
      ean: "7790000002002",
      name: "Yerba tutorial suave",
      categoryId: "almacen",
      price: 5600,
      averageCost: 2900,
      stock: 12,
      minStock: 4,
      imageUrl: TINY_PNG_DATA_URL,
      isActive: true,
      lastMovementAt: "2026-03-05T11:00:00.000Z",
      lastMovementType: "inbound",
    },
  ];
}

function resolveStockState(product: TutorialProductState): ProductsWorkspaceStockState {
  if (!product.isActive) {
    return "inactive";
  }

  if (product.stock <= 0) {
    return "out_of_stock";
  }

  if (product.stock <= product.minStock) {
    return "low_stock";
  }

  return "with_stock";
}

function sortProducts(
  products: readonly TutorialProductState[],
  sortMode: string,
): TutorialProductState[] {
  const sorted = [...products];

  switch (sortMode) {
    case "stock_desc":
      sorted.sort((left, right) => right.stock - left.stock || left.name.localeCompare(right.name));
      return sorted;
    case "name":
      sorted.sort((left, right) => left.name.localeCompare(right.name));
      return sorted;
    case "recent":
      sorted.sort((left, right) => {
        const leftTime = Date.parse(left.lastMovementAt ?? "") || 0;
        const rightTime = Date.parse(right.lastMovementAt ?? "") || 0;
        return rightTime - leftTime || left.name.localeCompare(right.name);
      });
      return sorted;
    case "stock_asc":
    default:
      sorted.sort((left, right) => left.stock - right.stock || left.name.localeCompare(right.name));
      return sorted;
  }
}

function buildWorkspaceResponse(
  products: readonly TutorialProductState[],
  searchParams: URLSearchParams,
): WorkspaceProductsResponse {
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const categoryId = searchParams.get("categoryId");
  const stockState = searchParams.get("stockState");
  const activeOnly = searchParams.get("activeOnly") !== "false";
  const sortMode = searchParams.get("sort") ?? "stock_asc";
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const requestedPageSize = Number.parseInt(searchParams.get("pageSize") ?? "24", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0 ? requestedPageSize : 24;

  const filteredProducts = sortProducts(
    products.filter((product) => {
      if (activeOnly && !product.isActive) {
        return false;
      }

      if (categoryId && categoryId !== "all" && product.categoryId !== categoryId) {
        return false;
      }

      if (stockState && stockState !== "all" && resolveStockState(product) !== stockState) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableFields = [product.name, product.sku, product.ean].map((value) =>
        value.toLowerCase(),
      );

      return searchableFields.some((value) => value.includes(query));
    }),
    sortMode,
  );

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = (page - 1) * pageSize;
  const visibleItems = filteredProducts.slice(pageStart, pageStart + pageSize);

  return {
    items: visibleItems,
    page,
    pageSize,
    totalItems,
    totalPages,
    summary: {
      withStock: visibleItems.filter((product) => resolveStockState(product) === "with_stock").length,
      lowStock: visibleItems.filter((product) => resolveStockState(product) === "low_stock").length,
      outOfStock: visibleItems.filter((product) => resolveStockState(product) === "out_of_stock").length,
      stockValue: visibleItems.reduce(
        (sum, product) => sum + product.stock * product.averageCost,
        0,
      ),
    },
  };
}

function buildProductResponse(product: TutorialProductState): ProductResponseDTO {
  return {
    item: {
      id: product.id,
      sku: product.sku,
      ean: product.ean,
      name: product.name,
      categoryId: product.categoryId,
      price: product.price,
      cost: product.averageCost,
      stock: product.stock,
      minStock: product.minStock,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
    },
  };
}

function createMovementRecord(
  product: TutorialProductState,
  movement: {
    readonly movementId: string;
    readonly movementType: StockMovementType;
    readonly quantity: number;
    readonly unitCost: number;
    readonly occurredAt: string;
    readonly stockOnHandAfter: number;
    readonly weightedAverageUnitCostAfter: number;
    readonly inventoryValueAfter: number;
    readonly reason?: string;
  },
): StockMovementHistoryItemDTO {
  return {
    movementId: movement.movementId,
    productId: product.id,
    movementType: movement.movementType,
    quantity: movement.quantity,
    unitCost: movement.unitCost,
    occurredAt: movement.occurredAt,
    stockOnHandAfter: movement.stockOnHandAfter,
    weightedAverageUnitCostAfter: movement.weightedAverageUnitCostAfter,
    inventoryValueAfter: movement.inventoryValueAfter,
    reason: movement.reason,
  };
}

function createInitialMovementHistory(
  products: readonly TutorialProductState[],
): Record<string, StockMovementHistoryItemDTO[]> {
  return Object.fromEntries(
    products.map((product, index) => [
      product.id,
      [
        createMovementRecord(product, {
          movementId: `movement-initial-${index + 1}`,
          movementType: "inbound",
          quantity: product.stock,
          unitCost: product.averageCost,
          occurredAt: product.lastMovementAt ?? "2026-03-01T10:00:00.000Z",
          stockOnHandAfter: product.stock,
          weightedAverageUnitCostAfter: product.averageCost,
          inventoryValueAfter: product.stock * product.averageCost,
          reason: "stock inicial",
        }),
      ],
    ]),
  );
}

async function createProductsTutorialRoutes(page: Page): Promise<void> {
  const products = createInitialProducts();
  const movementHistoryByProductId = createInitialMovementHistory(products);
  let movementCounter = 0;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (method === "GET" && pathname === "/api/v1/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(tutorialActorSnapshot),
      });
      return;
    }

    if (method === "GET" && pathname === "/api/v1/products") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: products.map((product) => buildProductResponse(product).item),
        }),
      });
      return;
    }

    if (method === "GET" && pathname === "/api/v1/products/workspace") {
      const workspaceResponse = buildWorkspaceResponse(products, url.searchParams);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...workspaceResponse,
          items: workspaceResponse.items.map((product) => ({
            id: product.id,
            sku: product.sku,
            ean: product.ean,
            name: product.name,
            categoryId: product.categoryId,
            price: product.price,
            averageCost: product.averageCost,
            stock: product.stock,
            minStock: product.minStock,
            imageUrl: product.imageUrl,
            isActive: product.isActive,
            stockState: resolveStockState(product),
            lastMovementAt: product.lastMovementAt,
            lastMovementType: product.lastMovementType,
          })),
        }),
      });
      return;
    }

    if (method === "GET" && pathname === "/api/v1/stock-movements") {
      const productId = url.searchParams.get("productId");
      const payload: ListStockMovementsResponseDTO = {
        items: productId ? movementHistoryByProductId[productId] ?? [] : [],
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
      return;
    }

    if (method === "PATCH" && pathname.startsWith("/api/v1/products/")) {
      const productId = pathname.split("/").at(-1) ?? "";
      const product = products.find((candidate) => candidate.id === productId);

      if (!product) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            code: "product_not_found",
            message: "No encontramos el producto solicitado.",
          }),
        });
        return;
      }

      if (product.id === trackedProductId) {
        product.price = trackedProductUpdatedPrice;
        product.minStock = trackedProductUpdatedMinStock;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildProductResponse(product)),
      });
      return;
    }

    if (method === "POST" && pathname === "/api/v1/stock-movements") {
      const payload = request.postDataJSON() as {
        readonly productId?: string;
        readonly movementType?: StockMovementType;
        readonly quantity?: number;
        readonly unitCost?: number;
        readonly reason?: string;
      };
      const product = products.find((candidate) => candidate.id === payload.productId);

      if (!product || !payload.movementType || !payload.quantity) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            code: "validation_error",
            message: "No se pudo registrar el movimiento del tutorial.",
          }),
        });
        return;
      }

      const occurredAt = "2026-03-07T15:30:00.000Z";
      movementCounter += 1;
      const quantity = Number(payload.quantity);
      const unitCost = Number(payload.unitCost ?? product.averageCost);

      if (payload.movementType === "inbound") {
        const incomingValue = quantity * unitCost;
        const existingValue = product.stock * product.averageCost;
        product.stock += quantity;
        product.averageCost = Number(
          ((existingValue + incomingValue) / Math.max(product.stock, 1)).toFixed(2),
        );
      } else if (payload.movementType === "outbound") {
        product.stock = Math.max(0, product.stock - quantity);
      }

      product.lastMovementAt = occurredAt;
      product.lastMovementType = payload.movementType;

      const movementRecord = createMovementRecord(product, {
        movementId: `movement-${movementCounter}`,
        movementType: payload.movementType,
        quantity,
        unitCost,
        occurredAt,
        stockOnHandAfter: product.stock,
        weightedAverageUnitCostAfter: product.averageCost,
        inventoryValueAfter: Number((product.stock * product.averageCost).toFixed(2)),
        reason: payload.reason,
      });
      movementHistoryByProductId[product.id] = [
        movementRecord,
        ...(movementHistoryByProductId[product.id] ?? []),
      ];

      const responseBody: StockMovementResponseDTO = {
        movementId: movementRecord.movementId,
        productId: movementRecord.productId,
        movementType: movementRecord.movementType,
        quantity: movementRecord.quantity,
        unitCost: movementRecord.unitCost,
        occurredAt: movementRecord.occurredAt,
        stockOnHandAfter: movementRecord.stockOnHandAfter,
        weightedAverageUnitCostAfter: movementRecord.weightedAverageUnitCostAfter,
        inventoryValueAfter: movementRecord.inventoryValueAfter,
        reason: movementRecord.reason,
      };

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(responseBody),
      });
      return;
    }

    await route.continue();
  });
}

test("records a paced products tutorial for search edit and stock add", async ({ page }) => {
  await createProductsTutorialRoutes(page);

  await page.goto("/products");

  const trackedProductCard = page.getByTestId(`products-workspace-card-${trackedProductId}`);
  const secondaryProductCard = page.getByTestId("products-workspace-card-product-tutorial-yerba");
  await expect(trackedProductCard).toBeVisible();
  await expect(secondaryProductCard).toBeVisible();

  const tutorial = createTutorialDriver(page);
  await tutorial.installOverlay("Tutorial: busqueda, edicion y stock de productos");
  await tutorial.intro(
    "En este recorrido vamos a encontrar un producto, actualizar su ficha y registrar una reposicion de stock.",
  );

  await tutorial.fill(
    page.getByTestId("products-workspace-search-input"),
    trackedProductSearchTerm,
    "Usa el buscador para filtrar rapido por nombre, SKU o codigo de barras.",
    {
      afterMs: tutorial.defaults.navigationHoldMs,
    },
  );
  await expect(trackedProductCard).toBeVisible();
  await expect(secondaryProductCard).not.toBeVisible();

  await tutorial.click(
    trackedProductCard,
    "Abre la ficha del producto para revisar su informacion y acciones disponibles.",
  );
  await expect(page.getByRole("heading", { name: trackedProductName })).toBeVisible();
  await expect(page.getByText("7790000001001")).toBeVisible();

  await tutorial.click(
    page.getByTestId("products-workspace-open-edit-button"),
    "Entra a editar la ficha cuando necesites ajustar precio o stock minimo.",
  );
  await tutorial.fill(
    page.getByTestId("products-workspace-edit-price-input"),
    String(trackedProductUpdatedPrice),
    "Actualiza el precio de venta con el nuevo valor.",
  );
  await tutorial.fill(
    page.getByTestId("products-workspace-edit-min-stock-input"),
    String(trackedProductUpdatedMinStock),
    "Define el stock minimo para que el sistema avise antes de quedarse corto.",
  );
  await tutorial.click(
    page.getByTestId("products-workspace-edit-submit-button"),
    "Guarda los cambios para actualizar la ficha del producto.",
    {
      afterMs: tutorial.defaults.successHoldMs,
    },
  );

  const workspaceFeedback = page.getByTestId("products-workspace-feedback");
  await expect(workspaceFeedback).toContainText(`Producto actualizado: ${trackedProductName}.`);
  await expect(trackedProductCard).toContainText("$4200.00");
  await tutorial.message(
    "El listado refleja enseguida el nuevo precio y mantiene el filtro para seguir trabajando sobre ese producto.",
  );

  await tutorial.click(
    trackedProductCard,
    "Vuelve a abrir la ficha para registrar una reposicion de stock.",
  );
  await tutorial.click(
    page.getByTestId("products-workspace-open-add-stock-button"),
    "Desde acciones rapidas podes cargar ingresos de mercaderia en pocos pasos.",
  );
  await tutorial.fill(
    page.getByTestId("products-workspace-stock-quantity-input"),
    String(trackedProductAddedStock),
    "Indica la cantidad que ingreso al inventario.",
  );
  await tutorial.fill(
    page.getByTestId("products-workspace-stock-unit-cost-input"),
    String(trackedProductUnitCost),
    "Carga el costo unitario para mantener actualizado el costo promedio.",
  );
  await tutorial.fill(
    page.getByTestId("products-workspace-stock-reason-input"),
    trackedProductReason,
    "Agrega una referencia breve para identificar este movimiento despues.",
  );
  await tutorial.click(
    page.getByTestId("products-workspace-stock-submit-button"),
    "Confirma el movimiento para sumar el stock disponible.",
    {
      afterMs: tutorial.defaults.successHoldMs,
    },
  );

  await expect(workspaceFeedback).toContainText(`Movimiento registrado para ${trackedProductName}.`);
  await expect(page.getByText(trackedProductReason)).toBeVisible();
  await tutorial.click(
    page.getByTestId("products-workspace-dialog-close"),
    "Cierra la ficha para verificar el resultado final dentro del listado.",
  );
  await expect(trackedProductCard).toContainText("En stock 9");
  await expect(trackedProductCard).toContainText("$4200.00");
  await tutorial.message(
    "Asi puedes buscar un producto, editar su ficha y registrar una reposicion sin salir del workspace.",
    2_800,
  );
});
