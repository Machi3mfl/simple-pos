import { expect, test, type Page } from "@playwright/test";

function createCatalogProduct(index: number) {
  const id = `catalog-product-${String(index).padStart(3, "0")}`;

  return {
    id,
    sku: `CAT-${String(index).padStart(3, "0")}`,
    name: `Catalog Product ${index}`,
    categoryId: "drink",
    price: 1000 + index,
    stock: 10,
    isActive: true,
  };
}

async function mockProducts(page: Page): Promise<void> {
  const items = Array.from({ length: 12 }, (_, index) => createCatalogProduct(index + 1));

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

test("keeps the totals card fixed while the order item list scrolls independently", async ({
  page,
}) => {
  await mockProducts(page);

  await page.goto("/cash-register");

  for (let index = 1; index <= 12; index += 1) {
    await page.getByTestId(`product-card-catalog-product-${String(index).padStart(3, "0")}`).click();
  }

  const scrollMetrics = await page.getByTestId("checkout-order-items-scroll").evaluate((node) => {
    if (!(node instanceof HTMLElement)) {
      return { clientHeight: 0, scrollHeight: 0 };
    }

    return {
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    };
  });

  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);

  await page.getByTestId("checkout-order-items-scroll").evaluate((node) => {
    if (node instanceof HTMLElement) {
      node.scrollTop = node.scrollHeight;
    }
  });

  await expect(page.getByTestId("order-item-catalog-product-012")).toBeVisible();
  await expect(page.getByTestId("checkout-total-value")).toBeVisible();
  await expect(page.getByTestId("checkout-open-payment-button")).toBeVisible();
});
