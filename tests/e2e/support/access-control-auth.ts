import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { SUPPORT_BRIDGE_ACTOR_ID } from "@/modules/access-control/domain/constants/supportBridge";

interface AuthenticatedAppUserSession {
  readonly accessToken: string;
  readonly authUserId: string;
  readonly cleanup: () => Promise<void>;
}

interface ProvisionedAppUserCredentials {
  readonly email: string;
  readonly password: string;
  readonly authUserId: string;
  readonly cleanup: () => Promise<void>;
}

interface BrowserLoginCredentials {
  readonly email: string;
  readonly password: string;
}

interface AppUserAuthLinkSnapshot {
  readonly appUserId: string;
  readonly authUserId: string | null;
}

interface DemoAuthUserRecord {
  readonly appUserId: string;
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
}

interface DemoAuthUsersManifest {
  readonly users: readonly DemoAuthUserRecord[];
}

let ensuredDemoAuthUsersPromise: Promise<void> | null = null;

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  // Local E2E runs should prefer the seeded local Supabase env, while still allowing a production env fallback.
  for (const fileName of [".env.local", ".env.production.local"]) {
    try {
      const envFile = readFileSync(join(process.cwd(), fileName), "utf8");
      const matchedLine = envFile
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.startsWith(`${name}=`));

      if (matchedLine) {
        const rawValue = matchedLine.slice(name.length + 1).trim();
        if (
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ) {
          return rawValue.slice(1, -1);
        }

        return rawValue;
      }
    } catch {
      // Fall through to the next file and surface a single error below.
    }
  }

  throw new Error(`Missing required env var: ${name}`);
}

