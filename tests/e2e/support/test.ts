import {
  expect,
  request as playwrightRequest,
  test as base,
  type APIRequestContext,
} from "@playwright/test";

import {
  buildAuthorizationHeaders,
  ensureDemoAuthUsers,
  getDemoAuthUserCredentials,
  signInAsDemoAppUser,
  signInThroughLoginPage,
} from "./access-control-auth";

interface AuthenticatedFixtures {
  readonly anonymousRequest: APIRequestContext;
  readonly supportRequest: APIRequestContext;
}

interface AuthenticatedOptions {
  readonly loginAsAppUserId: string | null;
}

interface MeSnapshotResponse {
  readonly session?: {
    readonly resolutionSource?: string;
  };
}

const DEFAULT_BASE_URL = "http://127.0.0.1:3010";

export const test = base.extend<AuthenticatedFixtures & AuthenticatedOptions>({
  loginAsAppUserId: ["user_manager_maxi", { option: true }],

  page: async ({ page, loginAsAppUserId }, use) => {
    if (loginAsAppUserId) {
      await ensureDemoAuthUsers();
      const credentials = getDemoAuthUserCredentials(loginAsAppUserId);

      const isAuthenticated = async (): Promise<boolean> => {
        const response = await page.request.get("/api/v1/me");
        if (!response.ok()) {
          return false;
        }

        const payload = (await response.json()) as MeSnapshotResponse;
        return payload.session?.resolutionSource === "authenticated";
      };

      if (!(await isAuthenticated())) {
        await signInThroughLoginPage(page, credentials);

        await page.waitForURL(
          /\/(cash-register|sales|products|receivables|reporting|users-admin|sync)$/,
          {
            timeout: 15_000,
          },
        );

        if (!(await isAuthenticated())) {
          throw new Error(
            `Failed to bootstrap authenticated Playwright page for ${loginAsAppUserId}.`,
          );
        }
      }
    }

    await use(page);
  },

  request: async ({ baseURL }, use) => {
    await ensureDemoAuthUsers();

    const session = await signInAsDemoAppUser("user_manager_maxi");
    const requestContext = await playwrightRequest.newContext({
      baseURL: baseURL ?? DEFAULT_BASE_URL,
      extraHTTPHeaders: buildAuthorizationHeaders(session.accessToken),
    });

    try {
      await use(requestContext);
    } finally {
      await requestContext.dispose();
    }
  },

  anonymousRequest: async ({ baseURL }, use) => {
    const requestContext = await playwrightRequest.newContext({
      baseURL: baseURL ?? DEFAULT_BASE_URL,
    });

    try {
      await use(requestContext);
    } finally {
      await requestContext.dispose();
    }
  },

  supportRequest: async ({ baseURL }, use) => {
    await ensureDemoAuthUsers();

    const session = await signInAsDemoAppUser("user_admin_soporte");
    const requestContext = await playwrightRequest.newContext({
      baseURL: baseURL ?? DEFAULT_BASE_URL,
      extraHTTPHeaders: buildAuthorizationHeaders(session.accessToken),
    });

    try {
      await use(requestContext);
    } finally {
      await requestContext.dispose();
    }
  },
});

export { expect };
export * from "@playwright/test";
