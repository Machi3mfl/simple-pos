import { expect, test, type Locator, type Page, type Route } from "./support/test";

const FAILED_QUEUE_STORAGE_KEY = "simple_pos_product_sourcing_failed_queue_v1";

const searchResponse = {
  providerId: "carrefour",
  items: [
    {
      providerId: "carrefour",
      sourceProductId: "393964",
      name: "Gaseosa cola Coca Cola Zero 2,25 lts",
      brand: "Coca Cola",
      ean: "7790895067570",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl:
        "https://carrefourar.vteximg.com.br/arquivos/ids/395283/7790895067570_E01.jpg?v=638326494223030000",
      referencePrice: 5250,
      referenceListPrice: 5499,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-zero-225-lts-393964/p",
    },
    {
      providerId: "carrefour",
      sourceProductId: "30138",
      name: "Gaseosa cola Coca Cola sabor original 2,25 lts",
      brand: "Coca Cola",
      ean: "7790895000997",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl:
        "https://carrefourar.vteximg.com.br/arquivos/ids/332148/7790895000997_E01.jpg?v=638211437412370000",
      referencePrice: 5250,
      referenceListPrice: 5250,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-sabor-original-225-lts-30138/p",
    },
    {
      providerId: "carrefour",
      sourceProductId: "637679",
      name: "Gaseosa cola Pepsi Black pet 2 lts",
      brand: "Pepsi",
      ean: "7791813421061",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: "https://www.carrefour.com.ar/arquivos/ids/123456/7791813421061_E01.jpg",
      referencePrice: 4200,
      referenceListPrice: 4350,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-pepsi-black-pet-2lts/p",
    },
    {
      providerId: "carrefour",
      sourceProductId: "745262",
      name: "Gaseosa cola Pepsi Black pet 1,5 lts",
      brand: "Pepsi",
      ean: "7791813421062",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: "https://www.carrefour.com.ar/arquivos/ids/654321/7791813421062_E01.jpg",
      referencePrice: 3900,
      referenceListPrice: 4050,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-pepsi-black-pet-15lts/p",
    },
  ],
  page: 1,
  pageSize: 8,
  hasMore: false,
} as const;

const mappingsResponse = {
  items: [
    {
      id: "mapping-1",
      providerId: "carrefour",
      externalCategoryPath: "/Bebidas/Gaseosas/Gaseosas cola/",
      internalCategoryId: "bebidas",
      createdAt: "2026-03-05T12:25:00.000Z",
      updatedAt: "2026-03-06T12:25:00.000Z",
    },
    {
      id: "mapping-2",
      providerId: "carrefour",
      externalCategoryPath: "/Limpieza/Papeles/",
      internalCategoryId: "limpieza",
      createdAt: "2026-03-05T12:25:00.000Z",
      updatedAt: "2026-03-06T12:25:00.000Z",
    },
  ],
} as const;

const importHistoryResponse = {
  items: [
    {
      id: "history-1",
      productId: "product-1",
      productName: "Papel higiénico hoja simple Carrefour Essential 4 x 80 m.",
      productSku: "CRF-597039",
      providerId: "carrefour",
      sourceProductId: "597039",
      storedImagePublicUrl:
        "https://carrefourar.vteximg.com.br/arquivos/ids/999999/papel-higienico.jpg",
      brand: "Carrefour",
      ean: "7798159718985",
      mappedCategoryId: "limpieza",
      importedAt: "2026-03-06T12:23:27.000Z",
    },
    {
      id: "history-2",
      productId: "product-2",
      productName: "Leche La Serenísima liviana 1% 1L",
      productSku: "CRF-720720",
      providerId: "carrefour",
      sourceProductId: "720720",
      storedImagePublicUrl:
        "https://carrefourar.vteximg.com.br/arquivos/ids/999998/leche-serenisima.jpg",
      brand: "La Serenísima",
      ean: "7790742363107",
      mappedCategoryId: "lacteos-y-productos-frescos",
      importedAt: "2026-03-05T12:28:39.000Z",
    },
  ],
} as const;

const failedQueueEntries = [
  {
    id: "carrefour:720720",
    providerId: "carrefour",
    sourceProductId: "720720",
    candidate: {
      providerId: "carrefour",
      sourceProductId: "720720",
      name: "Leche La Serenísima liviana 1% 1L",
      brand: "La Serenísima",
      ean: "7790742363107",
      categoryTrail: ["/Lácteos y productos frescos/Leches/"],
      suggestedCategoryId: "lacteos-y-productos-frescos",
      imageUrl:
        "https://carrefourar.vteximg.com.br/arquivos/ids/999998/leche-serenisima.jpg",
      referencePrice: 2490,
      referenceListPrice: 2490,
      productUrl: "https://www.carrefour.com.ar/leche-la-serenisima-liviana-1-1l/p",
    },
    draft: {
      name: "Leche La Serenísima liviana 1% 1L",
      categoryId: "lacteos-y-productos-frescos",
      price: "2490",
      initialStock: "10",
      cost: "2000",
      minStock: "2",
    },
    invalidItem: {
      row: 1,
      sourceProductId: "720720",
      name: "Leche La Serenísima liviana 1% 1L",
      code: "already_imported",
      retryable: false,
      reason: "Ya existe una importación previa para carrefour 720720.",
    },
    status: "non_recoverable",
    failureCount: 1,
    createdAt: "2026-03-05T12:27:37.000Z",
    updatedAt: "2026-03-05T12:27:37.000Z",
    resolvedItem: null,
  },
] as const;

