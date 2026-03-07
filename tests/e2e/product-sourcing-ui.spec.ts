import { expect, test } from "./support/test";

const firstPageResponse = {
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
      sourceProductId: "649300",
      name: "Gaseosa cola Coca Cola Zero 1,25 lts",
      brand: "Coca Cola",
      ean: "7790895012273",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl:
        "https://carrefourar.vteximg.com.br/arquivos/ids/795019/7790895012273_E01.jpg?v=639046894913430000",
      referencePrice: 2915,
      referenceListPrice: 2915,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-zero-125-lts-649300/p",
    },
    {
      providerId: "carrefour",
      sourceProductId: "649301",
      name: "Gaseosa cola Coca Cola Original 1,25 lts",
      brand: "Coca Cola",
      ean: "7790895012274",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: null,
      referencePrice: 2915,
      referenceListPrice: 2915,
      productUrl: "https://example.com/original-125",
    },
    {
      providerId: "carrefour",
      sourceProductId: "649302",
      name: "Gaseosa cola Coca Cola Light 1,5 lts",
      brand: "Coca Cola",
      ean: "7790895012275",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: null,
      referencePrice: 3210,
      referenceListPrice: 3210,
      productUrl: "https://example.com/light-15",
    },
    {
      providerId: "carrefour",
      sourceProductId: "649303",
      name: "Gaseosa cola Coca Cola sin azucar 500 ml",
      brand: "Coca Cola",
      ean: "7790895012276",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: null,
      referencePrice: 1400,
      referenceListPrice: 1400,
      productUrl: "https://example.com/zero-500",
    },
    {
      providerId: "carrefour",
      sourceProductId: "649304",
      name: "Gaseosa cola Coca Cola original 500 ml",
      brand: "Coca Cola",
      ean: "7790895012277",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: null,
      referencePrice: 1400,
      referenceListPrice: 1400,
      productUrl: "https://example.com/original-500",
    },
    {
      providerId: "carrefour",
      sourceProductId: "649305",
      name: "Gaseosa cola Coca Cola Zero 354 ml",
      brand: "Coca Cola",
      ean: "7790895012278",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: null,
      referencePrice: 980,
      referenceListPrice: 980,
      productUrl: "https://example.com/zero-354",
    },
  ],
  page: 1,
  pageSize: 8,
  hasMore: true,
} as const;

const secondPageResponse = {
  providerId: "carrefour",
  items: [
    {
      providerId: "carrefour",
      sourceProductId: "649307",
      name: "Gaseosa cola Coca Cola Zero vidrio 1 lt",
      brand: "Coca Cola",
      ean: "7790895012280",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: null,
      referencePrice: 3500,
      referenceListPrice: 3500,
      productUrl: "https://example.com/zero-vidrio-1lt",
    },
  ],
  page: 2,
  pageSize: 8,
  hasMore: false,
} as const;

test("opens product sourcing from /products and searches through the UI", async ({ page }) => {
  const requestedUrls: string[] = [];
  await page.setViewportSize({ width: 1280, height: 560 });

  await page.route("**/api/v1/product-sourcing/search**", async (route) => {
    const requestUrl = route.request().url();
    requestedUrls.push(requestUrl);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        requestUrl.includes("page=2") ? secondPageResponse : firstPageResponse,
      ),
    });
  });

  await page.goto("/cash-register");
  await page.getByTestId("nav-item-products").click();
  await page.getByTestId("products-workspace-open-create-button").click();

  await expect(page).toHaveURL(/\/products\/sourcing$/);
  await expect(page.getByTestId("nav-item-products")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Importar productos al catálogo" })).toBeVisible();

  await page.getByTestId("product-sourcing-search-input").fill("co");
  await page.waitForTimeout(650);
  expect(requestedUrls).toHaveLength(0);
  await expect(page.getByTestId("product-sourcing-feedback")).toContainText(
    "Escribi al menos 3 caracteres",
  );

  await page.getByTestId("product-sourcing-search-input").fill("coca cola");
  await page.waitForTimeout(200);
  expect(requestedUrls).toHaveLength(0);
  await page.waitForTimeout(450);
  expect(requestedUrls.length).toBeGreaterThanOrEqual(1);
  expect(requestedUrls[0]).toContain("q=coca%20cola");

  await expect(page.getByTestId("product-sourcing-result-393964")).toContainText(
    "Gaseosa cola Coca Cola Zero 2,25 lts",
  );
  expect(requestedUrls[0]).toContain("page=1");

  await page.getByTestId("product-sourcing-toggle-393964").click();
  await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("1");

  if (!requestedUrls.some((url) => url.includes("page=2"))) {
    await expect(page.getByTestId("product-sourcing-infinite-scroll-status")).toContainText(
      "Hay más resultados disponibles.",
    );
    await page.getByTestId("product-sourcing-load-more-button").click();
  }

  await expect.poll(() => requestedUrls.some((url) => url.includes("page=2"))).toBe(true);
  await expect(page.getByTestId("product-sourcing-feedback")).toContainText(
    "Mostrando 9 resultados.",
  );
  await expect(page.getByTestId("product-sourcing-result-649307")).toContainText(
    "Gaseosa cola Coca Cola Zero vidrio 1 lt",
  );
  await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("1");
  await expect(page.getByTestId("product-sourcing-results-end")).toContainText(
    "No hay más resultados",
  );

  await page.getByTestId("product-sourcing-back-link").click();
  await expect(page).toHaveURL(/\/products$/);
});

