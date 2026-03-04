import { expect, test } from "./support/test";

function createWorkspaceProduct(index: number) {
  const id = `workspace-product-${String(index).padStart(3, "0")}`;

  return {
    id,
    sku: `SKU-${String(index).padStart(3, "0")}`,
    name: `Workspace Product ${index}`,
    categoryId: index % 2 === 0 ? "drink" : "snack",
    price: 100 + index,
    averageCost: 50 + index,
    stock: 10 + index,
    minStock: 2,
    imageUrl: "",
    isActive: true,
    stockState: "with_stock" as const,
    lastMovementAt: "2026-03-01T10:00:00.000Z",
    lastMovementType: "inbound" as const,
  };
}

const firstPageItems = Array.from({ length: 20 }, (_, index) => createWorkspaceProduct(index + 1));
const secondPageItems = Array.from({ length: 5 }, (_, index) => createWorkspaceProduct(index + 21));

test("appends additional workspace products when reaching the infinite-scroll sentinel", async ({
  page,
}) => {
  const requestedPages: number[] = [];

  await page.route("**/api/v1/products/workspace**", async (route) => {
    const url = new URL(route.request().url());
    const pageParam = Number(url.searchParams.get("page") ?? "1");
    requestedPages.push(pageParam);

    const payload =
      pageParam === 2
        ? {
            items: secondPageItems,
            page: 2,
            pageSize: 20,
            totalItems: 25,
            totalPages: 2,
            summary: {
              withStock: 25,
              lowStock: 0,
              outOfStock: 0,
              stockValue: 9999,
            },
          }
        : {
            items: firstPageItems,
            page: 1,
            pageSize: 20,
            totalItems: 25,
            totalPages: 2,
            summary: {
              withStock: 25,
              lowStock: 0,
              outOfStock: 0,
              stockValue: 9999,
            },
          };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/products");

  await expect(page.locator('[data-testid^="products-workspace-card-"]')).toHaveCount(20);
  await expect(page.getByTestId("products-workspace-infinite-scroll-status")).toContainText(
    "Seguí bajando para ver más productos.",
  );

  await page.getByTestId("products-workspace-infinite-scroll-sentinel").scrollIntoViewIfNeeded();

  await expect.poll(() => requestedPages).toEqual([1, 2]);
  await expect(page.locator('[data-testid^="products-workspace-card-"]')).toHaveCount(25);
  await expect(page.getByTestId("products-workspace-card-workspace-product-025")).toContainText(
    "Workspace Product 25",
  );
  await expect(page.getByTestId("products-workspace-infinite-scroll-status")).toContainText(
    "No hay más productos para estos filtros.",
  );
});
