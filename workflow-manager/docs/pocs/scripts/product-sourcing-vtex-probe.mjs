#!/usr/bin/env node

const PROVIDERS = {
  carrefour: "https://www.carrefour.com.ar",
  jumbo: "https://www.jumbo.com.ar",
  disco: "https://www.disco.com.ar",
  vea: "https://www.vea.com.ar",
};

function normalizeCandidate(providerId, raw) {
  const firstItem = raw.items?.[0] ?? {};
  const firstImage = firstItem.images?.[0] ?? {};
  const commercialOffer = firstItem.sellers?.[0]?.commertialOffer ?? {};

  return {
    providerId,
    sourceProductId: raw.productId ?? null,
    name: raw.productName ?? null,
    brand: raw.brand ?? null,
    ean: firstItem.ean ?? null,
    categoryTrail: Array.isArray(raw.categories) ? raw.categories.filter(Boolean) : [],
    imageUrl: firstImage.imageUrl ?? null,
    referencePrice: commercialOffer.Price ?? null,
    referenceListPrice: commercialOffer.ListPrice ?? null,
    productUrl: raw.link ?? null,
  };
}

async function main() {
  const [providerId, query, limitArg] = process.argv.slice(2);

  if (!providerId || !query) {
    console.error(
      'Usage: node workflow-manager/docs/pocs/scripts/product-sourcing-vtex-probe.mjs <provider> "<query>" [limit]',
    );
    process.exit(1);
  }

  const providerBaseUrl = PROVIDERS[providerId];
  if (!providerBaseUrl) {
    console.error(`Unknown provider "${providerId}". Supported: ${Object.keys(PROVIDERS).join(", ")}`);
    process.exit(1);
  }

  const limit = Number.parseInt(limitArg ?? "5", 10);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 5;
  const endpoint = new URL(
    `${providerBaseUrl}/api/catalog_system/pub/products/search/${encodeURIComponent(query)}`,
  );

  endpoint.searchParams.set("_from", "0");
  endpoint.searchParams.set("_to", String(safeLimit - 1));

  const response = await fetch(endpoint);
  if (!response.ok) {
    console.error(`Provider request failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const payload = await response.json();
  const normalized = Array.isArray(payload)
    ? payload.slice(0, safeLimit).map((item) => normalizeCandidate(providerId, item))
    : [];

  console.log(
    JSON.stringify(
      {
        providerId,
        query,
        endpoint: endpoint.toString(),
        count: normalized.length,
        items: normalized,
      },
      null,
      2,
    ),
  );
}

await main();
