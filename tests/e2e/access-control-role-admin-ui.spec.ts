import { expect, test, type Page } from "@playwright/test";

async function selectOperator(page: Page, actorId: string): Promise<void> {
  await page.getByTestId("open-operator-selector-button").click();
  await expect(page.getByTestId("operator-selector-dialog")).toBeVisible();
  await page.getByTestId(`operator-selector-item-${actorId}`).click();
}

test("system admin can compose a role, assign it, and validate the resulting workspace access", async ({
  page,
}) => {
  const uniqueRoleName = `Caja extendida UI ${Date.now()}`;

  await page.goto("/cash-register");
  await selectOperator(page, "user_admin_soporte");

  await expect(page.getByTestId("nav-item-users-admin")).toBeVisible();
  await page.getByTestId("nav-item-users-admin").click();
  await expect(page).toHaveURL(/\/users-admin$/);
  await expect(
    page.getByRole("heading", { name: "Usuarios, roles y permisos" }),
  ).toBeVisible();

  await page.getByTestId("users-admin-role-card-cashier").click();
  await page.getByTestId("users-admin-role-name-input").fill(uniqueRoleName);
  await page.getByTestId("users-admin-save-role-button").click();
  await expect(page.getByTestId("users-admin-role-save-success-toast")).toBeVisible();

  await page.getByTestId("users-admin-user-card-user_collections_marta").click();
  await page.getByLabel(uniqueRoleName).check();
  await page.getByTestId("users-admin-save-user-roles-button").click();
  await expect(
    page.getByTestId("users-admin-user-assignment-success-toast"),
  ).toBeVisible();

  await page.getByTestId("users-admin-try-user-button").click();
  await expect(page.getByRole("heading", { name: "Accesos restringidos" })).toBeVisible();
  await expect(page.getByTestId("nav-item-cash-register")).toBeVisible();
  await page.getByTestId("nav-item-cash-register").click();
  await expect(page).toHaveURL(/\/cash-register$/);
  await expect(page.getByRole("heading", { name: "Caja abierta" })).toHaveCount(0);
  await expect(page.getByText("Sesión de caja")).toBeVisible();

  await selectOperator(page, "user_admin_soporte");
  await page.getByTestId("nav-item-users-admin").click();
  await page.getByTestId("users-admin-user-card-user_collections_marta").click();
  await page.getByLabel(uniqueRoleName).uncheck();
  await page.getByTestId("users-admin-save-user-roles-button").click();
  await expect(
    page.getByTestId("users-admin-user-assignment-success-toast"),
  ).toBeVisible();

  await page
    .locator("button")
    .filter({ hasText: uniqueRoleName })
    .first()
    .click();
  await page.getByText("Editar rol custom").waitFor();
  await page.getByRole("button", { name: "Eliminar rol" }).click();
  await expect(page.getByTestId("users-admin-role-delete-success-toast")).toBeVisible();
});
