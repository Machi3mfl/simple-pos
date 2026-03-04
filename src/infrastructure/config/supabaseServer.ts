import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

let supabaseClient: SupabaseClient | null = null;
let supabaseClientCacheKey: string | null = null;

type SupabaseFetchInput = Parameters<typeof fetch>[0];

function fetchWithoutStore(
  input: SupabaseFetchInput,
  init?: RequestInit,
): Promise<Response> {
  const requestInit: RequestInit = {
    ...(init ?? {}),
    cache: "no-store",
  };

  return fetch(input, requestInit);
}

export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const nextCacheKey = `${url}:${serviceRoleKey}`;
  if (supabaseClient && supabaseClientCacheKey === nextCacheKey) {
    return supabaseClient;
  }

  supabaseClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      // Next patches global fetch in App Router. We force no-store here so server
      // repository reads always hit fresh Supabase state without mixing cache modes.
      fetch: fetchWithoutStore,
    },
  });
  supabaseClientCacheKey = nextCacheKey;

  return supabaseClient;
}

export function getSupabaseRequestAuthClient(
  request: NextRequest,
): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase request auth client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetchWithoutStore,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll() {
        // Route handlers can resolve the current user from request cookies without
        // mutating the response in this slice. Middleware-backed refresh can land later.
      },
    },
  });
}
