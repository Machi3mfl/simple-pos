import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import type { Page } from "@playwright/test";

interface AuthenticatedAppUserSession {
  readonly accessToken: string;
  readonly authUserId: string;
  readonly cleanup: () => Promise<void>;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  try {
    const envFile = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const matchedLine = envFile
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith(`${name}=`));

    if (matchedLine) {
      return matchedLine.slice(name.length + 1).trim();
    }
  } catch {
    // The tests already surface the missing variable clearly below.
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

export async function createAuthenticatedSessionForAppUser(params: {
  readonly appUserId: string;
  readonly label: string;
}): Promise<AuthenticatedAppUserSession> {
  const adminClient = createServiceRoleClient();
  const publicClient = createAnonClient();
  const email = `${params.label}-${Date.now()}@example.com`;
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

  const signInResponse = await publicClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInResponse.error || !signInResponse.data.session?.access_token) {
    throw new Error(signInResponse.error?.message ?? "Failed to sign in auth user.");
  }

  return {
    accessToken: signInResponse.data.session.access_token,
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