function createServiceRoleClient(): SupabaseClient {
  return createClient(
    readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function createAnonClient(): SupabaseClient {
  return createClient(
    readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function readDemoAuthUsersManifest(): DemoAuthUsersManifest {
  const manifestPath = join(
    process.cwd(),
    "workflow-manager",
    "docs",
    "injector",
    "datasets",
    "access-control",
    "demo-auth-users.json",
  );

  const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as DemoAuthUsersManifest;
  return parsed;
}

function findDemoUserRecord(appUserId: string): DemoAuthUserRecord {
  const manifest = readDemoAuthUsersManifest();
  const matchedUser = manifest.users.find((user) => user.appUserId === appUserId);

  if (!matchedUser) {
    throw new Error(`Missing demo auth user record for app user: ${appUserId}`);
  }

  return matchedUser;
}

async function findAuthUserByEmail(
  adminClient: SupabaseClient,
  email: string,
): Promise<{ readonly id: string } | null> {
  let page = 1;

  while (true) {
    const response = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const users = response.data.users ?? [];
    const matchedUser = users.find(
      (user) => user.email?.trim().toLowerCase() === email.trim().toLowerCase(),
    );
    if (matchedUser) {
      return { id: matchedUser.id };
    }

    if (users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function resolveOrCreateDemoAuthUser(params: {
  readonly adminClient: SupabaseClient;
  readonly appUserId: string;
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
}): Promise<string> {
  const existingLink = await params.adminClient
    .from("app_users")
    .select("auth_user_id")
    .eq("id", params.appUserId)
    .maybeSingle();
  if (existingLink.error) {
    throw new Error(existingLink.error.message);
  }

  const linkedAuthUserId =
    (existingLink.data?.auth_user_id as string | null | undefined) ?? null;
  if (linkedAuthUserId) {
    const updateResponse = await params.adminClient.auth.admin.updateUserById(
      linkedAuthUserId,
      {
        email: params.email,
        password: params.password,
        email_confirm: true,
        user_metadata: {
          display_name: params.displayName,
        },
      },
    );

    if (!updateResponse.error) {
      return linkedAuthUserId;
    }
  }

  const matchedUserByEmail = await findAuthUserByEmail(
    params.adminClient,
    params.email,
  );

  if (matchedUserByEmail) {
    const updateResponse = await params.adminClient.auth.admin.updateUserById(
      matchedUserByEmail.id,
      {
        email: params.email,
        password: params.password,
        email_confirm: true,
        user_metadata: {
          display_name: params.displayName,
        },
      },
    );

    if (updateResponse.error) {
      throw new Error(updateResponse.error.message);
    }

    return matchedUserByEmail.id;
  }

  const createResponse = await params.adminClient.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      display_name: params.displayName,
    },
  });

  if (createResponse.error || !createResponse.data.user) {
    throw new Error(createResponse.error?.message ?? "Failed to create demo auth user.");
  }

  return createResponse.data.user.id;
}

export async function ensureDemoAuthUsers(): Promise<void> {
  if (!ensuredDemoAuthUsersPromise) {
    ensuredDemoAuthUsersPromise = (async () => {
      const adminClient = createServiceRoleClient();
      const manifest = readDemoAuthUsersManifest();

      for (const user of manifest.users) {
        const authUserId = await resolveOrCreateDemoAuthUser({
          adminClient,
          appUserId: user.appUserId,
          displayName: user.displayName,
          email: user.email,
          password: user.password,
        });

        const linkResponse = await adminClient
          .from("app_users")
          .update({ auth_user_id: authUserId })
          .eq("id", user.appUserId);

        if (linkResponse.error) {
          throw new Error(linkResponse.error.message);
        }
      }
    })();
  }

  await ensuredDemoAuthUsersPromise;
}

export function getDemoAuthUserCredentials(
  appUserId: string,
): BrowserLoginCredentials {
  const record = findDemoUserRecord(appUserId);
  return {
    email: record.email,
    password: record.password,
  };
}

export async function signInAsDemoAppUser(appUserId: string): Promise<{
  readonly accessToken: string;
  readonly authUserId: string;
}> {
  await ensureDemoAuthUsers();

  const credentials = getDemoAuthUserCredentials(appUserId);
  return signInWithPassword(credentials);
}

export function buildAuthorizationHeaders(
  accessToken: string,
): Record<string, string> {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

export async function readAppUserAuthLink(
  appUserId: string,
): Promise<AppUserAuthLinkSnapshot> {
  const adminClient = createServiceRoleClient();
  const response = await adminClient
    .from("app_users")
    .select("auth_user_id")
    .eq("id", appUserId)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return {
    appUserId,
    authUserId:
      (response.data?.auth_user_id as string | null | undefined) ?? null,
  };
}

export async function restoreAppUserAuthLink(params: {
  readonly appUserId: string;
  readonly authUserId: string | null;
}): Promise<void> {
  const adminClient = createServiceRoleClient();
  const response = await adminClient
    .from("app_users")
    .update({ auth_user_id: params.authUserId })
    .eq("id", params.appUserId);

  if (response.error) {
    throw new Error(response.error.message);
  }
}

export async function deleteAuthUserById(authUserId: string): Promise<void> {
  const adminClient = createServiceRoleClient();
  const response = await adminClient.auth.admin.deleteUser(authUserId);
  if (response.error) {
    throw new Error(response.error.message);
  }
}

export async function signInWithPassword(params: {
  readonly email: string;
  readonly password: string;
}): Promise<{ readonly accessToken: string; readonly authUserId: string }> {
  const publicClient = createAnonClient();
  const signInResponse = await publicClient.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  if (
    signInResponse.error ||
    !signInResponse.data.session?.access_token ||
    !signInResponse.data.user?.id
  ) {
    throw new Error(signInResponse.error?.message ?? "Failed to sign in auth user.");
  }

  return {
    accessToken: signInResponse.data.session.access_token,
    authUserId: signInResponse.data.user.id,
  };
}

export async function waitForSignInReadiness(
  credentials: BrowserLoginCredentials,
): Promise<void> {
  const deadline = Date.now() + 10_000;
  let lastError: Error | null = null;

  while (Date.now() < deadline) {
    try {
      await signInWithPassword(credentials);
      return;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
    }
  }

  throw new Error(
    `Timed out waiting for credentials to become available for login: ${lastError?.message ?? "unknown error"}`,
  );
}

export async function provisionPasswordCredentialsForAppUser(params: {
  readonly appUserId: string;
  readonly label: string;
}): Promise<ProvisionedAppUserCredentials> {
  const adminClient = createServiceRoleClient();
  // Parallel Playwright workers can provision the same app user at once, so
  // timestamp-only emails are not unique enough under concurrent retries.
  const email = `${params.label}-${crypto.randomUUID()}@example.com`;
  const password = `Pass-${crypto.randomUUID()}Aa1!`;

  const existingUserResponse = await adminClient
    .from("app_users")
    .select("auth_user_id")
    .eq("id", params.appUserId)
    .maybeSingle();
  if (existingUserResponse.error) {
    throw new Error(existingUserResponse.error.message);
  }

  const previousAuthUserId =
    (existingUserResponse.data?.auth_user_id as string | null | undefined) ?? null;

  const createdUserResponse = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: params.label,
    },
  });
  if (createdUserResponse.error || !createdUserResponse.data.user) {
    throw new Error(createdUserResponse.error?.message ?? "Failed to create auth user.");
  }

  const authUserId = createdUserResponse.data.user.id;

  const updatedUserResponse = await adminClient
    .from("app_users")
    .update({ auth_user_id: authUserId })
    .eq("id", params.appUserId);
  if (updatedUserResponse.error) {
    throw new Error(updatedUserResponse.error.message);
  }

  return {
    email,
    password,
    authUserId,
    cleanup: async () => {
      await adminClient
        .from("app_users")
        .update({ auth_user_id: previousAuthUserId })
        .eq("id", params.appUserId);
      await adminClient.auth.admin.deleteUser(authUserId);
    },
  };
}

export async function signInThroughLoginPage(
  page: Page,
  credentials: BrowserLoginCredentials,
): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(credentials.email);
  await page.getByTestId("login-password-input").fill(credentials.password);
  await page.getByTestId("login-submit-button").click();
}

export async function provisionAndLoginAsAppUser(params: {
  readonly page: Page;
  readonly appUserId: string;
  readonly label: string;
}): Promise<ProvisionedAppUserCredentials> {
  const credentials = await provisionPasswordCredentialsForAppUser({
    appUserId: params.appUserId,
    label: params.label,
  });

  try {
    await waitForSignInReadiness(credentials);
    await signInThroughLoginPage(params.page, credentials);
    return credentials;
  } catch (error) {
    await credentials.cleanup();
    throw error;
  }
}

export async function createAuthenticatedSessionForAppUser(params: {
  readonly appUserId: string;
  readonly label: string;
}): Promise<AuthenticatedAppUserSession> {
  const provisionedUser = await provisionPasswordCredentialsForAppUser(params);
  try {
    const session = await signInWithPassword({
      email: provisionedUser.email,
      password: provisionedUser.password,
    });

    return {
      accessToken: session.accessToken,
      authUserId: provisionedUser.authUserId,
      cleanup: provisionedUser.cleanup,
    };
  } catch (error) {
    await provisionedUser.cleanup();
    throw error;
  }
}

export async function installApiAuthorizationHeader(
  page: Page,
  accessToken: string,
): Promise<void> {
  await page.addInitScript((token: string) => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const isApiRequest =
        requestUrl.startsWith("/api/v1/") || requestUrl.includes("/api/v1/");

      if (!isApiRequest) {
        return originalFetch(input, init);
      }

      const headers = new Headers(
        input instanceof Request ? input.headers : undefined,
      );
      const initHeaders = new Headers(init?.headers);
      initHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
      headers.set("authorization", `Bearer ${token}`);

      return originalFetch(input, {
        ...init,
        headers,
      });
    }) as typeof window.fetch;
  }, accessToken);
}

