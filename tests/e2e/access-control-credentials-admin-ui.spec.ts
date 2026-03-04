import { expect, test } from "./support/test";

import {
  deleteAuthUserById,
  enterSupportModeFromLogin,
  readAppUserAuthLink,
  restoreAppUserAuthLink,
} from "./support/access-control-auth";

test("system admin can provision credentials from users-admin and then log in with the real user", async ({
  page,
}) => {
  const targetUserId = "user_exec_ana";
  const authLinkSnapshot = await readAppUserAuthLink(targetUserId);
  let createdAuthUserId: string | null = null;

  try {
    const email = `ana-ui-${Date.now()}@example.com`;
    const password = `AnaUi-${Date.now()}Aa!`;

    await enterSupportModeFromLogin(page);
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

    await page.getByTestId("actor-auth-action-button").click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByTestId("login-submit-button").click();

    await expect(page).toHaveURL(/\/sales$/);
    await expect(page.getByTestId("actor-session-source-label")).toHaveText(
      "Login verificado",
    );
    await expect(page.getByTestId("open-operator-selector-button")).toContainText("Ana");
  } finally {
    await restoreAppUserAuthLink(authLinkSnapshot);
    if (createdAuthUserId && createdAuthUserId !== authLinkSnapshot.authUserId) {
      await deleteAuthUserById(createdAuthUserId);
    }
  }
});
