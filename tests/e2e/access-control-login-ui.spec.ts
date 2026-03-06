import { expect, test } from "./support/test";

import {
  getActorSessionCookieName,
  serializeActorSessionCookie,
} from "@/modules/access-control/infrastructure/session/actorSessionCookie";

import {
  provisionAndLoginAsAppUser,
  provisionPasswordCredentialsForAppUser,
} from "./support/access-control-auth";

test.describe("access control login ui", () => {
  test.use({ loginAsAppUserId: null });

  test("requires real login and lets system admin reach users administration", async ({
    page,
  }) => {
    const credentials = await provisionAndLoginAsAppUser({
      page,
      appUserId: "user_admin_soporte",
      label: "login-admin",
    });

    try {
      await expect(page).toHaveURL(/\/users-admin$/);
      await expect(page.getByTestId("actor-session-source-label")).toHaveText(
        "Login verificado",
      );
      await expect(page.getByTestId("login-support-button")).toHaveCount(0);
      await expect(page.getByTestId("open-operator-selector-button")).toContainText(
        "Soporte",
      );
    } finally {
      await credentials.cleanup();
    }
  });

  test("returns to /login without flashing blocked guard from assumed-user session", async ({
    page,
  }) => {
    const session = await provisionAndLoginAsAppUser({
      page,
      appUserId: "user_cashier_putri",
      label: "logout-guard-assumed",
    });

    try {
      await expect(page).toHaveURL(/\/cash-register$/);
      await page.getByTestId("actor-auth-action-button").click();

      const firstTransitionState = await Promise.race([
        page.waitForURL(/\/login$/, { timeout: 8_000 }).then(() => "login" as const),
        page
          .getByTestId("workspace-blocked-state")
          .first()
          .waitFor({ state: "visible", timeout: 8_000 })
          .then(() => "blocked" as const)
          .catch(() => "blocked-timeout" as const),
      ]);

      expect(firstTransitionState).toBe("login");
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByTestId("workspace-blocked-state")).toHaveCount(0);
      await expect(page.getByTestId("login-email-input")).toBeVisible();
    } finally {
      await session.cleanup();
    }
  });

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
      await expect(page.getByTestId("open-operator-selector-button")).toContainText(
        "Putri",
      );
      await expect(page.getByTestId("actor-auth-action-button")).toHaveText(
        "Cerrar sesión",
      );

      await page.getByTestId("actor-auth-action-button").click();
      const firstTransitionState = await Promise.race([
        page.waitForURL(/\/login$/, { timeout: 8_000 }).then(() => "login" as const),
        page
          .getByTestId("workspace-blocked-state")
          .first()
          .waitFor({ state: "visible", timeout: 8_000 })
          .then(() => "blocked" as const)
          .catch(() => "blocked-timeout" as const),
      ]);

      expect(firstTransitionState).toBe("login");
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByTestId("login-email-input")).toBeVisible();
    } finally {
      await credentials.cleanup();
    }
  });

  test("ignores stale assumed-user cookies and keeps unauthenticated access on login", async ({
    page,
    baseURL,
  }) => {
    await page.context().addCookies([
      {
        name: getActorSessionCookieName(),
        value: serializeActorSessionCookie({
          userId: "user_cashier_putri",
          supportUserId: "user_admin_soporte",
        }),
        url: baseURL ?? "http://127.0.0.1:3010",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-email-input")).toBeVisible();

    await page.goto("/cash-register");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-email-input")).toBeVisible();
  });
});