export async function bootstrapSupportBridge(
  request: APIRequestContext,
): Promise<void> {
  const supportSession = await signInAsDemoAppUser(SUPPORT_BRIDGE_ACTOR_ID);
  const response = await request.post("/api/v1/me/assume-user", {
    headers: buildAuthorizationHeaders(supportSession.accessToken),
    data: {
      userId: SUPPORT_BRIDGE_ACTOR_ID,
    },
  });
  expect(response.status()).toBe(200);
}

export async function assumeActorViaSupportBridge(
  request: APIRequestContext,
  userId: string,
): Promise<void> {
  const supportSession = await signInAsDemoAppUser(SUPPORT_BRIDGE_ACTOR_ID);
  const headers = buildAuthorizationHeaders(supportSession.accessToken);

  const bootstrapResponse = await request.post("/api/v1/me/assume-user", {
    headers,
    data: {
      userId: SUPPORT_BRIDGE_ACTOR_ID,
    },
  });
  expect(bootstrapResponse.status()).toBe(200);

  if (userId === SUPPORT_BRIDGE_ACTOR_ID) {
    return;
  }

  const response = await request.post("/api/v1/me/assume-user", {
    headers,
    data: {
      userId,
    },
  });
  expect(response.status()).toBe(200);
}

export async function enterSupportModeFromLogin(page: Page): Promise<void> {
  const credentials = getDemoAuthUserCredentials(SUPPORT_BRIDGE_ACTOR_ID);

  await page.goto("/login");
  if (!(await page.getByTestId("login-email-input").count())) {
    const authActionButton = page.getByTestId("actor-auth-action-button");
    if (await authActionButton.isVisible().catch(() => false)) {
      await authActionButton.click();
      await expect(page).toHaveURL(/\/login$/);
    } else {
      await page.goto("/login");
    }
  }

  await signInThroughLoginPage(page, credentials);
  await expect(page).toHaveURL(/\/users-admin$/);
}
