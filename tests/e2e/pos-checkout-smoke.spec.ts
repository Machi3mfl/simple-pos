import { expect, test, type Page } from "@playwright/test";

import cashSuccess from "../fixtures/mock-api/sale-cash-success.json";
import onAccountMissingCustomer from "../fixtures/mock-api/sale-on-account-missing-customer-error.json";
import onAccountSuccess from "../fixtures/mock-api/sale-on-account-success.json";
import productsListSuccess from "../fixtures/mock-api/products-list-success.json";
import unsupportedMethod from "../fixtures/mock-api/sale-unsupported-method-error.json";
import { createNewOnAccountCustomer, fillCashReceivedWithExactTotal } from "./support/checkout";

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

test("runs checkout smoke in mock mode for cash and on_account", async ({ page }) => {
  await page.goto("/sales");

  await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lista del pedido" })).toBeVisible();
  await expect(page.getByTestId("product-card-product-001")).toBeVisible();
  await page.getByTestId("product-card-product-001").click();

  await page.getByRole("button", { name: "Ir a cobrar" }).click();
  await fillCashReceivedWithExactTotal(page);
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(page.getByTestId("app-toast")).toContainText("Venta registrada correctamente.");

  await page.getByTestId("product-card-product-002").click();
  await page.getByRole("button", { name: "Ir a cobrar" }).click();
  await page.getByRole("button", { name: "Cuenta corriente" }).click();
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(
    page.getByTestId("app-toast"),
  ).toContainText("Elegí un cliente existente o tocá crear cliente nuevo antes de cobrar.");

  await createNewOnAccountCustomer(page, "Juan Perez");
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(page.getByTestId("app-toast")).toContainText("Venta registrada correctamente.");
});

test("rejects unsupported payment method request in mock mode", async ({ page }) => {
  await page.goto("/sales");

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
