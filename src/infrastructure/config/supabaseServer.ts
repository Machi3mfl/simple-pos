import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;
let supabaseClientCacheKey: string | null = null;

type SupabaseFetchInput = Parameters<typeof fetch>[0];
type SupabaseFetchInit = RequestInit & {
  readonly next?: {
    readonly revalidate?: number;
  };
};

function fetchWithoutStore(
  input: SupabaseFetchInput,
  init?: RequestInit,
): Promise<Response> {
  const requestInit: SupabaseFetchInit = {
    ...(init ?? {}),
    cache: "no-store",
    next: {
      ...((init as SupabaseFetchInit | undefined)?.next ?? {}),
      revalidate: 0,
    },
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
      // Next patches global fetch in App Router. For repository reads we need fresh
      // Supabase results, especially during checkout and customer lookup flows.
      fetch: fetchWithoutStore,
    },
  });
  supabaseClientCacheKey = nextCacheKey;

  return supabaseClient;
}
