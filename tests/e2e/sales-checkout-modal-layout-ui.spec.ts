import { expect, test, type Page } from "@playwright/test";

function createCatalogProduct() {
  return {
    id: "checkout-modal-product-001",
    sku: "CHK-001",
    name: "Agua mineral villavicencio 2 lts",
    categoryId: "bebidas-aguas",
    price: 2849,
    cost: 1200,
    stock: 10,
    minStock: 2,
    imageUrl: "",
    isActive: true,
  };
}

function createCustomer(id: number) {
  return {
    id: `customer-${String(id).padStart(2, "0")}`,
    name: `Algo Cliente ${String(id).padStart(2, "0")}`,
    createdAt: new Date(2026, 2, id).toISOString(),
  };
}

async function mockCatalog(page: Page): Promise<void> {
  const items = [createCatalogProduct()];

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

async function mockCustomers(page: Page): Promise<void> {
  const recentCustomers = Array.from({ length: 10 }, (_, index) => createCustomer(index + 1));

  await page.route("**/api/v1/customers**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    const requestUrl = new URL(route.request().url());
    const query = requestUrl.searchParams.get("query")?.toLowerCase() ?? "";
    const items =
      query.length >= 2
        ? query.startsWith("al")
          ? recentCustomers
          : []
        : recentCustomers;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items }),
    });
  });
}

test("keeps the checkout modal inside the viewport and stable while customer lookup changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 620 });
  await mockCatalog(page);
  await mockCustomers(page);

  await page.goto("/sales");
  await page.getByTestId("product-card-checkout-modal-product-001").click();
  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-on-account-button").click();

  const modal = page.getByTestId("checkout-payment-modal");
  const customerInput = page.getByTestId("checkout-customer-name-input");
  const scrollArea = page.getByTestId("checkout-customer-options-scroll-area");
  const confirmButton = page.getByTestId("checkout-confirm-payment-button");
  const viewport = page.viewportSize();

  expect(viewport).toBeTruthy();
  if (!viewport) {
    throw new Error("Expected viewport size to be available.");
  }

  await expect(modal).toBeVisible();
  await expect(confirmButton).toBeVisible();

  const initialBox = await modal.boundingBox();
  expect(initialBox).not.toBeNull();
  if (!initialBox) {
    throw new Error("Expected checkout modal bounding box.");
  }

  expect(initialBox.y).toBeGreaterThanOrEqual(8);
  expect(initialBox.y + initialBox.height).toBeLessThanOrEqual(viewport.height - 8);

  await customerInput.fill("Al");
  await expect(page.getByTestId("checkout-customer-option-customer-01")).toBeVisible();

  const matchesBox = await modal.boundingBox();
  expect(matchesBox).not.toBeNull();
  if (!matchesBox) {
    throw new Error("Expected checkout modal bounding box after loading matches.");
  }

  expect(Math.abs(matchesBox.y - initialBox.y)).toBeLessThanOrEqual(4);
  expect(matchesBox.y + matchesBox.height).toBeLessThanOrEqual(viewport.height - 8);

  const scrollMetrics = await scrollArea.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));

  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);

  await customerInput.fill("Algoz");
  await expect(page.getByTestId("checkout-customer-create-button")).toBeVisible();

  const emptyStateBox = await modal.boundingBox();
  expect(emptyStateBox).not.toBeNull();
  if (!emptyStateBox) {
    throw new Error("Expected checkout modal bounding box after empty state.");
  }

  expect(Math.abs(emptyStateBox.y - initialBox.y)).toBeLessThanOrEqual(4);
  expect(emptyStateBox.y + emptyStateBox.height).toBeLessThanOrEqual(viewport.height - 8);
  await expect(confirmButton).toBeVisible();
});
