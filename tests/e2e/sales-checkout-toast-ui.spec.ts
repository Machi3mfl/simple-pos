import { expect, test, type Page } from "@playwright/test";

import onAccountMissingCustomer from "../fixtures/mock-api/sale-on-account-missing-customer-error.json";
import onAccountSuccess from "../fixtures/mock-api/sale-on-account-success.json";
import productsListSuccess from "../fixtures/mock-api/products-list-success.json";
import { createNewOnAccountCustomer } from "./support/checkout";

async function mockSalesEndpoint(page: Page): Promise<void> {
  await page.route("**/api/v1/sales", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const payload = route.request().postDataJSON() as {
      readonly paymentMethod?: string;
      readonly customerName?: string;
    };

    if (payload.paymentMethod !== "on_account") {
      await route.continue();
      return;
    }

    if (payload.customerName) {
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
  });
}

async function mockProductsEndpoint(page: Page): Promise<void> {
  await page.route("**/api/v1/products**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(productsListSuccess),
    });
  });
}

async function mockCustomersEndpoint(page: Page): Promise<void> {
  await page.route("**/api/v1/customers**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockProductsEndpoint(page);
  await mockSalesEndpoint(page);
  await mockCustomersEndpoint(page);
});

test("shows floating checkout toast variants and keeps them visible for 10 seconds", async ({
  page,
}) => {
  await page.goto("/sales");

  await page.getByTestId("product-card-product-001").click();
  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-on-account-button").click();
  await page.getByTestId("checkout-confirm-payment-button").click();

  const toast = page.getByTestId("app-toast");

  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Falta seleccionar el cliente");
  await expect(toast).toContainText(
    "Elegí un cliente existente o tocá crear cliente nuevo antes de cobrar.",
  );
  await expect(toast.locator(".lucide-circle-alert")).toBeVisible();

  await createNewOnAccountCustomer(page, "Juan Perez");
  await page.getByTestId("checkout-confirm-payment-button").click();

  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Venta registrada");
  await expect(toast).toContainText("Venta registrada correctamente.");

  await page.waitForTimeout(9_000);
  await expect(toast).toBeVisible();

  await page.waitForTimeout(1_600);
  await expect(toast).toBeHidden();
});
