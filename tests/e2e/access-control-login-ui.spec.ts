import { expect, test } from "@playwright/test";

import { provisionPasswordCredentialsForAppUser } from "./support/access-control-auth";

test.describe("access control login ui", () => {
  test("signs in with Supabase Auth and returns to login after sign out", async ({
    page,
  }) => {
    const credentials = await provisionPasswordCredentialsForAppUser({
      appUserId: "user_cashier_putri",
      label: "login-cashier",
    });

    try {
      await page.goto("/login");

      await page.getByTestId("login-email-input").fill(credentials.email);
      await page.getByTestId("login-password-input").fill(credentials.password);
      await page.getByTestId("login-submit-button").click();

      await expect(page).toHaveURL(/\/cash-register$/);
      await expect(page.getByTestId("actor-session-source-label")).toHaveText(
        "Login verificado",
      );
      await expect(page.getByText("Putri")).toBeVisible();
      await expect(page.getByTestId("actor-auth-action-button")).toHaveText(
        "Cerrar sesión",
      );

      await page.getByTestId("actor-auth-action-button").click();

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByTestId("login-email-input")).toBeVisible();
    } finally {
      await credentials.cleanup();
    }
  });
});
