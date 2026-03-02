import { expect, test, type Page } from "@playwright/test";

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
  const items = Array.from({ length: 24 }, (_, index) => createCatalogProduct(index + 1));

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

test("shows a floating scroll-to-top control after catalog scrolling and returns to the top", async ({
  page,
}) => {
  await mockProducts(page);

  await page.goto("/sales");
  await page.getByTestId("sales-catalog-infinite-scroll-sentinel").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("product-card-catalog-product-024")).toBeVisible();
  await page.getByTestId("product-card-catalog-product-024").scrollIntoViewIfNeeded();

  const scrollToTopButton = page.getByTestId("sales-catalog-scroll-to-top-button");
  await expect(scrollToTopButton).toBeVisible();
  await scrollToTopButton.click();

  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="sales-catalog-scroll-root"]');
    return root instanceof HTMLElement && root.scrollTop <= 4;
  });
  await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
});
