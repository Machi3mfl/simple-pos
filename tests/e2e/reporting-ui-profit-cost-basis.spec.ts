import { expect, test } from "@playwright/test";

import { createCatalogProduct } from "./support/catalog";

function uniqueMarker(): string {
  return `profit-ui-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function parseMoney(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, ""));
}

test("captures outbound inventory cost in profit summary from UI flow", async ({
  page,
  request,
}) => {
  const marker = uniqueMarker();
  const productName = `Profit Cost ${marker}`;
  const productSku = `PFT-${marker.slice(-6)}`;

  await page.goto("/cash-register");
  await page.getByTestId("nav-item-reporting").click();

  const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
  await page.getByLabel("Hasta").fill(tomorrow);
  await page.getByTestId("reporting-apply-filters-button").click();

  const beforeCostText = (await page.getByTestId("reporting-cost-value").textContent()) ?? "$0";
  const beforeProfitText =
    (await page.getByTestId("reporting-profit-value").textContent()) ?? "$0";
  const beforeCost = parseMoney(beforeCostText);
  const beforeProfit = parseMoney(beforeProfitText);

  await createCatalogProduct(request, {
    name: productName,
    sku: productSku,
    categoryId: "snack",
    price: 25,
    cost: 7,
    initialStock: 0,
    minStock: 2,
  });

  await page.getByTestId("nav-item-products").click();
  await page.getByTestId("products-workspace-search-input").fill(productSku);
  const productCard = page
    .locator('[data-testid^="products-workspace-card-"]')
    .filter({ hasText: productName })
    .first();
  await expect(productCard).toBeVisible();
  await productCard.click();

  await page.getByTestId("products-workspace-open-add-stock-button").click();
  await page.getByTestId("products-workspace-stock-quantity-input").fill("5");
  await page.getByTestId("products-workspace-stock-unit-cost-input").fill("7");
  await page.getByTestId("products-workspace-stock-reason-input").fill("profit_cost_basis_inbound");
  await page.getByTestId("products-workspace-stock-submit-button").click();
  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    `Movimiento registrado para ${productName}.`,
  );

  await page.getByTestId("products-workspace-open-adjust-stock-button").click();
  await page.getByTestId("products-workspace-stock-mode-outbound").click();
  await page.getByTestId("products-workspace-stock-quantity-input").fill("2");
  await page.getByTestId("products-workspace-stock-reason-input").fill("profit_cost_basis_outbound");
  await page.getByTestId("products-workspace-stock-submit-button").click();
  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    `Movimiento registrado para ${productName}.`,
  );

  await page.getByTestId("products-workspace-dialog-close").click();
  await expect(page.getByTestId("products-workspace-stock-mode-outbound")).toHaveCount(0);
  await page.getByTestId("nav-item-reporting").click();
  await page.getByLabel("Hasta").fill(tomorrow);
  await page.getByTestId("reporting-apply-filters-button").click();

  const afterCostText = (await page.getByTestId("reporting-cost-value").textContent()) ?? "$0";
  const afterProfitText =
    (await page.getByTestId("reporting-profit-value").textContent()) ?? "$0";
  const afterCost = parseMoney(afterCostText);
  const afterProfit = parseMoney(afterProfitText);

  const costDelta = Number((afterCost - beforeCost).toFixed(2));
  const profitDelta = Number((afterProfit - beforeProfit).toFixed(2));

  expect(costDelta).toBeGreaterThanOrEqual(13.99);
  expect(costDelta).toBeLessThanOrEqual(14.01);
  expect(profitDelta).toBeLessThanOrEqual(-13.99);
});
