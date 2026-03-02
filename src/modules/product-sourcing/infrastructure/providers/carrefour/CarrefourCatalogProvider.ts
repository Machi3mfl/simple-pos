import { readFile } from "node:fs/promises";
import path from "node:path";

import { VtexCatalogProvider, type ProductSourcingFetch } from "../vtex/VtexCatalogProvider";

const CARREFOUR_BASE_URL = "https://www.carrefour.com.ar";

let cachedFixturePayload: unknown[] | null = null;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function loadFixturePayload(fixturePath: string): Promise<unknown[]> {
  if (cachedFixturePayload) {
    return cachedFixturePayload;
  }

  const resolvedPath = path.isAbsolute(fixturePath)
    ? fixturePath
    : path.resolve(process.cwd(), fixturePath);
  const file = await readFile(resolvedPath, "utf8");
  const payload = JSON.parse(file) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("PRODUCT_SOURCING_CARREFOUR_FIXTURE must point to a JSON array.");
  }

  cachedFixturePayload = payload;
  return cachedFixturePayload;
}

function createFixtureFetch(fixturePath: string): ProductSourcingFetch {
  return async (input) => {
    const requestUrl = new URL(typeof input === "string" ? input : input.toString());
    const match = requestUrl.pathname.match(/\/products\/search\/(.+)$/);
    const encodedQuery = match?.[1] ?? "";
    const searchQuery = normalizeText(decodeURIComponent(encodedQuery));
    const from = Number(requestUrl.searchParams.get("_from") ?? "0");
    const to = Number(requestUrl.searchParams.get("_to") ?? "9");
    const payload = await loadFixturePayload(fixturePath);

    const filtered = payload.filter((entry) => {
      if (typeof entry !== "object" || entry === null || !("productName" in entry)) {
        return false;
      }

      const productName = String((entry as { productName?: unknown }).productName ?? "");
      return normalizeText(productName).includes(searchQuery);
    });

    const slice = filtered.slice(from, to + 1);
    return new Response(JSON.stringify(slice), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  };
}

export class CarrefourCatalogProvider extends VtexCatalogProvider {
  constructor(fetchFn?: ProductSourcingFetch) {
    const fixturePath = process.env.PRODUCT_SOURCING_CARREFOUR_FIXTURE;

    super({
      providerId: "carrefour",
      baseUrl: CARREFOUR_BASE_URL,
      fetchFn: fetchFn ?? (fixturePath ? createFixtureFetch(fixturePath) : undefined),
    });
  }
}
