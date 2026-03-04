import { expect, test, type Page } from "@playwright/test";

import {
  deleteAuthUserById,
  readAppUserAuthLink,
  restoreAppUserAuthLink,
} from "./support/access-control-auth";

async function selectOperator(page: Page, actorId: string): Promise<void> {
  await page.getByTestId("open-operator-selector-button").click();
  await expect(page.getByTestId("operator-selector-dialog")).toBeVisible();
  await page.getByTestId(`operator-selector-item-${actorId}`).click();
}

test("system admin can provision credentials from users-admin and then log in with the real user", async ({
  page,
}) => {
  const targetUserId = "user_exec_ana";
  const authLinkSnapshot = await readAppUserAuthLink(targetUserId);
  let createdAuthUserId: string | null = null;

  try {
    const email = `ana-ui-${Date.now()}@example.com`;
    const password = `AnaUi-${Date.now()}Aa!`;

    await page.goto("/cash-register");
    await selectOperator(page, "user_admin_soporte");
    await page.getByTestId("nav-item-users-admin").click();
    await expect(page).toHaveURL(/\/users-admin$/);

    await page.getByTestId(`users-admin-user-card-${targetUserId}`).click();
    await expect(page.getByTestId("users-admin-auth-status")).toBeVisible();
    await page.getByTestId("users-admin-auth-email-input").fill(email);
    await page.getByTestId("users-admin-auth-password-input").fill(password);
    await page.getByTestId("users-admin-save-auth-button").click();

    await expect(page.getByTestId("users-admin-auth-save-success-toast")).toBeVisible();
    await expect(page.getByTestId("users-admin-auth-status")).toContainText(
      "Acceso listo",
    );
    await expect(page.getByTestId("users-admin-auth-email-input")).toHaveValue(email);

    const currentAuthLink = await readAppUserAuthLink(targetUserId);
    createdAuthUserId = currentAuthLink.authUserId;
    expect(createdAuthUserId).toBeTruthy();

    await page.goto("/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByTestId("login-submit-button").click();

    await expect(page).toHaveURL(/\/sales$/);
    await expect(page.getByTestId("actor-session-source-label")).toHaveText(
      "Login verificado",
    );
    await expect(page.getByText("Ana")).toBeVisible();
  } finally {
    await restoreAppUserAuthLink(authLinkSnapshot);
    if (createdAuthUserId && createdAuthUserId !== authLinkSnapshot.authUserId) {
      await deleteAuthUserById(createdAuthUserId);
    }
  }
});
