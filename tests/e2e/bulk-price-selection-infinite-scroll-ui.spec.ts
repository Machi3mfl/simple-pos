import { expect, test } from "./support/test";

function createWorkspaceProduct(index: number) {
  return {
    id: `workspace-${index}`,
    sku: `WS-${index}`,
    name: `Workspace Seed ${index}`,
    categoryId: "drink",
    price: 100 + index,
    averageCost: 50 + index,
    stock: 5,
    minStock: 1,
    imageUrl: "",
    isActive: true,
    stockState: "with_stock" as const,
    lastMovementAt: "2026-03-01T10:00:00.000Z",
    lastMovementType: "inbound" as const,
  };
}

function createBulkProduct(index: number) {
  return {
    id: `bulk-product-${String(index).padStart(3, "0")}`,
    name: `Bulk Candidate ${index}`,
    categoryId: "drink",
    price: 1000 + index,
  };
}

test("reveals more selectable products inside bulk price update scope selection", async ({
  page,
}) => {
  const bulkProducts = Array.from({ length: 25 }, (_, index) => createBulkProduct(index + 1));

  await page.route("**/api/v1/products/workspace**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [createWorkspaceProduct(1)],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        summary: {
          withStock: 1,
          lowStock: 0,
          outOfStock: 0,
          stockValue: 150,
        },
      }),
    });
  });

  await page.route("**/api/v1/products?activeOnly=true", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: bulkProducts,
      }),
    });
  });

  await page.goto("/products");
  await page.getByTestId("products-workspace-open-bulk-prices-button").click();
  await page.getByTestId("bulk-scope-select").selectOption("selection");

  const selectionItems = page.locator('[data-testid^="bulk-selection-item-"]');
  await expect
    .poll(async () => await selectionItems.count())
    .toBeGreaterThanOrEqual(16);

  const initialCount = await selectionItems.count();

  if (initialCount < 25) {
    await expect(page.getByTestId("bulk-selection-infinite-scroll-status")).toContainText(
      "Seguí bajando para ver más productos.",
    );
    await selectionItems.nth(initialCount - 1).scrollIntoViewIfNeeded();
  }

  await expect(selectionItems).toHaveCount(25);
});
