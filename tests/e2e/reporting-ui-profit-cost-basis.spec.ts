import { expect, test } from "@playwright/test";

function uniqueMarker(): string {
  return `profit-ui-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function parseMoney(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, ""));
}

test("captures outbound inventory cost in profit summary from UI flow", async ({ page }) => {
  const marker = uniqueMarker();
  const productName = `Profit Cost ${marker}`;

  await page.goto("/sales");
  await page.getByTestId("nav-item-reporting").click();

  const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
  await page.getByLabel("Period end").fill(tomorrow);
  await page.getByTestId("reporting-apply-filters-button").click();

  const beforeCostText = (await page.getByTestId("reporting-cost-value").textContent()) ?? "$0";
  const beforeProfitText =
    (await page.getByTestId("reporting-profit-value").textContent()) ?? "$0";
  const beforeCost = parseMoney(beforeCostText);
  const beforeProfit = parseMoney(beforeProfitText);

  await page.getByTestId("nav-item-catalog").click();
  await page.getByTestId("onboarding-name-input").fill(productName);
  await page.getByTestId("onboarding-category-select").selectOption("snack");
  await page.getByTestId("onboarding-price-input").fill("25");
  await page.getByTestId("onboarding-cost-input").fill("7");
  await page.getByTestId("onboarding-stock-input").fill("0");
  await page.getByTestId("onboarding-submit-button").click();
  await expect(page.getByTestId("onboarding-feedback")).toContainText(
    `Product created: ${productName}`,
  );

  await page.getByTestId("nav-item-inventory").click();
  await page.getByTestId("inventory-product-select").selectOption({ label: productName });

  await page.getByTestId("inventory-movement-type-select").selectOption("inbound");
  await page.getByTestId("inventory-quantity-input").fill("5");
  await page.getByTestId("inventory-unit-cost-input").fill("7");
  await page.getByTestId("inventory-reason-input").fill("profit_cost_basis_inbound");
  await page.getByTestId("inventory-submit-button").click();
  await expect(page.getByTestId("inventory-feedback")).toContainText(
    "Stock movement registered: inbound.",
  );

  await page.getByTestId("inventory-movement-type-select").selectOption("outbound");
  await page.getByTestId("inventory-quantity-input").fill("2");
  await page.getByTestId("inventory-reason-input").fill("profit_cost_basis_outbound");
  await page.getByTestId("inventory-submit-button").click();
  await expect(page.getByTestId("inventory-feedback")).toContainText(
    "Stock movement registered: outbound.",
  );

  await page.getByTestId("nav-item-reporting").click();
  await page.getByLabel("Period end").fill(tomorrow);
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
