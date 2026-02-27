import { expect, test, type Page } from "@playwright/test";

import cashSuccess from "../fixtures/mock-api/sale-cash-success.json";
import onAccountMissingCustomer from "../fixtures/mock-api/sale-on-account-missing-customer-error.json";
import onAccountSuccess from "../fixtures/mock-api/sale-on-account-success.json";
import unsupportedMethod from "../fixtures/mock-api/sale-unsupported-method-error.json";

interface CreateSaleRequestPayload {
  readonly paymentMethod?: string;
  readonly customerId?: string;
  readonly customerName?: string;
}

async function mockSalesEndpoint(page: Page): Promise<void> {
  await page.route("**/api/v1/sales", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    let payload: CreateSaleRequestPayload = {};
    try {
      payload = route.request().postDataJSON() as CreateSaleRequestPayload;
    } catch {
      payload = {};
    }

    if (payload.paymentMethod === "cash") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(cashSuccess),
      });
      return;
    }

    if (payload.paymentMethod === "on_account") {
      if (payload.customerId || payload.customerName) {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(onAccountSuccess),
        });
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(onAccountMissingCustomer),
      });
      return;
    }

    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify(unsupportedMethod),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockSalesEndpoint(page);
});

test("runs checkout smoke in mock mode for cash and on_account", async ({ page }) => {
  await page.goto("/pos");

  await expect(page.getByRole("heading", { name: "Choose Categories" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order List" })).toBeVisible();

  await page.getByRole("button", { name: "Process to Payment" }).click();
  await page.getByRole("button", { name: "Confirm Payment" }).click();
  await expect(page.getByText("Checkout completed successfully.")).toBeVisible();

  await page.getByRole("button", { name: "Process to Payment" }).click();
  await page.getByRole("button", { name: "On account" }).click();
  await page.getByRole("button", { name: "Confirm Payment" }).click();
  await expect(page.getByText("For on-account payment, assign a customer name first.")).toBeVisible();

  await page.getByPlaceholder("e.g. Juan Perez").fill("Juan Perez");
  await page.getByRole("button", { name: "Confirm Payment" }).click();
  await expect(page.getByText("Checkout completed successfully.")).toBeVisible();
});

test("rejects unsupported payment method request in mock mode", async ({ page }) => {
  await page.goto("/pos");

  const result = await page.evaluate(async () => {
    const response = await fetch("/api/v1/sales", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: "prod-1", quantity: 1 }],
        paymentMethod: "card",
      }),
    });
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    };
  });

  expect(result.status).toBe(400);
  expect(result.body.code).toBe("validation_error");
});
