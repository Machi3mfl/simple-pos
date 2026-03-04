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
  await expect(page.getByTestId("nav-item-products")).toHaveCount(0);

  await page.getByTestId("nav-item-receivables").click();
  await expect(page).toHaveURL(/\/receivables$/);
  await expect(page.getByRole("heading", { name: "Deudas y cobranzas" })).toBeVisible();

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Productos restringidos" })).toBeVisible();

  await selectOperator(page, "user_catalog_lucia");
  await expect(page.getByRole("heading", { name: "Productos e inventario" })).toBeVisible();
  await expect(page.getByTestId("nav-item-products")).toBeVisible();
  await expect(page.getByTestId("nav-item-receivables")).toHaveCount(0);
});
