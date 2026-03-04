import { expect, test, type Page } from "./support/test";

function createCatalogProduct(index: number) {
  const id = `catalog-product-${String(index).padStart(3, "0")}`;

  return {
    id,
    sku: `CAT-${String(index).padStart(3, "0")}`,
    name: `Catalog Product ${index}`,
    categoryId: "drink",
    price: 1000 + index,
    cost: 500 + index,
    stock: 10,
    minStock: 2,
    imageUrl: "",
    isActive: true,
  };
}

async function mockProducts(page: Page): Promise<void> {
  const items = Array.from({ length: 15 }, (_, index) => createCatalogProduct(index + 1));

  await page.route("**/api/v1/products**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items }),
    });
  });
}

test("reveals more sales catalog products when reaching the infinite-scroll sentinel", async ({
  page,
}) => {
  await mockProducts(page);

  await page.goto("/cash-register");

  await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(12);
  await expect(page.getByTestId("sales-catalog-infinite-scroll-status")).toContainText(
    "Seguí bajando para ver más productos.",
  );

  await page.getByTestId("sales-catalog-infinite-scroll-sentinel").scrollIntoViewIfNeeded();

  await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(15);
  await expect(page.getByTestId("product-card-catalog-product-015")).toContainText(
    "Catalog Product 15",
  );
  await expect(page.getByTestId("sales-catalog-infinite-scroll-status")).toContainText(
    "No hay más productos para este filtro.",
  );
});
