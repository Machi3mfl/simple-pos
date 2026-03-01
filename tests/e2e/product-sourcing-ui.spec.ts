import { expect, test } from "@playwright/test";

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
  ],
  page: 1,
  pageSize: 8,
  hasMore: false,
} as const;

test("opens product sourcing from /products and searches through the UI", async ({ page }) => {
  const requestedUrls: string[] = [];

  await page.route("**/api/v1/product-sourcing/search**", async (route) => {
    requestedUrls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(searchResponse),
    });
  });

  await page.goto("/sales");
  await page.getByTestId("nav-item-products").click();
  await page.getByTestId("products-workspace-open-sourcing-link").click();

  await expect(page).toHaveURL(/\/products\/sourcing$/);
  await expect(page.getByTestId("nav-item-products")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Busqueda asistida de productos" })).toBeVisible();

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
  expect(requestedUrls).toHaveLength(1);
  expect(requestedUrls[0]).toContain("q=coca%20cola");

  await expect(page.getByTestId("product-sourcing-feedback")).toContainText(
    "Se encontraron 2 resultados",
  );
  await expect(page.getByTestId("product-sourcing-result-393964")).toContainText(
    "Gaseosa cola Coca Cola Zero 2,25 lts",
  );

  await page.getByTestId("product-sourcing-toggle-393964").click();
  await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("1");

  await page.getByTestId("product-sourcing-back-link").click();
  await expect(page).toHaveURL(/\/products$/);
});
