import { expect, test, type Page } from "./support/test";

function createCatalogItem(input: {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
}) {
  return {
    id: input.id,
    sku: `SKU-${input.id}`,
    name: input.name,
    categoryId: input.categoryId,
    price: 1000,
    cost: 500,
    stock: 12,
    minStock: 2,
    imageUrl: "",
    isActive: true,
  };
}

async function mockProducts(page: Page): Promise<void> {
  const items = [
    createCatalogItem({
      id: "product-snack-singular",
      name: "Snack Singular",
      categoryId: "snack",
    }),
    createCatalogItem({
      id: "product-snacks-plural",
      name: "Snack Plural",
      categoryId: "snacks",
    }),
    createCatalogItem({
      id: "product-drink",
      name: "Bebida Cola",
      categoryId: "drink",
    }),
  ];

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

test("collapses legacy snack category aliases into a single sales chip", async ({
  page,
}) => {
  await mockProducts(page);

  await page.goto("/cash-register");

  const snacksChip = page.locator('button[title="Snacks"]');
  await expect(snacksChip).toHaveCount(1);

  await snacksChip.click();

  await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(2);
  await expect(page.getByText("Snack Singular")).toBeVisible();
  await expect(page.getByText("Snack Plural")).toBeVisible();
  await expect(page.getByText("Bebida Cola")).not.toBeVisible();
});

test("assigns distinct category icons for broader category families", async ({ page }) => {
  const items = [
    createCatalogItem({
      id: "product-breakfast",
      name: "Café molido",
      categoryId: "desayuno-y-merienda",
    }),
    createCatalogItem({
      id: "product-pantry",
      name: "Fideos secos",
      categoryId: "almacen",
    }),
    createCatalogItem({
      id: "product-beverage",
      name: "Agua mineral",
      categoryId: "bebidas",
    }),
    createCatalogItem({
      id: "product-home",
      name: "Set de cocina",
      categoryId: "hogar",
    }),
    createCatalogItem({
      id: "product-toys",
      name: "Auto de juguete",
      categoryId: "jugueteria",
    }),
    createCatalogItem({
      id: "product-cleaning",
      name: "Detergente limón",
      categoryId: "limpieza",
    }),
  ];

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

  await page.goto("/cash-register");

  await expect(page.locator('button[title="Desayuno y merienda"]')).toContainText("🥐");
  await expect(page.locator('button[title="Almacen"]')).toContainText("🥫");
  await expect(page.locator('button[title="Bebidas"]')).toContainText("🥤");
  await expect(page.locator('button[title="Hogar"]')).toContainText("🏠");
  await expect(page.locator('button[title="Jugueteria"]')).toContainText("🧸");
  await expect(page.locator('button[title="Limpieza"]')).toContainText("🧽");
});