async function mockSourcingApi(page: Page): Promise<void> {
  await page.route("**/api/v1/product-sourcing/search**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(searchResponse),
    });
  });

  await page.route("**/api/v1/product-sourcing/category-mappings**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mappingsResponse),
    });
  });

  await page.route("**/api/v1/product-sourcing/import-history**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(importHistoryResponse),
    });
  });
}

async function seedFailedQueue(page: Page): Promise<void> {
  await page.addInitScript(
    (payload: { storageKey: string; entries: readonly unknown[] }) => {
      window.localStorage.setItem(payload.storageKey, JSON.stringify(payload.entries));
    },
    {
      storageKey: FAILED_QUEUE_STORAGE_KEY,
      entries: failedQueueEntries,
    },
  );
}

async function searchAndOpenDetailsStep(page: Page): Promise<void> {
  await page.goto("/products/sourcing");
  await page.getByTestId("product-sourcing-search-input").fill("coca cola");
  await page.waitForTimeout(650);
  await page.getByTestId("product-sourcing-toggle-393964").click();
  await page.getByTestId("product-sourcing-next-to-details").click();
}

async function expectLocatorInsideViewport(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();

  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  if (!viewport) {
    throw new Error("Expected viewport size to be available.");
  }

  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    throw new Error("Expected element bounding box to be available.");
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 4);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 4);
}

test.describe("product sourcing responsive ui", () => {
  test("keeps desktop header actions inline without wrapping the title", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await seedFailedQueue(page);
    await mockSourcingApi(page);

    await page.goto("/products/sourcing");

    await expect(page.getByRole("heading", { name: "Importar productos al catálogo" })).toBeVisible();
    await expect(page.getByTestId("product-sourcing-open-header-actions")).toBeHidden();
    await expect(page.getByTestId("product-sourcing-open-failed-queue")).toBeVisible();
    await expect(page.getByTestId("product-sourcing-open-mappings")).toBeVisible();
    await expect(page.getByTestId("product-sourcing-open-history")).toBeVisible();

    const headingHeight = await page
      .getByRole("heading", { name: "Importar productos al catálogo" })
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(headingHeight).toBeLessThan(70);
  });

  test("keeps tablet landscape dialogs inside the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedFailedQueue(page);
    await mockSourcingApi(page);

    await searchAndOpenDetailsStep(page);

    await expect(page.getByTestId("product-sourcing-open-header-actions")).toBeVisible();
    await expectLocatorInsideViewport(
      page,
      page.getByTestId("product-sourcing-image-preview-trigger-393964"),
    );
    await expectLocatorInsideViewport(page, page.getByTestId("product-sourcing-next-to-confirm"));

    await page.getByTestId("product-sourcing-image-preview-trigger-393964").click();
    await expectLocatorInsideViewport(
      page,
      page.locator('[data-testid="product-sourcing-image-preview-dialog"] > div > div'),
    );
    await page.getByTestId("product-sourcing-image-preview-dialog-close").click();

    await page.getByTestId("product-sourcing-open-header-actions").click();
    await page.getByRole("dialog").getByTestId("product-sourcing-open-history").click();
    await expectLocatorInsideViewport(
      page,
      page.locator('[data-testid="product-sourcing-import-history-dialog"] > div > div'),
    );
    await page.getByTestId("product-sourcing-import-history-dialog-close").click();

    await page.getByTestId("product-sourcing-open-header-actions").click();
    await page.getByRole("dialog").getByTestId("product-sourcing-open-mappings").click();
    await expectLocatorInsideViewport(
      page,
      page.locator('[data-testid="product-sourcing-mappings-dialog"] > div > div'),
    );
    await page.getByTestId("product-sourcing-mappings-dialog-close").click();

    await page.getByTestId("product-sourcing-open-header-actions").click();
    await page.getByRole("dialog").getByTestId("product-sourcing-open-failed-queue").click();
    await expectLocatorInsideViewport(
      page,
      page.locator('[data-testid="product-sourcing-failed-queue-dialog"] > div > div'),
    );
    await page.getByTestId("product-sourcing-failed-queue-dialog-close").click();
  });

  test("keeps the full sourcing flow usable on mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedFailedQueue(page);
    await mockSourcingApi(page);

    await searchAndOpenDetailsStep(page);

    await expect(page.getByTestId("mobile-nav-toggle-button")).toBeVisible();
    await expectLocatorInsideViewport(
      page,
      page.getByTestId("product-sourcing-image-preview-trigger-393964"),
    );
    await expectLocatorInsideViewport(page, page.getByTestId("product-sourcing-back-to-search"));
    await expectLocatorInsideViewport(page, page.getByTestId("product-sourcing-next-to-confirm"));

    const nextButtonWidth = await page
      .getByTestId("product-sourcing-next-to-confirm")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(nextButtonWidth).toBeGreaterThan(250);

    await page.getByTestId("product-sourcing-next-to-confirm").click();
    await page
      .getByTestId("product-sourcing-import-confirmation-toast")
      .getByRole("button", { name: "Continuar" })
      .click();

    await expect(page.getByTestId("product-sourcing-import-button")).toBeVisible();
    await expectLocatorInsideViewport(page, page.getByTestId("product-sourcing-back-to-details"));
    await expectLocatorInsideViewport(page, page.getByTestId("product-sourcing-import-button"));

    await page.getByTestId("product-sourcing-open-header-actions").click();
    await page.getByRole("dialog").getByTestId("product-sourcing-open-failed-queue").click();
    await expectLocatorInsideViewport(
      page,
      page.locator('[data-testid="product-sourcing-failed-queue-dialog"] > div > div'),
    );
    await page.getByTestId("product-sourcing-failed-queue-dialog-close").click();
  });
});
