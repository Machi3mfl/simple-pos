import { expect, test } from "@playwright/test";
import fixture from "../fixtures/product-sourcing/carrefour-search-response.json";

import { CarrefourCatalogProvider } from "../../src/modules/product-sourcing/infrastructure/providers/carrefour/CarrefourCatalogProvider";
import { SearchQuery } from "../../src/modules/product-sourcing/domain/value-objects/SearchQuery";

function createJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

test.describe("carrefour catalog provider", () => {
  test("normalizes VTEX payload into sourcing candidates", async () => {
    let capturedUrl = "";
    const provider = new CarrefourCatalogProvider(async (input) => {
      capturedUrl = String(input);
      return createJsonResponse(fixture);
    });

    const result = await provider.search({
      query: SearchQuery.create("coca cola zero"),
      page: 2,
      pageSize: 2,
    });

    expect(capturedUrl).toContain(
      "/api/catalog_system/pub/products/search/coca%20cola%20zero?_from=2&_to=3",
    );
    expect(result.providerId).toBe("carrefour");
    expect(result.items).toHaveLength(2);

    const firstCandidate = result.items[0]?.toPrimitives();
    expect(firstCandidate).toMatchObject({
      providerId: "carrefour",
      sourceProductId: "393964",
      name: "Gaseosa cola Coca Cola Zero 2,25 lts",
      brand: "Coca Cola",
      ean: "7790895067570",
      suggestedCategoryId: "gaseosas-cola",
      referencePrice: 5250,
      referenceListPrice: 5499,
    });
    expect(firstCandidate?.imageUrl).toContain("carrefourar.vteximg.com.br");
    expect(firstCandidate?.productUrl).toBe(
      "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-zero-225-lts-393964/p",
    );

    const secondCandidate = result.items[1]?.toPrimitives();
    expect(secondCandidate?.imageUrl).toBe(
      "https://www.carrefour.com.ar/arquivos/ids/395999/7790895000000_E01.jpg",
    );
    expect(result.hasMore).toBe(true);
  });
});
