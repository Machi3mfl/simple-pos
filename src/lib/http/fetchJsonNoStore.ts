export interface FetchJsonNoStoreResult<T> {
  readonly response: Response;
  readonly data: T | null;
}

async function tryParseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchJsonNoStore<T>(
  input: string,
  init: RequestInit = {},
): Promise<FetchJsonNoStoreResult<T>> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = await tryParseJson<T>(response);
  return { response, data };
}
