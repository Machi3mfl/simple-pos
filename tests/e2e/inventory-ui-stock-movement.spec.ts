import { expect, test } from "@playwright/test";

test("registers inventory movement from UI and shows validation feedback", async ({
  page,
  request,
}) => {
  const seedResponse = await request.post("/api/v1/products", {
    data: {
      name: `Inventory Seed ${Date.now()}`,
      categoryId: "main",
      price: 10,
      initialStock: 5,
    },
  });
  expect(seedResponse.status()).toBe(201);

  await page.goto("/pos");
  await page.getByTestId("nav-item-inventory").click();

  await expect(page.getByRole("heading", { name: "Stock Movement" })).toBeVisible();
  await expect(page.getByTestId("inventory-product-select")).toBeVisible();
  await expect
    .poll(async () => page.getByTestId("inventory-product-select").locator("option").count())
    .toBeGreaterThan(0);
  await expect(page.getByTestId("inventory-submit-button")).toBeEnabled();

  await page.getByTestId("inventory-movement-type-select").selectOption("inbound");
  await page.getByTestId("inventory-quantity-input").fill("2");
  await page.getByTestId("inventory-unit-cost-input").fill("");
  await page.getByTestId("inventory-submit-button").click();

  await expect(page.getByTestId("inventory-feedback")).toContainText(
    "Inbound movement requires unit cost greater than zero.",
  );

  await page.getByTestId("inventory-unit-cost-input").fill("12");
  await page.getByTestId("inventory-reason-input").fill("supplier_restock");
  await page.getByTestId("inventory-submit-button").click();

  await expect(page.getByTestId("inventory-feedback")).toContainText(
    "Stock movement registered: inbound.",
  );

  const historyItem = page.locator('[data-testid^="inventory-history-item-"]').first();
  await expect(historyItem).toContainText("inbound");
  await expect(historyItem).toContainText("qty 2");
});