test("warns every selected item with stock inicial en 0 before confirm without blocking the step", async ({
  page,
}) => {
  await page.route("**/api/v1/product-sourcing/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(firstPageResponse),
    });
  });

  await page.goto("/products/sourcing");
  await page.getByTestId("product-sourcing-search-input").fill("coca cola");
  await page.waitForTimeout(650);

  await page.getByTestId("product-sourcing-toggle-393964").click();
  await page.getByTestId("product-sourcing-toggle-30138").click();
  await page.getByTestId("product-sourcing-next-to-details").click();

  await page.getByTestId("product-sourcing-import-cost-393964").fill("2500");
  await page.getByTestId("product-sourcing-next-to-confirm").click();

  await expect(page.getByTestId("product-sourcing-import-confirmation-toast")).toContainText(
    "Hay 2 productos con stock inicial en 0.",
  );
  await expect(page.getByTestId("product-sourcing-import-confirmation-toast")).toContainText(
    "1 además sigue sin costo cargado.",
  );
  await expect(page.getByTestId("product-sourcing-item-warning-393964")).toContainText(
    "stock inicial en 0",
  );
  await expect(page.getByTestId("product-sourcing-item-warning-30138")).toContainText(
    "stock inicial en 0",
  );
  await expect(page.getByTestId("product-sourcing-item-warning-30138")).toContainText(
    "sin costo cargado",
  );

  await page
    .getByTestId("product-sourcing-import-confirmation-toast")
    .getByRole("button", { name: "Continuar" })
    .click();

  await expect(page.getByTestId("product-sourcing-import-button")).toBeVisible();
});

test("opens the enlarged image modal from the details step", async ({ page }) => {
  await page.route("**/api/v1/product-sourcing/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(firstPageResponse),
    });
  });

  await page.goto("/products/sourcing");
  await page.getByTestId("product-sourcing-search-input").fill("coca cola");
  await page.waitForTimeout(650);

  await page.getByTestId("product-sourcing-toggle-393964").click();
  await page.getByTestId("product-sourcing-next-to-details").click();

  await page.getByTestId("product-sourcing-image-preview-trigger-393964").click();
  await expect(page.getByTestId("product-sourcing-image-preview-dialog")).toBeVisible();
  await expect(
    page
      .getByTestId("product-sourcing-image-preview-dialog")
      .getByRole("heading", { name: "Gaseosa cola Coca Cola Zero 2,25 lts" }),
  ).toBeVisible();

  await page.getByTestId("product-sourcing-image-preview-dialog-close").click();
  await expect(page.getByTestId("product-sourcing-image-preview-dialog")).toHaveCount(0);
});

test("opens the enlarged image modal directly from the search results grid", async ({ page }) => {
  await page.route("**/api/v1/product-sourcing/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(firstPageResponse),
    });
  });

  await page.goto("/products/sourcing");
  await page.getByTestId("product-sourcing-search-input").fill("coca cola");
  await page.waitForTimeout(650);

  await page.getByTestId("product-sourcing-search-image-preview-trigger-393964").click();
  await expect(page.getByTestId("product-sourcing-image-preview-dialog")).toBeVisible();
  await expect(
    page
      .getByTestId("product-sourcing-image-preview-dialog")
      .getByRole("heading", { name: "Gaseosa cola Coca Cola Zero 2,25 lts" }),
  ).toBeVisible();

  await page.getByTestId("product-sourcing-image-preview-dialog-close").click();
  await expect(page.getByTestId("product-sourcing-image-preview-dialog")).toHaveCount(0);
});
