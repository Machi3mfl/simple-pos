import { expect, test } from "@playwright/test";

test("navigates all vertical slice UIs from side rail", async ({ page }) => {
  await page.goto("/sales");
  await expect(page).toHaveURL(/\/sales$/);

  await page.getByTestId("nav-item-orders").click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByRole("heading", { name: "Listado de ventas" })).toBeVisible();

  await page.getByTestId("nav-item-products").click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", { name: "Productos e inventario" })).toBeVisible();

  await page.getByTestId("nav-item-receivables").click();
  await expect(page).toHaveURL(/\/receivables$/);
  await expect(page.getByRole("heading", { name: "Deudas y cobranzas" })).toBeVisible();

  await page.getByTestId("nav-item-reporting").click();
  await expect(page).toHaveURL(/\/reporting$/);
  await expect(
    page.getByRole("heading", { name: "Historial y analítica de ventas" }),
  ).toBeVisible();

  await page.getByTestId("nav-item-sync").click();
  await expect(page).toHaveURL(/\/sync$/);
  await expect(
    page.getByRole("heading", { name: "Cola offline y sincronización" }),
  ).toBeVisible();

  await page.getByTestId("nav-item-sales").click();
  await expect(page).toHaveURL(/\/sales$/);
  await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lista del pedido" })).toBeVisible();
});
