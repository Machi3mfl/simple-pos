import { expect, test, type Page } from "@playwright/test";

const catalogNames = [
  "Alfajor Blanco",
  "Banana Chips",
  "Caramel Pop",
  "Dulce Mix",
  "Empanada Snack",
  "Fideos Secos",
  "Galletitas Mini",
  "Helado Palito",
  "Infusion Herbal",
  "Jugo Naranja",
  "Ketchup Picante",
  "Limonada Fresh",
  "Mermelada Light",
  "Nueces Mix",
  "Oreo Clasicas",
];

function createCatalogProduct(name: string, index: number) {
  const id = `catalog-product-${String(index + 1).padStart(3, "0")}`;

  return {
    id,
    sku: `CAT-${String(index + 1).padStart(3, "0")}`,
    name,
    categoryId: "snack",
    price: 1000 + index,
    cost: 500 + index,
    stock: 10,
    minStock: 2,
    imageUrl: "",
    isActive: true,
  };
}

async function mockProducts(page: Page): Promise<void> {
  const items = catalogNames.map((name, index) => createCatalogProduct(name, index));

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

test("supports alphabet quick jumps and keeps the active letter in sync with catalog scroll", async ({
  page,
}) => {
  await mockProducts(page);

  await page.goto("/sales");

  await expect(page.getByTestId("sales-catalog-letter-A")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(12);
  await expect(page.getByTestId("sales-catalog-letter-Z")).toBeDisabled();

  await page.getByTestId("sales-catalog-letter-O").click();

  await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(15);
  await expect(
    page.locator('[data-testid^="sales-catalog-letter-"][aria-pressed="true"]'),
  ).not.toHaveText("A");
  await expect(page.getByTestId("product-card-catalog-product-015")).toContainText(
    "Oreo Clasicas",
  );

  await page.getByTestId("product-card-catalog-product-001").scrollIntoViewIfNeeded();

  await expect(page.getByTestId("sales-catalog-letter-A")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
