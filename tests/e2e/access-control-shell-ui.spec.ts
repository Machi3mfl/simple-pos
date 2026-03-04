import { expect, test, type Page } from "@playwright/test";

import productsListSuccess from "../fixtures/mock-api/products-list-success.json";

async function mockWorkspaceData(page: Page): Promise<void> {
  await page.route("**/api/v1/products?activeOnly=true**", async (route) => {
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

  await page.route("**/api/v1/receivables**", async (route) => {
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

  await page.route("**/api/v1/products/workspace**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 1,
        summary: {
          withStock: 0,
          lowStock: 0,
          outOfStock: 0,
          stockValue: 0,
        },
      }),
    });
  });

  await page.route("**/api/v1/reports/sales-history**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            saleId: "sale-1",
            paymentMethod: "on_account",
            customerId: "customer-1",
            customerName: "Cliente Visible",
            total: 1500,
            amountPaid: 500,
            outstandingAmount: 1000,
            paymentStatus: "partial",
            itemCount: 2,
            saleItems: [
              {
                productId: "product-1",
                productName: "Producto Visible",
                quantity: 2,
                unitPrice: 750,
                lineTotal: 1500,
              },
            ],
            createdAt: "2026-03-03T12:00:00.000Z",
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/reports/top-products**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            productId: "product-1",
            name: "Producto Visible",
            quantitySold: 2,
            revenue: 1500,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/reports/profit-summary**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        revenue: 1500,
        cost: 700,
        profit: 800,
      }),
    });
  });
}

async function selectOperator(page: Page, actorId: string): Promise<void> {
  await page.getByTestId("open-operator-selector-button").click();
  await expect(page.getByTestId("operator-selector-dialog")).toBeVisible();
  await page.getByTestId(`operator-selector-item-${actorId}`).click();
}

test("switches operator and blocks workspaces according to role", async ({ page }) => {
  await mockWorkspaceData(page);
  await page.goto("/cash-register");

  await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();

  await selectOperator(page, "user_collections_marta");
  await expect(page.getByRole("heading", { name: "Caja restringida" })).toBeVisible();
  await expect(page.getByTestId("nav-item-receivables")).toBeVisible();
  await expect(page.getByTestId("nav-item-sales")).toHaveCount(0);
  await expect(page.getByTestId("nav-item-products")).toHaveCount(0);

  await page.getByTestId("nav-item-receivables").click();
  await expect(page).toHaveURL(/\/receivables$/);
  await expect(page.getByRole("heading", { name: "Deudas y cobranzas" })).toBeVisible();
  await expect(page.getByTestId("nav-item-reporting")).toHaveCount(0);

  await selectOperator(page, "user_cashier_putri");
  await expect(page.getByTestId("nav-item-sales")).toBeVisible();
  await expect(page.getByTestId("nav-item-receivables")).toHaveCount(0);

  await page.getByTestId("nav-item-sales").click();
  await expect(page).toHaveURL(/\/sales$/);
  await expect(page.getByRole("heading", { name: "Listado de ventas" })).toBeVisible();
  await expect(page.getByText("Este perfil puede ver el resumen de ventas")).toBeVisible();
  await page.getByTestId("orders-sale-item-sale-1").click();
  await expect(page.getByTestId("orders-sale-detail-modal")).toHaveCount(0);
  await expect(page.getByTestId("nav-item-reporting")).toHaveCount(0);

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Productos restringidos" })).toBeVisible();

  await selectOperator(page, "user_supervisor_bruno");
  await expect(page.getByTestId("nav-item-reporting")).toBeVisible();
  await page.getByTestId("nav-item-reporting").click();
  await expect(
    page.getByRole("heading", { name: "Historial y analítica de ventas" }),
  ).toBeVisible();
  await expect(page.getByText("Este perfil ve solo señales operativas.")).toBeVisible();
  await expect(page.getByTestId("reporting-sales-count-value")).toBeVisible();
  await expect(page.getByTestId("reporting-revenue-value")).toBeVisible();
  await expect(page.getByTestId("reporting-current-collected-value")).toBeVisible();
  await expect(page.getByTestId("reporting-cost-value")).toHaveCount(0);
  await expect(page.getByTestId("reporting-profit-value")).toHaveCount(0);
  await expect(page.getByTestId("reporting-current-credit-value")).toHaveCount(0);
  await expect(page.getByTestId("reporting-stock-value")).toHaveCount(0);

  await selectOperator(page, "user_catalog_lucia");
  await expect(page.getByTestId("nav-item-products")).toBeVisible();
  await expect(page.getByTestId("nav-item-receivables")).toHaveCount(0);
  await page.getByTestId("nav-item-products").click();
  await expect(page.getByRole("heading", { name: "Productos e inventario" })).toBeVisible();
});
