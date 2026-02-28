import { expect, test } from "@playwright/test";

function uniqueMarker(): string {
  return `report-ui-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test("loads reporting UI data and applies payment method filter", async ({ page, request }) => {
  const marker = uniqueMarker();
  const customerName = `Reporting User ${marker}`;

  const productAResponse = await request.post("/api/v1/products", {
    data: {
      name: `Reporting UI A ${marker}`,
      categoryId: "snack",
      price: 10,
      initialStock: 50,
    },
  });
  expect(productAResponse.status()).toBe(201);
  const productABody = (await productAResponse.json()) as {
    readonly item: { readonly id: string };
  };

  const productBResponse = await request.post("/api/v1/products", {
    data: {
      name: `Reporting UI B ${marker}`,
      categoryId: "drink",
      price: 10,
      initialStock: 50,
    },
  });
  expect(productBResponse.status()).toBe(201);
  const productBBody = (await productBResponse.json()) as {
    readonly item: { readonly id: string };
  };

  const cashSaleResponse = await request.post("/api/v1/sales", {
    data: {
      items: [{ productId: productABody.item.id, quantity: 2 }],
      paymentMethod: "cash",
    },
  });
  expect(cashSaleResponse.status()).toBe(201);

  const onAccountSaleResponse = await request.post("/api/v1/sales", {
    data: {
      items: [{ productId: productBBody.item.id, quantity: 1 }],
      paymentMethod: "on_account",
      customerName,
    },
  });
  expect(onAccountSaleResponse.status()).toBe(201);

  await page.goto("/pos");
  await page.getByTestId("nav-item-reporting").click();

  const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
  await page.getByLabel("Period end").fill(tomorrow);
  await page.getByTestId("reporting-apply-filters-button").click();

  await expect(page.getByRole("heading", { name: "Sales History and Analytics" })).toBeVisible();
  await expect(page.locator('[data-testid^="reporting-sales-item-"]').first()).toBeVisible();
  await expect(page.locator('[data-testid^="reporting-top-product-item-"]').first()).toBeVisible();

  await expect(page.getByTestId("reporting-revenue-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-cost-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-profit-value")).not.toHaveText("-");

  await page.getByTestId("reporting-payment-method-select").selectOption("on_account");
  await page.getByTestId("reporting-apply-filters-button").click();

  await expect(
    page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: "on_account" }).first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: customerName }),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: "cash" }),
  ).toHaveCount(0);

  await expect(
    page
      .locator('[data-testid^="reporting-top-product-item-"]')
      .filter({ hasText: marker })
      .first(),
  ).toBeVisible();
});
